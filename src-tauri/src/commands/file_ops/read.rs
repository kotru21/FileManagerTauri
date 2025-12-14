//! Read operations for files and directories.

use crate::commands::config::{limits, ConfigExt, SecurityConfig, SecurityConfigState};
use crate::commands::error::{FsError, FsResult};
use crate::commands::file_ops::run_blocking;
use crate::commands::validation::{is_hidden, validate_sandboxed};
use serde::{Deserialize, Serialize};
use specta::Type;
use std::fs;
use std::path::Path;
use std::time::SystemTime;
use tauri::{AppHandle, Emitter, State};
use tracing::instrument;

/// Represents a file or directory entry.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct FileEntry {
    pub name: Box<str>,
    pub name_lower: Box<str>,
    pub path: Box<str>,
    pub is_dir: bool,
    pub is_hidden: bool,
    pub size: u64,
    pub modified: Option<i64>,
    pub created: Option<i64>,
    pub extension: Option<String>,
}

impl FileEntry {
    /// Create a FileEntry from a directory entry.
    pub fn from_dir_entry(entry: &fs::DirEntry) -> Option<Self> {
        let path = entry.path();
        let metadata = entry.metadata().ok()?;
        
        let name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();
        
        Some(Self {
            name: name.clone().into_boxed_str(),
            name_lower: name.to_lowercase().into_boxed_str(),
            path: path.to_string_lossy().into_owned().into_boxed_str(),
            is_dir: metadata.is_dir(),
            is_hidden: is_hidden(&path),
            size: if metadata.is_file() { metadata.len() } else { 0 },
            modified: to_timestamp(metadata.modified().ok()),
            created: to_timestamp(metadata.created().ok()),
            extension: path.extension().and_then(|e| e.to_str()).map(|s| s.to_lowercase()),
        })
    }
}

/// Information about a drive/volume.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct DriveInfo {
    pub name: String,
    pub path: String,
    pub total_space: u64,
    pub free_space: u64,
    pub drive_type: String,
    pub label: Option<String>,
}

/// Statistics about a directory.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct DirectoryStats {
    pub count: usize,
    pub exceeded_threshold: bool,
}

fn to_timestamp(time: Option<SystemTime>) -> Option<i64> {
    time?.duration_since(SystemTime::UNIX_EPOCH).ok().map(|d| d.as_secs() as i64)
}

/// Read directory contents.
#[tauri::command]
#[specta::specta]
#[instrument(skip(config_state))]
pub async fn read_directory(
    path: String,
    config_state: State<'_, SecurityConfigState>,
) -> Result<Vec<FileEntry>, String> {
    let config = config_state.get_config()?;
    run_blocking(move || read_directory_sync(&path, &config)).await
}

pub fn read_directory_sync(path: &str, config: &SecurityConfig) -> FsResult<Vec<FileEntry>> {
    let dir_path = validate_sandboxed(path, config)?;
    
    let mut entries: Vec<FileEntry> = fs::read_dir(&dir_path)
        .map_err(|_| FsError::ReadDirectoryFailed)?
        .flatten()
        .filter_map(|e| FileEntry::from_dir_entry(&e))
        .collect();
    
    // Sort: directories first, then alphabetically
    entries.sort_by(|a, b| {
        match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name_lower.cmp(&b.name_lower),
        }
    });
    
    Ok(entries)
}

/// Get directory statistics.
#[tauri::command]
#[specta::specta]
pub async fn get_directory_stats(
    path: String,
    config_state: State<'_, SecurityConfigState>,
) -> Result<DirectoryStats, String> {
    let config = config_state.get_config()?;
    run_blocking(move || get_directory_stats_sync(&path, &config)).await
}

fn get_directory_stats_sync(path: &str, config: &SecurityConfig) -> FsResult<DirectoryStats> {
    let dir_path = validate_sandboxed(path, config)?;
    let threshold = limits::STREAM_BATCH_SIZE * 20;
    
    let mut count = 0;
    for _ in fs::read_dir(&dir_path).map_err(|_| FsError::ReadDirectoryFailed)?.flatten() {
        count += 1;
        if count > threshold {
            return Ok(DirectoryStats { count, exceeded_threshold: true });
        }
    }
    
    Ok(DirectoryStats { count, exceeded_threshold: false })
}

