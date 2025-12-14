//! Read operations for files and directories.

use crate::commands::config::limits;
use crate::commands::error::{FsError, FsResult};
use crate::commands::types::{DirectoryStats, DriveInfo, FileEntry};
use crate::commands::validation::validate_path;

use super::run_blocking;
use std::fs;
use tauri::{AppHandle, Emitter};
use tracing::instrument;

#[tauri::command]
#[specta::specta]
#[instrument]
pub async fn read_directory(path: String) -> Result<Vec<FileEntry>, String> {
    run_blocking(move || read_directory_sync(&path)).await
}

pub fn read_directory_sync(path: &str) -> FsResult<Vec<FileEntry>> {
    println!("=== read_directory_sync: {}", path);
    
    let dir_path = match validate_path(path) {
        Ok(p) => {
            println!("=== validated OK: {:?}", p);
            p
        }
        Err(e) => {
            println!("=== validate_path FAILED: {:?}", e);
            return Err(e);
        }
    };
    
    let mut entries: Vec<FileEntry> = fs::read_dir(&dir_path)
        .map_err(|e| {
            println!("=== fs::read_dir FAILED: {:?}", e);
            FsError::ReadDirectoryFailed
        })?
        .flatten()
        .filter_map(|e| FileEntry::from_dir_entry(&e))
        .collect();
        
    println!("=== got {} entries", entries.len());
    
    entries.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name_lower.cmp(&b.name_lower),
    });
    Ok(entries)
}

#[tauri::command]
#[specta::specta]
pub async fn get_directory_stats(path: String) -> Result<DirectoryStats, String> {
    run_blocking(move || {
        let dir_path = validate_path(&path)?;
        let threshold = limits::STREAM_BATCH_SIZE * 20;
        let mut count = 0;
        for _ in fs::read_dir(&dir_path)
            .map_err(|_| FsError::ReadDirectoryFailed)?
            .flatten()
        {
            count += 1;
            if count > threshold {
                return Ok(DirectoryStats {
                    count,
                    exceeded_threshold: true,
                });
            }
        }
        Ok(DirectoryStats {
            count,
            exceeded_threshold: false,
        })
    })
    .await
}

#[tauri::command]
#[specta::specta]
pub async fn read_directory_stream(path: String, app: AppHandle) -> Result<(), String> {
    run_blocking(move || {
        let dir_path = validate_path(&path)?;
        let mut batch = Vec::with_capacity(limits::STREAM_BATCH_SIZE);
        for entry in fs::read_dir(&dir_path)
            .map_err(|_| FsError::ReadDirectoryFailed)?
            .flatten()
        {
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
    })
    .await
}

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
                    drive_type: format!("{:?}", d.kind()),
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
                drive_type: "unknown".to_string(),
                label: Some("Root".to_string()),
            }])
        } else {
            Ok(drives)
        }
    })
    .await
}

#[allow(unused_variables)]
fn get_volume_label(disk: &sysinfo::Disk, fallback: &str) -> Option<String> {
    #[cfg(windows)]
    {
        use std::os::windows::ffi::OsStrExt;
        use windows_sys::Win32::Storage::FileSystem::GetVolumeInformationW;
        let mount = disk.mount_point();
        let mut vol_name: Vec<u16> = vec![0; 260];
        let root: Vec<u16> = mount.as_os_str().encode_wide().chain(Some(0)).collect();
        let res = unsafe {
            GetVolumeInformationW(
                root.as_ptr(),
                vol_name.as_mut_ptr(),
                vol_name.len() as u32,
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

#[tauri::command]
#[specta::specta]
pub async fn get_file_content(path: String) -> Result<String, String> {
    run_blocking(move || {
        let validated = validate_path(&path)?;
        let meta = fs::metadata(&validated)?;
        if meta.len() > limits::MAX_CONTENT_FILE_SIZE {
            return Err(FsError::FileTooLarge);
        }
        fs::read_to_string(&validated).map_err(FsError::from)
    })
    .await
}

#[tauri::command]
#[specta::specta]
pub async fn get_parent_path(path: String) -> Result<Option<String>, String> {
    run_blocking(move || {
        let validated = validate_path(&path)?;
        Ok(validated.parent().map(|p| p.to_string_lossy().to_string()))
    })
    .await
}

#[tauri::command]
#[specta::specta]
pub async fn path_exists(path: String) -> Result<bool, String> {
    run_blocking(move || {
        let validated = validate_path(&path)?;
        Ok(validated.exists())
    })
    .await
}