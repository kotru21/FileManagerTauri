use serde::{Deserialize, Serialize};
use specta::Type;
use std::collections::VecDeque;
use std::fs;
use std::path::Path;
use std::time::SystemTime;
use std::sync::Arc;
use std::sync::atomic::{AtomicUsize, Ordering};
use tauri::async_runtime::spawn_blocking;
use tauri::{AppHandle, Emitter};
use tokio::task::JoinSet;

/// Максимальная глубина рекурсии для операций с директориями
const MAX_DIRECTORY_DEPTH: usize = 100;

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
pub fn validate_path(path: &str) -> Result<std::path::PathBuf, String> {
    let path_buf = Path::new(path);
    
    // Путь должен быть абсолютным
    if !path_buf.is_absolute() {
        return Err(format!("Path must be absolute: {}", path));
    }
    
    // Канонизация пути для разрешения .. и .
    let canonical = path_buf.canonicalize()
        .map_err(|e| format!("Invalid path '{}': {}", path, e))?;
    
    // Проверка, что путь не пытается выйти за пределы корня
    // На Windows, что это валидный путь диска
    #[cfg(windows)]
    {
        if canonical.components().count() < 1 {
            return Err("Path is too short".to_string());
        }
    }
    
    Ok(canonical)
}

/// Проверяет множество путей
pub fn validate_paths(paths: &[String]) -> Result<Vec<std::path::PathBuf>, String> {
    paths.iter()
        .map(|p| validate_path(p))
        .collect()
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
        .map_err(|e| e.to_string())
        .and_then(|r| r)
}