/// Stream directory entries in batches.
#[tauri::command]
#[specta::specta]
pub async fn read_directory_stream(
    path: String,
    app: AppHandle,
    config_state: State<'_, SecurityConfigState>,
) -> Result<(), String> {
    let config = config_state.get_config()?;
    
    run_blocking(move || {
        let dir_path = validate_sandboxed(&path, &config)?;
        let mut batch = Vec::with_capacity(limits::STREAM_BATCH_SIZE);
        
        for entry in fs::read_dir(&dir_path).map_err(|_| FsError::ReadDirectoryFailed)?.flatten() {
            if let Some(file_entry) = FileEntry::from_dir_entry(&entry) {
                batch.push(file_entry);
                
                if batch.len() >= limits::STREAM_BATCH_SIZE {
                    let _ = app.emit("directory-batch", &batch);
                    batch.clear();
                }
            }
        }
        
        if !batch.is_empty() {
            let _ = app.emit("directory-batch", &batch);
        }
        
        let _ = app.emit("directory-complete", &path);
        Ok(())
    }).await
}

/// Get available drives/volumes.
#[tauri::command]
#[specta::specta]
pub async fn get_drives() -> Result<Vec<DriveInfo>, String> {
    run_blocking(|| {
        let disks = sysinfo::Disks::new_with_refreshed_list();
        
        let drives: Vec<DriveInfo> = disks
            .iter()
            .map(|d| {
                let name = d.name().to_string_lossy().to_string();
                let path = d.mount_point().to_string_lossy().to_string();
                let label = get_volume_label(d, &name);
                
                DriveInfo {
                    name,
                    path,
                    total_space: d.total_space(),
                    free_space: d.available_space(),
                    drive_type: "local".to_string(),
                    label,
                }
            })
            .collect();
        
        if drives.is_empty() {
            Ok(vec![DriveInfo {
                name: "/".to_string(),
                path: "/".to_string(),
                total_space: 0,
                free_space: 0,
                drive_type: "local".to_string(),
                label: None,
            }])
        } else {
            Ok(drives)
        }
    }).await
}

fn get_volume_label(disk: &sysinfo::Disk, fallback: &str) -> Option<String> {
    #[cfg(windows)]
    {
        use std::os::windows::ffi::OsStrExt;
        use winapi::shared::minwindef::DWORD;
        use winapi::um::fileapi::GetVolumeInformationW;
        
        let mount = disk.mount_point();
        let mut vol_name: Vec<u16> = vec![0; 260];
        let mut root: Vec<u16> = mount.as_os_str().encode_wide().chain(Some(0)).collect();
        
        let res = unsafe {
            GetVolumeInformationW(
                root.as_ptr(),
                vol_name.as_mut_ptr(),
                vol_name.len() as DWORD,
                std::ptr::null_mut(),
                std::ptr::null_mut(),
                std::ptr::null_mut(),
                std::ptr::null_mut(),
                0,
            )
        };
        
        if res != 0 {
            let len = vol_name.iter().position(|&c| c == 0).unwrap_or(vol_name.len());
            let s = String::from_utf16_lossy(&vol_name[..len]);
            if !s.trim().is_empty() {
                return Some(s);
            }
        }
    }
    
    if fallback.is_empty() { None } else { Some(fallback.to_string()) }
}

/// Get file content as string.
#[tauri::command]
#[specta::specta]
pub async fn get_file_content(
    path: String,
    config_state: State<'_, SecurityConfigState>,
) -> Result<String, String> {
    let config = config_state.get_config()?;
    run_blocking(move || get_file_content_sync(&path, &config)).await
}

fn get_file_content_sync(path: &str, config: &SecurityConfig) -> FsResult<String> {
    let validated = validate_sandboxed(path, config)?;
    let meta = fs::metadata(&validated)?;
    
    if meta.len() > limits::MAX_CONTENT_FILE_SIZE {
        return Err(FsError::FileTooLarge);
    }
    
    fs::read_to_string(&validated).map_err(FsError::from)
}

/// Get parent path.
#[tauri::command]
#[specta::specta]
pub async fn get_parent_path(
    path: String,
    config_state: State<'_, SecurityConfigState>,
) -> Result<Option<String>, String> {
    let config = config_state.get_config()?;
    run_blocking(move || {
        let validated = validate_sandboxed(&path, &config)?;
        Ok(validated.parent().map(|p| p.to_string_lossy().to_string()))
    }).await
}

/// Check if path exists.
#[tauri::command]
#[specta::specta]
pub async fn path_exists(
    path: String,
    config_state: State<'_, SecurityConfigState>,
) -> Result<bool, String> {
    let config = config_state.get_config()?;
    run_blocking(move || {
        let validated = validate_sandboxed(&path, &config)?;
        Ok(validated.exists())
    }).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn read_directory_sorts_correctly() {
        let dir = tempdir().unwrap();
        fs::create_dir(dir.path().join("aaa_dir")).unwrap();
        fs::File::create(dir.path().join("bbb.txt")).unwrap();
        fs::File::create(dir.path().join("aaa.txt")).unwrap();
        
        let config = SecurityConfig::default().with_mounted_disks();
        let entries = read_directory_sync(&dir.path().to_string_lossy(), &config).unwrap();
        
        assert!(entries[0].is_dir);
        assert!(!entries[1].is_dir);
    }
}