//! Delete operations for files and directories.

use crate::commands::error::{FsError, FsResult};
use crate::commands::validation::{is_reparse_point, validate_paths};

use super::run_blocking;
use std::fs;
use std::path::Path;
use tracing::instrument;

#[tauri::command]
#[specta::specta]
#[instrument]
pub async fn delete_entries(paths: Vec<String>, permanent: bool) -> Result<(), String> {
    run_blocking(move || delete_entries_sync(paths, permanent)).await
}

pub fn delete_entries_sync(paths: Vec<String>, permanent: bool) -> FsResult<()> {
    let validated = validate_paths(&paths)?;
    for path in validated {
        if !path.exists() {
            if fs::symlink_metadata(&path).is_err() {
                continue;
            }
        }
        if permanent {
            delete_permanent(&path)?;
        } else {
            trash::delete(&path).map_err(|e| FsError::io(e.to_string()))?;
        }
        tracing::debug!(path = %path.display(), permanent, "Entry deleted");
    }
    Ok(())
}

fn delete_permanent(path: &Path) -> FsResult<()> {
    let meta = fs::symlink_metadata(path)?;
    if is_reparse_point(&meta) {
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
        fs::remove_file(path)?;
    } else if ft.is_dir() {
        remove_dir_safe(path)?;
    } else {
        fs::remove_file(path)?;
    }
    Ok(())
}

fn remove_dir_safe(path: &Path) -> FsResult<()> {
    for entry in fs::read_dir(path)? {
        let entry = entry?;
        let entry_path = entry.path();
        let meta = fs::symlink_metadata(&entry_path)?;
        if is_reparse_point(&meta) || meta.file_type().is_symlink() {
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