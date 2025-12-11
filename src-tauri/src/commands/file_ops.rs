use serde::{Deserialize, Serialize};
use specta::Type;
use std::collections::VecDeque;
use std::fs;
use std::path::Path;
use std::path::PathBuf;
use std::sync::Arc;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::time::SystemTime;
use tauri::async_runtime::spawn_blocking;
use tauri::{AppHandle, Emitter};
use tokio::task::JoinSet;

use crate::commands::error::FsError;

/// Максимальная глубина рекурсии для операций с директориями
const MAX_DIRECTORY_DEPTH: usize = 100;

type FsResult<T> = Result<T, FsError>;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub is_hidden: bool,
    pub size: u64,
    pub modified: Option<i64>,
    pub created: Option<i64>,
    pub extension: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct DriveInfo {
    pub name: String,
    pub path: String,
    pub total_space: u64,
    pub free_space: u64,
    pub drive_type: String,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct OperationProgress {
    pub current: u64,
    pub total: u64,
    pub current_file: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct CopyProgress {
    pub current: usize,
    pub total: usize,
    pub file: String,
}

fn system_time_to_timestamp(time: SystemTime) -> Option<i64> {
    time.duration_since(SystemTime::UNIX_EPOCH)
        .ok()
        .map(|d| d.as_secs() as i64)
}

/// Валидация пути для предотвращения атак path traversal
/// Проверяет, что путь абсолютный и не содержит опасных компонентов
pub fn validate_path(path: &str) -> FsResult<std::path::PathBuf> {
    let path_buf = Path::new(path);

    // Путь должен быть абсолютным
    if !path_buf.is_absolute() {
        return Err(FsError::PathNotAbsolute);
    }

    // Канонизация пути для разрешения .. и .
    let canonical = path_buf
        .canonicalize()
        .map_err(|_| FsError::InvalidPath)?;

    // Проверка, что путь не пытается выйти за пределы корня
    // На Windows, что это валидный путь диска
    #[cfg(windows)]
    {
        if canonical.components().count() < 1 {
            return Err(FsError::InvalidPath);
        }
    }

    Ok(canonical)
}

/// Validate a single path segment (file/directory name) to prevent traversal.
///
/// Rules:
/// - must not be empty
/// - must not be "." or ".."
/// - must not contain path separators
pub(crate) fn validate_child_name(name: &std::ffi::OsStr) -> FsResult<()> {
    let s = name.to_string_lossy();

    if s.is_empty() {
        return Err(FsError::InvalidName);
    }
    if s == "." || s == ".." {
        return Err(FsError::InvalidName);
    }
    if s.contains('/') || s.contains('\\') {
        return Err(FsError::InvalidName);
    }

    // Windows device names and trailing dots/spaces can cause surprising behavior.
    #[cfg(windows)]
    {
        let upper = s.trim_end_matches([' ', '.']).to_ascii_uppercase();
        const RESERVED: [&str; 22] = [
            "CON", "PRN", "AUX", "NUL",
            "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
            "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
        ];
        if RESERVED.contains(&upper.as_str()) {
            return Err(FsError::InvalidName);
        }
        if s.ends_with(' ') || s.ends_with('.') {
            return Err(FsError::InvalidName);
        }
    }

    Ok(())
}

fn is_windows_reparse_point(meta: &fs::Metadata) -> bool {
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        const FILE_ATTRIBUTE_REPARSE_POINT: u32 = 0x400;
        return (meta.file_attributes() & FILE_ATTRIBUTE_REPARSE_POINT) != 0;
    }
    #[cfg(not(windows))]
    {
        let _ = meta;
        false
    }
}

/// Проверяет множество путей
pub fn validate_paths(paths: &[String]) -> FsResult<Vec<std::path::PathBuf>> {
    paths.iter().map(|p| validate_path(p)).collect()
}

fn is_hidden(path: &Path) -> bool {
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        if let Ok(metadata) = fs::metadata(path) {
            const FILE_ATTRIBUTE_HIDDEN: u32 = 0x2;
            return metadata.file_attributes() & FILE_ATTRIBUTE_HIDDEN != 0;
        }
    }
    path.file_name()
        .and_then(|n| n.to_str())
        .map(|n| n.starts_with('.'))
        .unwrap_or(false)
}

