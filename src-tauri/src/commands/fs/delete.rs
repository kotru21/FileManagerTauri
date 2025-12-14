//! Delete operations for files and directories.

use crate::commands::config::SecurityConfig;
use crate::commands::error::{FsError, FsResult};
use crate::commands::validation::{is_reparse_point, validate_paths_sandboxed};
use crate::commands::{ConfigExt, SecurityConfigState};

use super::run_blocking;
use std::fs;
use std::path::Path;
use tauri::State;
use tracing::instrument;

/// Delete files or directories.
///
/// If `permanent` is false, entries are moved to the system trash/recycle bin.
#[tauri::command]
#[specta::specta]
#[instrument(skip(config_state))]
pub async fn delete_entries(
    paths: Vec<String>,
    permanent: bool,
    config_state: State<'_, SecurityConfigState>,
) -> Result<(), String> {
    let config = config_state.get_config()?;
    run_blocking(move || delete_entries_sync(paths, permanent, &config)).await
}

pub fn delete_entries_sync(
    paths: Vec<String>,
    permanent: bool,
    config: &SecurityConfig,
) -> FsResult<()> {
    let validated = validate_paths_sandboxed(&paths, config)?;

    for path in validated {
        if !path.exists() {
            // Use symlink_metadata to check if it's a broken symlink
            if fs::symlink_metadata(&path).is_err() {
                continue;
            }
        }

        if permanent {
            delete_permanent(&path)?;
        } else {
            trash::delete(&path).map_err(|e| FsError::io(e.to_string()))?;
        }

        tracing::debug!(
            path = %path.display(),
            permanent,
            "Entry deleted"
        );
    }

    Ok(())
}

fn delete_permanent(path: &Path) -> FsResult<()> {
    let meta = fs::symlink_metadata(path)?;

    // Handle Windows reparse points (junctions, symlinks) specially
    // They should be removed without following the target
    if is_reparse_point(&meta) {
        // On Windows, reparse points (including junctions) are treated as files for removal
        #[cfg(windows)]
        {
            if meta.is_dir() {
                fs::remove_dir(path)?;
            } else {
                fs::remove_file(path)?;
            }
        }
        #[cfg(not(windows))]
        {
            fs::remove_file(path)?;
        }
        return Ok(());
    }

    let ft = meta.file_type();
    if ft.is_symlink() {
        // Remove symlink itself, not target
        fs::remove_file(path)?;
    } else if ft.is_dir() {
        // Recursively remove directory
        // Note: remove_dir_all follows symlinks, but we've already
        // handled symlinks above, so this is safe for regular directories
        remove_dir_safe(path)?;
    } else {
        fs::remove_file(path)?;
    }

    Ok(())
}

/// Safely remove a directory without following symlinks inside it.
fn remove_dir_safe(path: &Path) -> FsResult<()> {
    for entry in fs::read_dir(path)? {
        let entry = entry?;
        let entry_path = entry.path();
        let meta = fs::symlink_metadata(&entry_path)?;

        if is_reparse_point(&meta) || meta.file_type().is_symlink() {
            // Remove link without following
            #[cfg(windows)]
            {
                if meta.is_dir() {
                    fs::remove_dir(&entry_path)?;
                } else {
                    fs::remove_file(&entry_path)?;
                }
            }
            #[cfg(not(windows))]
            {
                fs::remove_file(&entry_path)?;
            }
        } else if meta.is_dir() {
            remove_dir_safe(&entry_path)?;
        } else {
            fs::remove_file(&entry_path)?;
        }
    }

    fs::remove_dir(path)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::commands::config::SecurityConfig;
    use tempfile::tempdir;

    #[test]
    fn delete_file_permanently() {
        let dir = tempdir().unwrap();
        let file = dir.path().join("test.txt");
        fs::File::create(&file).unwrap();

        let config = SecurityConfig::default().with_mounted_disks();
        delete_entries_sync(vec![file.to_string_lossy().to_string()], true, &config).unwrap();

        assert!(!file.exists());
    }

    #[test]
    fn delete_directory_permanently() {
        let dir = tempdir().unwrap();
        let subdir = dir.path().join("subdir");
        fs::create_dir(&subdir).unwrap();
        fs::File::create(subdir.join("file.txt")).unwrap();

        let config = SecurityConfig::default().with_mounted_disks();
        delete_entries_sync(vec![subdir.to_string_lossy().to_string()], true, &config).unwrap();

        assert!(!subdir.exists());
    }

    #[test]
    fn delete_symlink_does_not_follow() {
        let dir = tempdir().unwrap();
        let target = tempdir().unwrap();
        let target_file = target.path().join("important.txt");
        fs::write(&target_file, "data").unwrap();

        let link = dir.path().join("link");

        #[cfg(unix)]
        std::os::unix::fs::symlink(&target_file, &link).unwrap();
        #[cfg(windows)]
        std::os::windows::fs::symlink_file(&target_file, &link).unwrap();

        let config = SecurityConfig::default().with_mounted_disks();
        delete_entries_sync(vec![link.to_string_lossy().to_string()], true, &config).unwrap();

        assert!(!link.exists());
        assert!(target_file.exists(), "Target should not be deleted");
    }
}