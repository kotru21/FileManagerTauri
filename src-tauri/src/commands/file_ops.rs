//! File system operations: read, create, copy, move, delete.

use std::fs;
use std::path::Path;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;

use tauri::{async_runtime::spawn_blocking, AppHandle, Emitter};
use tokio::task::JoinSet;

use crate::constants::DIRECTORY_BATCH_SIZE;
use crate::error::{FileManagerError, Result};
use crate::models::{CopyProgress, DriveInfo, FileEntry};

/// Reads the contents of a directory.
#[tauri::command]
#[specta::specta]
pub async fn read_directory(path: String) -> std::result::Result<Vec<FileEntry>, String> {
    let path_clone = path.clone();
    spawn_blocking(move || read_directory_sync(&path_clone))
        .await
        .map_err(|e| e.to_string())?
        .map_err(Into::into)
}

/// Synchronous directory reading implementation.
fn read_directory_sync(path: &str) -> Result<Vec<FileEntry>> {
    let dir_path = Path::new(path);

    if !dir_path.exists() {
        return Err(FileManagerError::DirectoryNotFound(path.to_string()));
    }

    if !dir_path.is_dir() {
        return Err(FileManagerError::NotADirectory(path.to_string()));
    }

    let read_dir = fs::read_dir(dir_path)
        .map_err(|e| FileManagerError::ReadDirError(e.to_string()))?;

    let mut entries: Vec<FileEntry> = read_dir
        .flatten()
        .filter_map(|entry| {
            let entry_path = entry.path();
            entry.metadata().ok().map(|metadata| {
                FileEntry::from_path(&entry_path, &metadata)
            })
        })
        .collect();

    // Sort: directories first, then alphabetically
    entries.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(entries)
}

/// Streams directory contents in batches for large directories.
#[tauri::command]
#[specta::specta]
pub async fn read_directory_stream(
    path: String,
    app: AppHandle,
) -> std::result::Result<(), String> {
    let path_clone = path.clone();

    spawn_blocking(move || -> Result<()> {
        let dir_path = Path::new(&path_clone);

        if !dir_path.exists() {
            return Err(FileManagerError::DirectoryNotFound(path_clone.clone()));
        }

        let read_dir = fs::read_dir(dir_path)
            .map_err(|e| FileManagerError::ReadDirError(e.to_string()))?;

        let mut batch = Vec::with_capacity(DIRECTORY_BATCH_SIZE);

        for entry in read_dir.flatten() {
            if let Some(file_entry) = entry
                .metadata()
                .ok()
                .map(|m| FileEntry::from_path(&entry.path(), &m))
            {
                batch.push(file_entry);

                if batch.len() >= DIRECTORY_BATCH_SIZE {
                    let _ = app.emit("directory-batch", &batch);
                    batch.clear();
                }
            }
        }

        // Emit remaining entries
        if !batch.is_empty() {
            let _ = app.emit("directory-batch", &batch);
        }

        let _ = app.emit("directory-complete", &path_clone);
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(Into::into)
}

/// Returns a list of available drives on the system.
#[tauri::command]
#[specta::specta]
pub async fn get_drives() -> std::result::Result<Vec<DriveInfo>, String> {
    #[cfg(windows)]
    {
        let drives: Vec<DriveInfo> = (b'A'..=b'Z')
            .filter_map(|letter| {
                let path = format!("{}:\\", letter as char);
                Path::new(&path).exists().then(|| DriveInfo {
                    name: format!("{}:", letter as char),
                    path,
                    total_space: 0,
                    free_space: 0,
                    drive_type: "local".to_string(),
                })
            })
            .collect();
        Ok(drives)
    }

    #[cfg(not(windows))]
    {
        Ok(vec![DriveInfo {
            name: "/".to_string(),
            path: "/".to_string(),
            total_space: 0,
            free_space: 0,
            drive_type: "local".to_string(),
        }])
    }
}

/// Creates a new directory at the specified path.
#[tauri::command]
#[specta::specta]
pub async fn create_directory(path: String) -> std::result::Result<(), String> {
    if path.is_empty() {
        return Err(FileManagerError::EmptyPath.to_string());
    }

    let dir_path = Path::new(&path);

    if !dir_path.is_absolute() {
        return Err(FileManagerError::NotAbsolutePath(path).to_string());
    }

    fs::create_dir_all(dir_path)
        .map_err(|e| FileManagerError::CreateDirError(format!("{} (path: {})", e, path)))?;

    Ok(())
}

/// Creates a new empty file at the specified path.
#[tauri::command]
#[specta::specta]
pub async fn create_file(path: String) -> std::result::Result<(), String> {
    if path.is_empty() {
        return Err(FileManagerError::EmptyPath.to_string());
    }

    let file_path = Path::new(&path);

    if !file_path.is_absolute() {
        return Err(FileManagerError::NotAbsolutePath(path).to_string());
    }

    // Ensure parent directory exists
    if let Some(parent) = file_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| FileManagerError::CreateDirError(e.to_string()))?;
        }
    }

    fs::File::create(file_path)
        .map_err(|e| FileManagerError::CreateFileError(format!("{} (path: {})", e, path)))?;

    Ok(())
}

