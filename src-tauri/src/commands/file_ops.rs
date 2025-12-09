use serde::{Deserialize, Serialize};
use specta::Type;
use std::fs;
use std::path::Path;
use std::time::SystemTime;
use tauri::async_runtime::spawn_blocking;

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

fn system_time_to_timestamp(time: SystemTime) -> Option<i64> {
    time.duration_since(SystemTime::UNIX_EPOCH)
        .ok()
        .map(|d| d.as_secs() as i64)
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
    let dir_path = Path::new(&path);
    
    if !dir_path.exists() {
        return Err(format!("Directory does not exist: {}", path));
    }
    
    if !dir_path.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }

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
    
    let dir_path = Path::new(&path);
    
    // Проверяем, что путь абсолютный
    if !dir_path.is_absolute() {
        return Err(format!("Path must be absolute: {}", path));
    }
    
    fs::create_dir_all(&path)
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
    
    // Проверяем, что путь абсолютный
    if !file_path.is_absolute() {
        return Err(format!("Path must be absolute: {}", path));
    }
    
    if let Some(parent) = file_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create parent directory: {} (path: {:?})", e, parent))?;
        }
    }
    
    fs::File::create(&path)
        .map_err(|e| format!("Failed to create file: {} (path: {})", e, path))?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn delete_entries(paths: Vec<String>, permanent: bool) -> Result<(), String> {
    for path in paths {
        let entry_path = Path::new(&path);
        if !entry_path.exists() {
            continue;
        }

        if permanent {
            if entry_path.is_dir() {
                fs::remove_dir_all(&path)
                    .map_err(|e| format!("Failed to delete directory {}: {}", path, e))?;
            } else {
                fs::remove_file(&path)
                    .map_err(|e| format!("Failed to delete file {}: {}", path, e))?;
            }
        } else {
            // TODO: Move to trash using system API
            if entry_path.is_dir() {
                fs::remove_dir_all(&path)
                    .map_err(|e| format!("Failed to delete directory {}: {}", path, e))?;
            } else {
                fs::remove_file(&path)
                    .map_err(|e| format!("Failed to delete file {}: {}", path, e))?;
            }
        }
    }
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn rename_entry(old_path: String, new_name: String) -> Result<String, String> {
    let old = Path::new(&old_path);
    let new_path = old.parent()
        .ok_or("Invalid path")?
        .join(&new_name);
    
    fs::rename(&old_path, &new_path)
        .map_err(|e| format!("Failed to rename: {}", e))?;
    
    Ok(new_path.to_string_lossy().to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn copy_entries(sources: Vec<String>, destination: String) -> Result<(), String> {
    let dest_path = Path::new(&destination);
    
    for source in sources {
        let src_path = Path::new(&source);
        let file_name = src_path.file_name()
            .ok_or("Invalid source path")?;
        let target = dest_path.join(file_name);
        
        if src_path.is_dir() {
            copy_dir_recursive(src_path, &target)?;
        } else {
            fs::copy(&source, &target)
                .map_err(|e| format!("Failed to copy {}: {}", source, e))?;
        }
    }
    Ok(())
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), String> {
    fs::create_dir_all(dst)
        .map_err(|e| format!("Failed to create directory: {}", e))?;
    
    for entry in fs::read_dir(src).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());
        
        if src_path.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            fs::copy(&src_path, &dst_path)
                .map_err(|e| format!("Failed to copy: {}", e))?;
        }
    }
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn move_entries(sources: Vec<String>, destination: String) -> Result<(), String> {
    let dest_path = Path::new(&destination);
    
    for source in sources {
        let src_path = Path::new(&source);
        let file_name = src_path.file_name()
            .ok_or("Invalid source path")?;
        let target = dest_path.join(file_name);
        
        fs::rename(&source, &target)
            .map_err(|e| format!("Failed to move {}: {}", source, e))?;
    }
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn get_file_content(path: String) -> Result<String, String> {
    fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
#[specta::specta]
pub async fn get_parent_path(path: String) -> Result<Option<String>, String> {
    let p = Path::new(&path);
    Ok(p.parent().map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
#[specta::specta]
pub async fn path_exists(path: String) -> Result<bool, String> {
    Ok(Path::new(&path).exists())
}