#[tauri::command]
#[specta::specta]
pub async fn read_directory(path: String) -> Result<Vec<FileEntry>, String> {
    let path_clone = path.clone();
    spawn_blocking(move || read_directory_sync(path_clone))
        .await
    .map_err(|_| FsError::Internal.to_public_string())?
    .map_err(|e| e)
}

fn read_directory_sync(path: String) -> Result<Vec<FileEntry>, String> {
    // validate path for reading
    let dir_path = validate_path(&path).map_err(|e| e.to_public_string())?;

    let mut entries = Vec::new();

    let read_dir =
        fs::read_dir(dir_path).map_err(|e| format!("Failed to read directory: {}", e))?;

    for entry in read_dir.flatten() {
        let entry_path = entry.path();
        let metadata = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };

        let name = entry_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();

        let extension = entry_path
            .extension()
            .and_then(|e| e.to_str())
            .map(|s| s.to_lowercase());

        entries.push(FileEntry {
            name,
            path: entry_path.to_string_lossy().to_string(),
            is_dir: metadata.is_dir(),
            is_hidden: is_hidden(&entry_path),
            size: if metadata.is_file() {
                metadata.len()
            } else {
                0
            },
            modified: metadata.modified().ok().and_then(system_time_to_timestamp),
            created: metadata.created().ok().and_then(system_time_to_timestamp),
            extension,
        });
    }

    entries.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(entries)
}