/// Deletes files or directories.
///
/// # Arguments
/// * `paths` - List of paths to delete
/// * `permanent` - If true, permanently delete; otherwise move to trash (TODO)
#[tauri::command]
#[specta::specta]
pub async fn delete_entries(
    paths: Vec<String>,
    permanent: bool,
) -> std::result::Result<(), String> {
    for path in paths {
        let entry_path = Path::new(&path);

        if !entry_path.exists() {
            continue;
        }

        if permanent {
            if entry_path.is_dir() {
                fs::remove_dir_all(entry_path)
                    .map_err(|e| FileManagerError::DeleteError(format!("{}: {}", path, e)))?;
            } else {
                fs::remove_file(entry_path)
                    .map_err(|e| FileManagerError::DeleteError(format!("{}: {}", path, e)))?;
            }
        } else {
            // TODO: Move to trash using system API (trash crate)
            if entry_path.is_dir() {
                fs::remove_dir_all(entry_path)
                    .map_err(|e| FileManagerError::DeleteError(format!("{}: {}", path, e)))?;
            } else {
                fs::remove_file(entry_path)
                    .map_err(|e| FileManagerError::DeleteError(format!("{}: {}", path, e)))?;
            }
        }
    }

    Ok(())
}

/// Renames a file or directory.
///
/// Returns the new path after renaming.
#[tauri::command]
#[specta::specta]
pub async fn rename_entry(
    old_path: String,
    new_name: String,
) -> std::result::Result<String, String> {
    let old = Path::new(&old_path);
    let new_path = old
        .parent()
        .ok_or_else(|| FileManagerError::InvalidPath(old_path.clone()))?
        .join(&new_name);

    fs::rename(old, &new_path)
        .map_err(|e| FileManagerError::RenameError(e.to_string()))?;

    Ok(new_path.to_string_lossy().to_string())
}

/// Copies files or directories to a destination.
#[tauri::command]
#[specta::specta]
pub async fn copy_entries(
    sources: Vec<String>,
    destination: String,
) -> std::result::Result<(), String> {
    let dest_path = Path::new(&destination);

    for source in sources {
        let src_path = Path::new(&source);
        let file_name = src_path
            .file_name()
            .ok_or_else(|| FileManagerError::InvalidSourcePath)?;
        let target = dest_path.join(file_name);

        if src_path.is_dir() {
            copy_dir_recursive(src_path, &target)?;
        } else {
            fs::copy(src_path, &target)
                .map_err(|e| FileManagerError::CopyError(format!("{}: {}", source, e)))?;
        }
    }

    Ok(())
}

/// Recursively copies a directory.
fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<()> {
    fs::create_dir_all(dst).map_err(|e| FileManagerError::CreateDirError(e.to_string()))?;

    for entry in fs::read_dir(src).map_err(|e| FileManagerError::ReadDirError(e.to_string()))? {
        let entry = entry.map_err(|e| FileManagerError::ReadDirError(e.to_string()))?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());

        if src_path.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            fs::copy(&src_path, &dst_path)
                .map_err(|e| FileManagerError::CopyError(e.to_string()))?;
        }
    }

    Ok(())
}

/// Copies files in parallel with progress events.
#[tauri::command]
#[specta::specta]
pub async fn copy_entries_parallel(
    sources: Vec<String>,
    destination: String,
    app: AppHandle,
) -> std::result::Result<(), String> {
    let total = sources.len();
    let counter = Arc::new(AtomicUsize::new(0));
    let mut set = JoinSet::new();

    for source in sources {
        let dest = destination.clone();
        let app = app.clone();
        let counter = counter.clone();

        set.spawn(async move {
            let result = copy_single_entry(&source, &dest).await;
            let current = counter.fetch_add(1, Ordering::SeqCst) + 1;

            let _ = app.emit(
                "copy-progress",
                CopyProgress {
                    current,
                    total,
                    file: source,
                },
            );

            result
        });
    }

    while let Some(result) = set.join_next().await {
        result
            .map_err(|e| FileManagerError::JoinError(e.to_string()))?
            .map_err(|e: String| e)?;
    }

    Ok(())
}

/// Copies a single file or directory entry.
async fn copy_single_entry(source: &str, destination: &str) -> std::result::Result<(), String> {
    let src_path = Path::new(source);
    let dest_path = Path::new(destination);
    let file_name = src_path
        .file_name()
        .ok_or_else(|| FileManagerError::InvalidSourcePath.to_string())?;
    let target = dest_path.join(file_name);

    if src_path.is_dir() {
        copy_dir_recursive(src_path, &target).map_err(|e| e.to_string())
    } else {
        fs::copy(src_path, &target)
            .map(|_| ())
            .map_err(|e| FileManagerError::CopyError(format!("{}: {}", source, e)).to_string())
    }
}

/// Moves files or directories to a destination.
#[tauri::command]
#[specta::specta]
pub async fn move_entries(
    sources: Vec<String>,
    destination: String,
) -> std::result::Result<(), String> {
    let dest_path = Path::new(&destination);

    for source in sources {
        let src_path = Path::new(&source);
        let file_name = src_path
            .file_name()
            .ok_or_else(|| FileManagerError::InvalidSourcePath)?;
        let target = dest_path.join(file_name);

        fs::rename(src_path, &target)
            .map_err(|e| FileManagerError::MoveError(format!("{}: {}", source, e)))?;
    }

    Ok(())
}

/// Reads the content of a text file.
#[tauri::command]
#[specta::specta]
pub async fn get_file_content(path: String) -> std::result::Result<String, String> {
    fs::read_to_string(&path)
        .map_err(|e| FileManagerError::ReadFileError(e.to_string()).to_string())
}

/// Returns the parent directory of a path.
#[tauri::command]
#[specta::specta]
pub async fn get_parent_path(path: String) -> std::result::Result<Option<String>, String> {
    let p = Path::new(&path);
    Ok(p.parent().map(|p| p.to_string_lossy().to_string()))
}

/// Checks if a path exists.
#[tauri::command]
#[specta::specta]
pub async fn path_exists(path: String) -> std::result::Result<bool, String> {
    Ok(Path::new(&path).exists())
}