//! File system operations: read, create, copy, move, delete.

use std::fs;
use std::path::Path;
use std::path::PathBuf;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;

use serde::Serialize;
use tauri::{AppHandle, Emitter};
use tokio::sync::Semaphore;
use tokio::task::{spawn_blocking, JoinSet};

use crate::constants::DIRECTORY_BATCH_SIZE;
use crate::error::{FileManagerError, Result};
use crate::models::{CopyProgress, DriveInfo, FileEntry};

#[derive(Clone, Serialize)]
struct DirectoryBatchEvent {
    pub path: String,
    pub request_id: String,
    pub entries: Vec<FileEntry>,
}

#[derive(Clone, Serialize)]
struct DirectoryCompleteEvent {
    pub path: String,
    pub request_id: String,
}

/// Validates a filename (not a path) for rename operations.
///
/// Security: prevents path traversal via `..` and disallows path separators.
fn validate_new_name(new_name: &str) -> Result<()> {
    let trimmed = new_name.trim();
    if trimmed.is_empty() {
        return Err(FileManagerError::InvalidPath("Empty name".to_string()));
    }

    // Disallow separators explicitly (covers most cases, including Windows drive-like input)
    if trimmed.contains('/') || trimmed.contains('\\') {
        return Err(FileManagerError::InvalidPath(
            "Name must not contain path separators".to_string(),
        ));
    }

    // Disallow traversal and any non-normal components
    let pb = PathBuf::from(trimmed);
    for comp in pb.components() {
        match comp {
            std::path::Component::Normal(_) => {}
            _ => {
                return Err(FileManagerError::InvalidPath(
                    "Name must be a simple filename".to_string(),
                ));
            }
        }
    }

    // Windows reserved device names (case-insensitive). Also disallow trailing dots/spaces.
    // Ref: Windows legacy device names (CON, PRN, AUX, NUL, COM1..COM9, LPT1..LPT9)
    let upper = trimmed.trim_end_matches(['.', ' ']).to_ascii_uppercase();
    if upper != trimmed.to_ascii_uppercase() {
        return Err(FileManagerError::InvalidPath(
            "Name must not end with '.' or space".to_string(),
        ));
    }
    if matches!(
        upper.as_str(),
        "CON" | "PRN" | "AUX" | "NUL" |
        "COM1" | "COM2" | "COM3" | "COM4" | "COM5" | "COM6" | "COM7" | "COM8" | "COM9" |
        "LPT1" | "LPT2" | "LPT3" | "LPT4" | "LPT5" | "LPT6" | "LPT7" | "LPT8" | "LPT9"
    ) {
        return Err(FileManagerError::InvalidPath(
            "Name is a reserved device name".to_string(),
        ));
    }

    Ok(())
}

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

    let read_dir =
        fs::read_dir(dir_path).map_err(|e| FileManagerError::ReadDirError(e.to_string()))?;

    let mut entries: Vec<FileEntry> = read_dir
        .flatten()
        .filter_map(|entry| {
            let entry_path = entry.path();
            entry
                .metadata()
                .ok()
                .map(|metadata| FileEntry::from_path(&entry_path, &metadata))
        })
        .collect();

    // Sort: directories first, then alphabetically (case-insensitive)
    entries.sort_unstable_by(|a, b| match (a.is_dir, b.is_dir) {
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
    request_id: String,
    app: AppHandle,
) -> std::result::Result<(), String> {
    let path_clone = path.clone();
    let request_id_clone = request_id.clone();

    spawn_blocking(move || -> Result<()> {
        let dir_path = Path::new(&path_clone);

        if !dir_path.exists() {
            return Err(FileManagerError::DirectoryNotFound(path_clone));
        }

        let read_dir =
            fs::read_dir(dir_path).map_err(|e| FileManagerError::ReadDirError(e.to_string()))?;

        let mut batch = Vec::with_capacity(DIRECTORY_BATCH_SIZE);

        for entry in read_dir.flatten() {
            if let Some(file_entry) = entry
                .metadata()
                .ok()
                .map(|m| FileEntry::from_path(&entry.path(), &m))
            {
                batch.push(file_entry);

                if batch.len() >= DIRECTORY_BATCH_SIZE {
                    // Move the batch out to avoid cloning FileEntry and to avoid
                    // referencing a buffer that will be mutated after emit.
                    let mut entries = Vec::new();
                    std::mem::swap(&mut entries, &mut batch);

                    let _ = app.emit(
                        "directory-batch",
                        DirectoryBatchEvent {
                            path: path_clone.clone(),
                            request_id: request_id_clone.clone(),
                            entries,
                        },
                    );
                }
            }
        }

        // Emit remaining entries
        if !batch.is_empty() {
            let mut entries = Vec::new();
            std::mem::swap(&mut entries, &mut batch);
            let _ = app.emit(
                "directory-batch",
                DirectoryBatchEvent {
                    path: path_clone.clone(),
                    request_id: request_id_clone.clone(),
                    entries,
                },
            );
        }

        let _ = app.emit(
            "directory-complete",
            DirectoryCompleteEvent {
                path: path_clone,
                request_id: request_id_clone,
            },
        );
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
                if !Path::new(&path).exists() {
                    return None;
                }

                Some(DriveInfo {
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
    let path_clone = path.clone();
    spawn_blocking(move || -> Result<()> {
        if path_clone.is_empty() {
            return Err(FileManagerError::EmptyPath);
        }

        let dir_path = Path::new(&path_clone);
        if !dir_path.is_absolute() {
            return Err(FileManagerError::NotAbsolutePath(path_clone));
        }

        fs::create_dir_all(dir_path).map_err(|e| {
            FileManagerError::CreateDirError(format!("{} (path: {})", e, path_clone))
        })?;

        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(Into::into)
}

/// Creates a new empty file at the specified path.
#[tauri::command]
#[specta::specta]
pub async fn create_file(path: String) -> std::result::Result<(), String> {
    let path_clone = path.clone();
    spawn_blocking(move || -> Result<()> {
        let file_path = Path::new(&path_clone);

        if !file_path.is_absolute() {
            return Err(FileManagerError::NotAbsolutePath(path_clone));
        }

        if let Some(parent) = file_path.parent() {
            if !parent.exists() {
                fs::create_dir_all(parent)
                    .map_err(|e| FileManagerError::CreateDirError(e.to_string()))?;
            }
        }

        fs::File::create(file_path).map_err(|e| {
            FileManagerError::CreateFileError(format!("{} (path: {})", e, path_clone))
        })?;

        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(Into::into)
}

/// Deletes files or directories.
#[tauri::command]
#[specta::specta]
pub async fn delete_entries(
    paths: Vec<String>,
    _permanent: bool,
) -> std::result::Result<(), String> {
    spawn_blocking(move || -> Result<()> {
        for path in paths {
            let entry_path = Path::new(&path);

            if !entry_path.exists() {
                continue;
            }

            if entry_path.is_dir() {
                fs::remove_dir_all(entry_path)
                    .map_err(|e| FileManagerError::DeleteError(format!("{}: {}", path, e)))?;
            } else {
                fs::remove_file(entry_path)
                    .map_err(|e| FileManagerError::DeleteError(format!("{}: {}", path, e)))?;
            }
        }
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(Into::into)
}

/// Renames a file or directory. Returns the new path.
#[tauri::command]
#[specta::specta]
pub async fn rename_entry(
    old_path: String,
    new_name: String,
) -> std::result::Result<String, String> {
    validate_new_name(&new_name).map_err(|e| e.to_string())?;

    spawn_blocking(move || -> Result<String> {
        let old = Path::new(&old_path);
        let new_path = old
            .parent()
            .ok_or_else(|| FileManagerError::InvalidPath(old_path.clone()))?
            .join(&new_name);

        fs::rename(old, &new_path).map_err(|e| FileManagerError::RenameError(e.to_string()))?;

        Ok(new_path.to_string_lossy().to_string())
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(Into::into)
}

/// Copies files or directories to a destination.
#[tauri::command]
#[specta::specta]
pub async fn copy_entries(
    sources: Vec<String>,
    destination: String,
) -> std::result::Result<(), String> {
    spawn_blocking(move || -> Result<()> {
        let dest_path = Path::new(&destination);

        for source in sources {
            let src_path = Path::new(&source);
            let file_name = src_path
                .file_name()
                .ok_or(FileManagerError::InvalidSourcePath)?;
            let target = dest_path.join(file_name);

            if src_path.is_dir() {
                copy_dir_recursive(src_path, &target)?;
            } else {
                fs::copy(src_path, &target)
                    .map_err(|e| FileManagerError::CopyError(format!("{}: {}", source, e)))?;
            }
        }

        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(Into::into)
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
    // Prevent spawning unbounded number of tasks for huge selections.
    // This is mostly IO-bound; a small fixed parallelism keeps the app responsive.
    const COPY_PARALLELISM: usize = 8;

    let total = sources.len();
    let counter = Arc::new(AtomicUsize::new(0));
    let mut set = JoinSet::new();
    let semaphore = Arc::new(Semaphore::new(COPY_PARALLELISM));

    for source in sources {
        let dest = destination.clone();
        let app = app.clone();
        let counter = counter.clone();
        let semaphore = semaphore.clone();

        // Acquire a permit BEFORE spawning to avoid creating thousands of tasks.
        let permit = semaphore
            .acquire_owned()
            .await
            .map_err(|e| e.to_string())?;

        set.spawn(async move {
            let _permit = permit;
            let result = copy_single_entry(&source, &dest).await;
            let current = counter.fetch_add(1, Ordering::SeqCst) + 1;

            let file_name = Path::new(&source)
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_default();

            let _ = app.emit(
                "copy-progress",
                CopyProgress {
                    current: u32::try_from(current).unwrap_or(u32::MAX),
                    total: u32::try_from(total).unwrap_or(u32::MAX),
                    file: file_name,
                },
            );
            result
        });
    }

    while let Some(result) = set.join_next().await {
        result.map_err(|e| e.to_string())?.map_err(|e: String| e)?;
    }

    Ok(())
}

/// Copies a single file or directory entry.
async fn copy_single_entry(source: &str, destination: &str) -> std::result::Result<(), String> {
    let src_path = Path::new(source);
    let dest_path = Path::new(destination);
    let file_name = src_path
        .file_name()
        .ok_or(FileManagerError::InvalidSourcePath.to_string())?;
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
    spawn_blocking(move || -> Result<()> {
        let dest_path = Path::new(&destination);

        for source in sources {
            let src_path = Path::new(&source);
            let file_name = src_path
                .file_name()
                .ok_or(FileManagerError::InvalidSourcePath)?;
            let target = dest_path.join(file_name);

            // Try rename first (fast path for same filesystem)
            if fs::rename(src_path, &target).is_err() {
                // Fall back to copy + delete for cross-filesystem moves
                if src_path.is_dir() {
                    copy_dir_recursive(src_path, &target)?;
                    fs::remove_dir_all(src_path)
                        .map_err(|e| FileManagerError::DeleteError(e.to_string()))?;
                } else {
                    fs::copy(src_path, &target)
                        .map_err(|e| FileManagerError::CopyError(e.to_string()))?;
                    fs::remove_file(src_path)
                        .map_err(|e| FileManagerError::DeleteError(e.to_string()))?;
                }
            }
        }

        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(Into::into)
}

/// Reads the content of a text file.
#[tauri::command]
#[specta::specta]
pub async fn get_file_content(path: String) -> std::result::Result<String, String> {
    spawn_blocking(move || -> Result<String> {
        fs::read_to_string(&path)
            .map_err(|e| FileManagerError::ReadFileError(e.to_string()))
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(Into::into)
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
