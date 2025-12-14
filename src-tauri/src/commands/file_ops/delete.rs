//! Delete operations for files and directories.

use crate::commands::config::{ConfigExt, SecurityConfig, SecurityConfigState};
use crate::commands::error::{FsError, FsResult};
use crate::commands::file_ops::run_blocking;
use crate::commands::validation::{is_reparse_point, validate_paths_sandboxed};
use std::fs;
use std::path::PathBuf;
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
            continue;
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

fn delete_permanent(path: &PathBuf) -> FsResult<()> {
    let meta = fs::symlink_metadata(path)?;
    
    // Handle Windows reparse points specially
    if is_reparse_point(&meta) {
        fs::remove_file(path)?;
        return Ok(());
    }
    
    let ft = meta.file_type();
    
    if ft.is_symlink() {
        fs::remove_file(path)?;
    } else if ft.is_dir() {
        fs::remove_dir_all(path)?;
    } else {
        fs::remove_file(path)?;
    }
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn delete_file_permanently() {
        let dir = tempdir().unwrap();
        let file = dir.path().join("test.txt");
        fs::File::create(&file).unwrap();
        
        let config = SecurityConfig::default().with_mounted_disks();
        delete_entries_sync(
            vec![file.to_string_lossy().to_string()],
            true,
            &config,
        ).unwrap();
        
        assert!(!file.exists());
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
        delete_entries_sync(
            vec![link.to_string_lossy().to_string()],
            true,
            &config,
        ).unwrap();
        
        assert!(!link.exists());
        assert!(target_file.exists(), "Target should not be deleted");
    }
}