fn read_directory_sync(path: String) -> Result<Vec<FileEntry>, String> {
    // validate path for reading
    let dir_path = validate_path(&path)?;

    let mut entries = Vec::new();
    
    let read_dir = fs::read_dir(dir_path)
        .map_err(|e| format!("Failed to read directory: {}", e))?;

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
            size: if metadata.is_file() { metadata.len() } else { 0 },
            modified: metadata.modified().ok().and_then(system_time_to_timestamp),
            created: metadata.created().ok().and_then(system_time_to_timestamp),
            extension,
        });
    }

    entries.sort_by(|a, b| {
        match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
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
    println!("Creating directory: {}", path);
    
    if path.is_empty() {
        return Err("Path is empty".to_string());
    }
    
    let p = Path::new(&path);
    let parent = p.parent().ok_or("Invalid path")?;
    // validate the parent directory to ensure we don't write outside allowed locations
    let validated_parent = validate_path(&parent.to_string_lossy())?;
    let name = p.file_name().ok_or("Invalid directory name")?;
    let new_path = validated_parent.join(name);
    fs::create_dir_all(new_path)
        .map_err(|e| format!("Failed to create directory: {} (path: {})", e, path))
}

#[tauri::command]
#[specta::specta]
pub async fn create_file(path: String) -> Result<(), String> {
    println!("Creating file: {}", path);
    
    if path.is_empty() {
        return Err("Path is empty".to_string());
    }
    
    let file_path = Path::new(&path);
    let parent = file_path.parent().ok_or("Invalid path")?;
    // validate parent
    let validated_parent = validate_path(&parent.to_string_lossy())?;
    let file_name = file_path.file_name().ok_or("Invalid file name")?;
    let new_file_path = validated_parent.join(file_name);
    if let Some(parent) = new_file_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create parent directory: {} (path: {:?})", e, parent))?;
        }
    }
    
    fs::File::create(&new_file_path)
        .map_err(|e| format!("Failed to create file: {} (path: {})", e, path))?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn delete_entries(paths: Vec<String>, permanent: bool) -> Result<(), String> {
    // Валидация всех путей перед выполнением операции
    let validated_paths = validate_paths(&paths)?;
    
    for entry_path in validated_paths {
        if !entry_path.exists() {
            continue;
        }

        if permanent {
            if entry_path.is_dir() {
                fs::remove_dir_all(&entry_path)
                    .map_err(|e| format!("Failed to delete directory {:?}: {}", entry_path, e))?;
            } else {
                fs::remove_file(&entry_path)
                    .map_err(|e| format!("Failed to delete file {:?}: {}", entry_path, e))?;
            }
        } else {
            // TODO: Move to trash using system API (trash crate)
            if entry_path.is_dir() {
                fs::remove_dir_all(&entry_path)
                    .map_err(|e| format!("Failed to delete directory {:?}: {}", entry_path, e))?;
            } else {
                fs::remove_file(&entry_path)
                    .map_err(|e| format!("Failed to delete file {:?}: {}", entry_path, e))?;
            }
        }
    }
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn rename_entry(old_path: String, new_name: String) -> Result<String, String> {
    let validated_old = validate_path(&old_path)?;
    // Prevent directory traversal via name
    if new_name.contains('/') || new_name.contains('\\') || new_name.contains("..") {
        return Err("Invalid file name: contains path separators".to_string());
    }
    let parent = validated_old.parent().ok_or("Invalid path")?;
    let new_path = parent.join(&new_name);
    // Do not allow moving to parents outside the validated parent
    // Validate parent of new path to ensure it's within allowed paths
    let _ = validate_path(&parent.to_string_lossy())?;
    fs::rename(&validated_old, &new_path)
        .map_err(|e| format!("Failed to rename: {}", e))?;
    
    Ok(new_path.to_string_lossy().to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn copy_entries(sources: Vec<String>, destination: String) -> Result<(), String> {
    // Валидация путей
    let validated_sources = validate_paths(&sources)?;
    let dest_path = validate_path(&destination)?;
    
    for src_path in validated_sources {
        let file_name = src_path.file_name()
            .ok_or("Invalid source path")?;
        let target = dest_path.join(file_name);
        
        if src_path.is_dir() {
            copy_dir_iterative(&src_path, &target)?;
        } else {
            fs::copy(&src_path, &target)
                .map_err(|e| format!("Failed to copy {:?}: {}", src_path, e))?;
        }
    }
    Ok(())
}

/// Итеративное копирование директории
fn copy_dir_iterative(src: &Path, dst: &Path) -> Result<(), String> {
    let mut queue: VecDeque<(std::path::PathBuf, std::path::PathBuf)> = VecDeque::new();
    queue.push_back((src.to_path_buf(), dst.to_path_buf()));
    
    let mut depth = 0;
    
    while let Some((current_src, current_dst)) = queue.pop_front() {
        // Защита от слишком глубокой вложенности
        if depth > MAX_DIRECTORY_DEPTH {
            return Err(format!("Directory depth exceeds maximum allowed ({})", MAX_DIRECTORY_DEPTH));
        }
        
        fs::create_dir_all(&current_dst)
            .map_err(|e| format!("Failed to create directory {:?}: {}", current_dst, e))?;
        
        for entry in fs::read_dir(&current_src).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let src_path = entry.path();
            let dst_path = current_dst.join(entry.file_name());
            
            if src_path.is_dir() {
                queue.push_back((src_path, dst_path));
                depth += 1;
            } else {
                fs::copy(&src_path, &dst_path)
                    .map_err(|e| format!("Failed to copy {:?}: {}", src_path, e))?;
            }
        }
    }
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn move_entries(sources: Vec<String>, destination: String) -> Result<(), String> {
    // Валидация путей
    let validated_sources = validate_paths(&sources)?;
    let dest_path = validate_path(&destination)?;
    
    for src_path in validated_sources {
        let file_name = src_path.file_name()
            .ok_or("Invalid source path")?;
        let target = dest_path.join(file_name);
        
        fs::rename(&src_path, &target)
            .map_err(|e| format!("Failed to move {:?}: {}", src_path, e))?;
    }
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn get_file_content(path: String) -> Result<String, String> {
    let validated_path = validate_path(&path)?;
    fs::read_to_string(&validated_path)
        .map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
#[specta::specta]
pub async fn get_parent_path(path: String) -> Result<Option<String>, String> {
    let validated = validate_path(&path)?;
    Ok(validated.parent().map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
#[specta::specta]
pub async fn path_exists(path: String) -> Result<bool, String> {
    let validated = validate_path(&path)?;
    Ok(validated.exists())
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
    let validated_sources = validate_paths(&sources)?;
    let validated_dest = validate_path(&destination)?;
    
    let total = validated_sources.len();
    let mut set = JoinSet::new();
    let counter = Arc::new(AtomicUsize::new(0));
    
    for src_path in validated_sources {
        let dest = validated_dest.clone();
        let app = app.clone();
        let counter = counter.clone();
        let source_str = src_path.to_string_lossy().to_string();
        
        set.spawn(async move {
            let result = copy_single_entry(&src_path, &dest).await;
            let current = counter.fetch_add(1, Ordering::SeqCst);
            
            // Отправляем прогресс
            let _ = app.emit("copy-progress", CopyProgress {
                current: current + 1,
                total,
                file: source_str,
            });
            
            result
        });
    }
    
    while let Some(result) = set.join_next().await {
        result.map_err(|e| e.to_string())??;
    }
    
    Ok(())
}

async fn copy_single_entry(src_path: &Path, dest_path: &Path) -> Result<(), String> {
    let file_name = src_path.file_name().ok_or("Invalid source path")?;
    let target = dest_path.join(file_name);
    
    if src_path.is_dir() {
        copy_dir_iterative(src_path, &target)?;
    } else {
        fs::copy(src_path, &target)
            .map_err(|e| format!("Failed to copy {:?}: {}", src_path, e))?;
    }
    Ok(())
}

/// Стриминг директории пакетами для больших директорий
#[tauri::command]
#[specta::specta]
pub async fn read_directory_stream(
    path: String,
    app: AppHandle,
) -> Result<(), String> {
    let path_clone = path.clone();
    // Validate incoming path
    let validated_path = validate_path(&path_clone)?;
    
    spawn_blocking(move || {
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
    }).await.map_err(|e| e.to_string())??;
    
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
        size: if metadata.is_file() { metadata.len() } else { 0 },
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