#[tauri::command]
#[specta::specta]
pub async fn get_drives() -> Result<Vec<DriveInfo>, String> {
    #[cfg(windows)]
    {
        let mut drives = Vec::new();
        for letter in b'A'..=b'Z' {
            let path = format!("{}:\\", letter as char);
            if Path::new(&path).exists() {
                drives.push(DriveInfo {
                    name: format!("{}:", letter as char),
                    path: path.clone(),
                    total_space: 0,
                    free_space: 0,
                    drive_type: "local".to_string(),
                });
            }
        }
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

#[tauri::command]
#[specta::specta]
pub async fn create_directory(path: String) -> Result<(), String> {
    spawn_blocking(move || create_directory_sync(path))
        .await
        .map_err(|_| FsError::Internal.to_public_string())??;

    Ok(())
}

fn create_directory_sync(path: String) -> Result<(), String> {
    if path.is_empty() {
        return Err("Path is empty".to_string());
    }

    let p = Path::new(&path);
    let parent = p.parent().ok_or("Invalid path")?;
    // validate the parent directory to ensure we don't write outside allowed locations
    let validated_parent =
        validate_path(&parent.to_string_lossy()).map_err(|e| e.to_public_string())?;
    let name = p.file_name().ok_or("Invalid directory name")?;
    validate_child_name(name).map_err(|e| e.to_public_string())?;
    let new_path = validated_parent.join(name);
    fs::create_dir_all(new_path)
        .map_err(|e| format!("Failed to create directory: {} (path: {})", e, path))
}

#[tauri::command]
#[specta::specta]
pub async fn create_file(path: String) -> Result<(), String> {
    spawn_blocking(move || create_file_sync(path))
        .await
        .map_err(|_| FsError::Internal.to_public_string())??;

    Ok(())
}

fn create_file_sync(path: String) -> Result<(), String> {
    if path.is_empty() {
        return Err("Path is empty".to_string());
    }

    let file_path = Path::new(&path);
    let parent = file_path.parent().ok_or("Invalid path")?;
    // validate parent
    let validated_parent =
        validate_path(&parent.to_string_lossy()).map_err(|e| e.to_public_string())?;
    let file_name = file_path.file_name().ok_or("Invalid file name")?;
    validate_child_name(file_name).map_err(|e| e.to_public_string())?;
    let new_file_path = validated_parent.join(file_name);
    if let Some(parent) = new_file_path.parent()
        && !parent.exists()
    {
        fs::create_dir_all(parent).map_err(|e| {
            format!(
                "Failed to create parent directory: {} (path: {:?})",
                e, parent
            )
        })?;
    }

    fs::File::create(&new_file_path)
        .map_err(|e| format!("Failed to create file: {} (path: {})", e, path))?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn delete_entries(paths: Vec<String>, permanent: bool) -> Result<(), String> {
    // NOTE: This can be heavy IO (recursive deletes), keep it off the async runtime.
    spawn_blocking(move || delete_entries_sync(paths, permanent))
        .await
        .map_err(|e| e.to_string())??;

    Ok(())
}

fn delete_entries_sync(paths: Vec<String>, permanent: bool) -> Result<(), String> {
    // Валидация всех путей перед выполнением операции
    let validated_paths = validate_paths(&paths).map_err(|e| e.to_public_string())?;

    for entry_path in validated_paths {
        if !entry_path.exists() {
            continue;
        }

        if permanent {
            // Use symlink_metadata to avoid following symlinks / reparse points.
            let meta = fs::symlink_metadata(&entry_path)
                .map_err(|e| format!("Failed to stat {:?}: {}", entry_path, e))?;

            // On Windows, treat reparse points as non-directories to avoid deleting the target.
            if is_windows_reparse_point(&meta) {
                fs::remove_file(&entry_path)
                    .map_err(|e| format!("Failed to delete reparse point {:?}: {}", entry_path, e))?;
                continue;
            }

            let ft = meta.file_type();
            if ft.is_symlink() {
                fs::remove_file(&entry_path)
                    .map_err(|e| format!("Failed to delete symlink {:?}: {}", entry_path, e))?;
            } else if ft.is_dir() {
                fs::remove_dir_all(&entry_path)
                    .map_err(|e| format!("Failed to delete directory {:?}: {}", entry_path, e))?;
            } else {
                fs::remove_file(&entry_path)
                    .map_err(|e| format!("Failed to delete file {:?}: {}", entry_path, e))?;
            }
        } else {
            // Move to OS trash / recycle bin.
            trash::delete(&entry_path)
                .map_err(|e| format!("Failed to move to trash {:?}: {}", entry_path, e))?;
        }
    }

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn rename_entry(old_path: String, new_name: String) -> Result<String, String> {
    let validated_old = validate_path(&old_path).map_err(|e| e.to_public_string())?;
    // Prevent directory traversal via name
    validate_child_name(std::ffi::OsStr::new(&new_name)).map_err(|e| e.to_public_string())?;
    let parent = validated_old.parent().ok_or("Invalid path")?;
    let new_path = parent.join(&new_name);
    // Do not allow moving to parents outside the validated parent
    // Validate parent of new path to ensure it's within allowed paths
    let _ = validate_path(&parent.to_string_lossy()).map_err(|e| e.to_public_string())?;
    fs::rename(&validated_old, &new_path).map_err(|e| format!("Failed to rename: {}", e))?;

    Ok(new_path.to_string_lossy().to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn copy_entries(sources: Vec<String>, destination: String) -> Result<(), String> {
    spawn_blocking(move || copy_entries_sync(sources, destination))
        .await
        .map_err(|e| e.to_string())??;
    Ok(())
}

fn copy_entries_sync(sources: Vec<String>, destination: String) -> Result<(), String> {
    // Валидация путей
    let validated_sources = validate_paths(&sources).map_err(|e| e.to_public_string())?;
    let dest_path = validate_path(&destination).map_err(|e| e.to_public_string())?;

    for src_path in validated_sources {
        let file_name = src_path.file_name().ok_or("Invalid source path")?;
        let target = dest_path.join(file_name);

        if src_path.is_dir() {
            copy_dir_iterative(&src_path, &target).map_err(|e| e.to_public_string())?;
        } else {
            fs::copy(&src_path, &target)
                .map_err(|e| format!("Failed to copy {:?}: {}", src_path, e))?;
        }
    }
    Ok(())
}

/// Итеративное копирование директории
fn copy_dir_iterative(src: &Path, dst: &Path) -> FsResult<()> {
    let mut queue: VecDeque<(PathBuf, PathBuf, usize)> = VecDeque::new();
    queue.push_back((src.to_path_buf(), dst.to_path_buf(), 0));

    while let Some((current_src, current_dst, depth)) = queue.pop_front() {
        // Защита от слишком глубокой вложенности
        if depth > MAX_DIRECTORY_DEPTH {
            return Err(FsError::DirectoryTooDeep);
        }

        fs::create_dir_all(&current_dst).map_err(|_| FsError::Io)?;

        for entry in fs::read_dir(&current_src).map_err(|_| FsError::Io)? {
            let entry = entry.map_err(|_| FsError::Io)?;
            let src_path = entry.path();
            let dst_path = current_dst.join(entry.file_name());

            // Avoid following symlinks / reparse points during recursive copy.
            let meta = fs::symlink_metadata(&src_path).map_err(|_| FsError::Io)?;
            if is_windows_reparse_point(&meta) {
                // Copy the reparse point itself as a file is non-trivial cross-platform.
                // Safer default: skip.
                continue;
            }
            let ft = meta.file_type();
            if ft.is_symlink() {
                // Safer default: skip symlinks to avoid copying outside the tree.
                continue;
            }

            if ft.is_dir() {
                queue.push_back((src_path, dst_path, depth + 1));
            } else {
                fs::copy(&src_path, &dst_path).map_err(|_| FsError::Io)?;
            }
        }
    }
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn move_entries(sources: Vec<String>, destination: String) -> Result<(), String> {
    spawn_blocking(move || move_entries_sync(sources, destination))
        .await
        .map_err(|e| e.to_string())??;
    Ok(())
}

fn move_entries_sync(sources: Vec<String>, destination: String) -> Result<(), String> {
    // Валидация путей
    let validated_sources = validate_paths(&sources).map_err(|e| e.to_public_string())?;
    let dest_path = validate_path(&destination).map_err(|e| e.to_public_string())?;

    for src_path in validated_sources {
        let file_name = src_path.file_name().ok_or("Invalid source path")?;
        let target = dest_path.join(file_name);

        fs::rename(&src_path, &target)
            .map_err(|e| format!("Failed to move {:?}: {}", src_path, e))?;
    }
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn get_file_content(path: String) -> Result<String, String> {
    let content = spawn_blocking(move || get_file_content_sync(path))
        .await
        .map_err(|e| e.to_string())??;
    Ok(content)
}

fn get_file_content_sync(path: String) -> Result<String, String> {
    let validated_path = validate_path(&path).map_err(|e| e.to_public_string())?;
    fs::read_to_string(&validated_path).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
#[specta::specta]
pub async fn get_parent_path(path: String) -> Result<Option<String>, String> {
    spawn_blocking(move || {
        let validated = validate_path(&path).map_err(|e| e.to_public_string())?;
        Ok::<_, String>(validated.parent().map(|p| p.to_string_lossy().to_string()))
    })
    .await
    .map_err(|_| FsError::Internal.to_public_string())?
}

#[tauri::command]
#[specta::specta]
pub async fn path_exists(path: String) -> Result<bool, String> {
    spawn_blocking(move || {
        let validated = validate_path(&path).map_err(|e| e.to_public_string())?;
        Ok::<_, String>(validated.exists())
    })
    .await
    .map_err(|_| FsError::Internal.to_public_string())?
}

/// Параллельное копирование файлов с прогрессом
#[tauri::command]
#[specta::specta]
pub async fn copy_entries_parallel(
    sources: Vec<String>,
    destination: String,
    app: AppHandle,
) -> Result<(), String> {
    // Валидация путей
    let validated_sources = validate_paths(&sources).map_err(|e| e.to_public_string())?;
    let validated_dest = validate_path(&destination).map_err(|e| e.to_public_string())?;

    let total = validated_sources.len();
    if total == 0 {
        return Ok(());
    }

    let parallelism = std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(4)
        .min(16)
        .max(1);

    let sem = Arc::new(tokio::sync::Semaphore::new(parallelism));
    let mut set = JoinSet::new();
    let counter = Arc::new(AtomicUsize::new(0));

    // Spawn at most `parallelism` tasks at a time.
    for src_path in validated_sources {
        let permit = sem
            .clone()
            .acquire_owned()
            .await
            .map_err(|_| FsError::Internal.to_public_string())?;

        let dest = validated_dest.clone();
        let app = app.clone();
        let counter = counter.clone();
        let source_str = src_path.to_string_lossy().to_string();

        set.spawn(async move {
            let _permit = permit;

            let src_owned = src_path;
            let dest_owned = dest;

            // Do actual IO on blocking pool.
            let result = spawn_blocking(move || copy_single_entry_sync(&src_owned, &dest_owned))
                .await
                .map_err(|_| FsError::Internal)?;

            let current = counter.fetch_add(1, Ordering::SeqCst);
            let _ = app.emit(
                "copy-progress",
                CopyProgress {
                    current: current + 1,
                    total,
                    file: source_str,
                },
            );

            result
        });
    }

    while let Some(result) = set.join_next().await {
        result
            .map_err(|_| FsError::Internal.to_public_string())?
            .map_err(|e| e.to_public_string())?;
    }

    Ok(())
}

fn copy_single_entry_sync(src_path: &Path, dest_path: &Path) -> FsResult<()> {
    let file_name = src_path.file_name().ok_or(FsError::InvalidPath)?;
    let target = dest_path.join(file_name);

    if src_path.is_dir() {
        copy_dir_iterative(src_path, &target)?;
    } else {
        fs::copy(src_path, &target).map_err(|_| FsError::Io)?;
    }
    Ok(())
}

/// Стриминг директории пакетами для больших директорий
#[tauri::command]
#[specta::specta]
pub async fn read_directory_stream(path: String, app: AppHandle) -> Result<(), String> {
    let path_clone = path.clone();

    spawn_blocking(move || {
        // Validate incoming path inside blocking context (canonicalize can hit disk).
        let validated_path = validate_path(&path_clone).map_err(|e| e.to_public_string())?;
        let dir_path = validated_path.as_path();
        let read_dir = fs::read_dir(dir_path).map_err(|e| e.to_string())?;

        let mut batch = Vec::with_capacity(100);

        for entry in read_dir.flatten() {
            if let Some(file_entry) = entry_to_file_entry(&entry) {
                batch.push(file_entry);

                // Отправляем пакетами по 100
                if batch.len() >= 100 {
                    let _ = app.emit("directory-batch", &batch);
                    batch.clear();
                }
            }
        }

        // Остаток
        if !batch.is_empty() {
            let _ = app.emit("directory-batch", &batch);
        }

        let _ = app.emit("directory-complete", &path_clone);
        Ok::<_, String>(())
    })
    .await
    .map_err(|_| FsError::Internal.to_public_string())??;

    Ok(())
}

fn entry_to_file_entry(entry: &fs::DirEntry) -> Option<FileEntry> {
    let entry_path = entry.path();
    let metadata = entry.metadata().ok()?;

    let name = entry_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();

    let extension = entry_path
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_lowercase());

    Some(FileEntry {
        name,
        path: entry_path.to_string_lossy().to_string(),
        is_dir: metadata.is_dir(),
        is_hidden: is_hidden(&entry_path),
        size: if metadata.is_file() {
            metadata.len()
        } else {
            0
        },
        modified: metadata.modified().ok().and_then(system_time_to_timestamp),
        created: metadata.created().ok().and_then(system_time_to_timestamp),
        extension,
    })
}

// Unit tests for file_ops security helpers
#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn validate_child_name_rejects_dot_and_dotdot() {
        assert!(validate_child_name(std::ffi::OsStr::new(".")).is_err());
        assert!(validate_child_name(std::ffi::OsStr::new("..")).is_err());
    }

    #[test]
    fn validate_path_accepts_absolute_existing_path() {
        let dir = tempdir().unwrap();
        let p = dir.path().to_string_lossy().to_string();
        let res = validate_path(&p);
        assert!(res.is_ok());
        let canonical = res.unwrap();
        assert!(canonical.exists());
    }

    #[test]
    fn validate_path_rejects_relative_path() {
        let res = validate_path("./some/relative/path");
        assert!(res.is_err());
    }
}
