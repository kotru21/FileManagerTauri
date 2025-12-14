use crate::commands::config::{limits, SecurityConfig};
use crate::commands::error::{FsError, FsResult};
use crate::commands::validation::{
    is_hidden, is_reparse_point, validate_filename, validate_paths_sandboxed,
    validate_sandboxed, validate_sandboxed_no_follow,
};
use serde::{Deserialize, Serialize};
use specta::Type;
use std::collections::VecDeque;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, RwLock};
use std::time::SystemTime;
use tauri::async_runtime::spawn_blocking;
use tauri::{AppHandle, Emitter, State};
use tokio::task::JoinSet;
use tracing::instrument;

/// Type alias for the managed security config state.
pub type SecurityConfigState = Arc<RwLock<SecurityConfig>>;

/// Helper trait for extracting config from Tauri state.
pub trait ConfigExt {
    fn get_config(&self) -> Result<SecurityConfig, String>;
}

impl ConfigExt for State<'_, SecurityConfigState> {
    fn get_config(&self) -> Result<SecurityConfig, String> {
        self.read()
            .map(|guard| guard.clone())
            .map_err(|_| "Failed to read security config".to_string())
    }
}

/// Execute a blocking filesystem operation on a dedicated thread pool.
pub async fn run_blocking_fs<T, F>(f: F) -> Result<T, String>
where
    F: FnOnce() -> FsResult<T> + Send + 'static,
    T: Send + 'static,
{
    spawn_blocking(f)
        .await
        .map_err(|_| FsError::Internal.to_public_string())?
        .map_err(|e| e.to_public_string())
}

// ============================================================================
// Data Types
// ============================================================================

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
            extension: path
                .extension()
                .and_then(|e| e.to_str())
                .map(|s| s.to_lowercase()),
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

/// Progress information for copy operations.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct CopyProgress {
    pub current: usize,
    pub total: usize,
    pub file: String,
}

fn to_timestamp(time: Option<SystemTime>) -> Option<i64> {
    time?.duration_since(SystemTime::UNIX_EPOCH)
        .ok()
        .map(|d| d.as_secs() as i64)
}

// ============================================================================
// Read Operations
// ============================================================================

/// Read directory contents.
#[tauri::command]
#[specta::specta]
#[instrument(skip(config_state))]
pub async fn read_directory(
    path: String,
    config_state: State<'_, SecurityConfigState>,
) -> Result<Vec<FileEntry>, String> {
    let config = config_state.get_config()?;
    run_blocking_fs(move || read_directory_sync(&path, &config)).await
}

pub fn read_directory_sync(path: &str, config: &SecurityConfig) -> FsResult<Vec<FileEntry>> {
    let dir_path = validate_sandboxed(path, config)?;

    let mut entries: Vec<FileEntry> = fs::read_dir(&dir_path)
        .map_err(|_| FsError::ReadDirectoryFailed)?
        .flatten()
        .filter_map(|e| FileEntry::from_dir_entry(&e))
        .collect();

    // Sort: directories first, then alphabetically
    entries.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name_lower.cmp(&b.name_lower),
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
    run_blocking_fs(move || {
        let dir_path = validate_sandboxed(&path, &config)?;
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

/// Stream directory entries in batches.
#[tauri::command]
#[specta::specta]
pub async fn read_directory_stream(
    path: String,
    app: AppHandle,
    config_state: State<'_, SecurityConfigState>,
) -> Result<(), String> {
    let config = config_state.get_config()?;

    run_blocking_fs(move || {
        let dir_path = validate_sandboxed(&path, &config)?;
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

/// Get available drives/volumes.
#[tauri::command]
#[specta::specta]
pub async fn get_drives() -> Result<Vec<DriveInfo>, String> {
    run_blocking_fs(|| {
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
    })
    .await
}

#[allow(unused_variables)]
fn get_volume_label(disk: &sysinfo::Disk, fallback: &str) -> Option<String> {
    #[cfg(windows)]
    {
        use std::os::windows::ffi::OsStrExt;
        use winapi::shared::minwindef::DWORD;
        use winapi::um::fileapi::GetVolumeInformationW;

        let mount = disk.mount_point();
        let mut vol_name: Vec<u16> = vec![0; 260];
        let root: Vec<u16> = mount.as_os_str().encode_wide().chain(Some(0)).collect();

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

    if fallback.is_empty() {
        None
    } else {
        Some(fallback.to_string())
    }
}

/// Get file content as string.
#[tauri::command]
#[specta::specta]
pub async fn get_file_content(
    path: String,
    config_state: State<'_, SecurityConfigState>,
) -> Result<String, String> {
    let config = config_state.get_config()?;
    run_blocking_fs(move || {
        let validated = validate_sandboxed(&path, &config)?;
        let meta = fs::metadata(&validated)?;

        if meta.len() > limits::MAX_CONTENT_FILE_SIZE {
            return Err(FsError::FileTooLarge);
        }

        fs::read_to_string(&validated).map_err(FsError::from)
    })
    .await
}

/// Get parent path.
#[tauri::command]
#[specta::specta]
pub async fn get_parent_path(
    path: String,
    config_state: State<'_, SecurityConfigState>,
) -> Result<Option<String>, String> {
    let config = config_state.get_config()?;
    run_blocking_fs(move || {
        let validated = validate_sandboxed(&path, &config)?;
        Ok(validated.parent().map(|p| p.to_string_lossy().to_string()))
    })
    .await
}

/// Check if path exists.
#[tauri::command]
#[specta::specta]
pub async fn path_exists(
    path: String,
    config_state: State<'_, SecurityConfigState>,
) -> Result<bool, String> {
    let config = config_state.get_config()?;
    run_blocking_fs(move || {
        let validated = validate_sandboxed(&path, &config)?;
        Ok(validated.exists())
    })
    .await
}

// ============================================================================
// Write Operations
// ============================================================================

/// Create a new directory.
#[tauri::command]
#[specta::specta]
#[instrument(skip(config_state))]
pub async fn create_directory(
    path: String,
    config_state: State<'_, SecurityConfigState>,
) -> Result<(), String> {
    let config = config_state.get_config()?;
    run_blocking_fs(move || {
        if path.is_empty() {
            return Err(FsError::InvalidPath);
        }

        let p = Path::new(&path);
        let parent = p.parent().ok_or(FsError::InvalidPath)?;
        let name = p.file_name().ok_or(FsError::InvalidName)?;

        validate_filename(name)?;
        let validated_parent = validate_sandboxed(&parent.to_string_lossy(), &config)?;

        let new_path = validated_parent.join(name);
        fs::create_dir_all(&new_path)?;

        tracing::debug!(path = %new_path.display(), "Directory created");
        Ok(())
    })
    .await
}

/// Create a new file.
#[tauri::command]
#[specta::specta]
#[instrument(skip(config_state))]
pub async fn create_file(
    path: String,
    config_state: State<'_, SecurityConfigState>,
) -> Result<(), String> {
    let config = config_state.get_config()?;
    run_blocking_fs(move || {
        if path.is_empty() {
            return Err(FsError::InvalidPath);
        }

        let p = Path::new(&path);
        let parent = p.parent().ok_or(FsError::InvalidPath)?;
        let name = p.file_name().ok_or(FsError::InvalidName)?;

        validate_filename(name)?;
        let validated_parent = validate_sandboxed(&parent.to_string_lossy(), &config)?;

        let new_path = validated_parent.join(name);

        if let Some(parent) = new_path.parent() {
            if !parent.exists() {
                fs::create_dir_all(parent)?;
            }
        }

        fs::File::create(&new_path)?;
        tracing::debug!(path = %new_path.display(), "File created");

        Ok(())
    })
    .await
}

/// Rename a file or directory.
#[tauri::command]
#[specta::specta]
#[instrument(skip(config_state))]
pub async fn rename_entry(
    old_path: String,
    new_name: String,
    config_state: State<'_, SecurityConfigState>,
) -> Result<String, String> {
    let config = config_state.get_config()?;
    run_blocking_fs(move || {
        validate_filename(std::ffi::OsStr::new(&new_name))?;

        let validated_old = validate_sandboxed_no_follow(&old_path, &config)?;
        let parent = validated_old.parent().ok_or(FsError::InvalidPath)?;

        // Ensure parent is still in sandbox
        validate_sandboxed(&parent.to_string_lossy(), &config)?;

        let new_path = parent.join(&new_name);
        fs::rename(&validated_old, &new_path)?;

        tracing::debug!(
            old = %validated_old.display(),
            new = %new_path.display(),
            "Entry renamed"
        );

        Ok(new_path.to_string_lossy().to_string())
    })
    .await
}

// ============================================================================
// Delete Operations
// ============================================================================

/// Delete files or directories.
#[tauri::command]
#[specta::specta]
#[instrument(skip(config_state))]
pub async fn delete_entries(
    paths: Vec<String>,
    permanent: bool,
    config_state: State<'_, SecurityConfigState>,
) -> Result<(), String> {
    let config = config_state.get_config()?;
    run_blocking_fs(move || {
        let validated = validate_paths_sandboxed(&paths, &config)?;

        for path in validated {
            if !path.exists() {
                continue;
            }

            if permanent {
                delete_permanent(&path)?;
            } else {
                trash::delete(&path).map_err(|e| FsError::Io(e.to_string()))?;
            }

            tracing::debug!(path = %path.display(), permanent, "Entry deleted");
        }

        Ok(())
    })
    .await
}

fn delete_permanent(path: &PathBuf) -> FsResult<()> {
    let meta = fs::symlink_metadata(path)?;

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

// ============================================================================
// Copy/Move Operations
// ============================================================================

/// Copy entries to a destination directory.
#[tauri::command]
#[specta::specta]
#[instrument(skip(config_state))]
pub async fn copy_entries(
    sources: Vec<String>,
    destination: String,
    config_state: State<'_, SecurityConfigState>,
) -> Result<(), String> {
    let config = config_state.get_config()?;
    run_blocking_fs(move || {
        let validated_sources = validate_paths_sandboxed(&sources, &config)?;
        let dest_path = validate_sandboxed(&destination, &config)?;

        for src in validated_sources {
            let name = src.file_name().ok_or(FsError::InvalidPath)?;
            let target = dest_path.join(name);

            let meta = fs::symlink_metadata(&src)?;
            if meta.file_type().is_symlink() {
                tracing::debug!(path = %src.display(), "Skipping symlink");
                continue;
            }

            if meta.is_dir() {
                copy_dir_iterative(&src, &target)?;
            } else {
                fs::copy(&src, &target)?;
            }

            tracing::debug!(src = %src.display(), dst = %target.display(), "Entry copied");
        }

        Ok(())
    })
    .await
}

/// Parallel copy with progress events.
#[tauri::command]
#[specta::specta]
#[instrument(skip(app, config_state))]
pub async fn copy_entries_parallel(
    sources: Vec<String>,
    destination: String,
    app: AppHandle,
    config_state: State<'_, SecurityConfigState>,
) -> Result<(), String> {
    let config = config_state.get_config()?;

    let validated_sources =
        validate_paths_sandboxed(&sources, &config).map_err(|e| e.to_public_string())?;
    let dest_path =
        validate_sandboxed(&destination, &config).map_err(|e| e.to_public_string())?;

    let total = validated_sources.len();
    if total == 0 {
        return Ok(());
    }

    let parallelism = std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(4)
        .clamp(1, limits::MAX_PARALLEL_COPIES);

    let sem = Arc::new(tokio::sync::Semaphore::new(parallelism));
    let counter = Arc::new(AtomicUsize::new(0));
    let mut tasks = JoinSet::new();

    for src in validated_sources {
        let permit = sem
            .clone()
            .acquire_owned()
            .await
            .map_err(|_| FsError::Internal.to_public_string())?;

        let dest = dest_path.clone();
        let app = app.clone();
        let counter = counter.clone();
        let src_str = src.to_string_lossy().to_string();

        tasks.spawn(async move {
            let _permit = permit;

            let result = spawn_blocking(move || copy_single_entry(&src, &dest))
                .await
                .map_err(|_| FsError::Internal)?;

            let current = counter.fetch_add(1, Ordering::Relaxed) + 1;

            if current == total || current % 5 == 0 {
                let _ = app.emit(
                    "copy-progress",
                    CopyProgress {
                        current,
                        total,
                        file: src_str,
                    },
                );
            }

            result
        });
    }

    while let Some(result) = tasks.join_next().await {
        result
            .map_err(|_| FsError::Internal.to_public_string())?
            .map_err(|e| e.to_public_string())?;
    }

    Ok(())
}

/// Move entries to a destination directory.
#[tauri::command]
#[specta::specta]
#[instrument(skip(config_state))]
pub async fn move_entries(
    sources: Vec<String>,
    destination: String,
    config_state: State<'_, SecurityConfigState>,
) -> Result<(), String> {
    let config = config_state.get_config()?;
    run_blocking_fs(move || {
        let validated_sources = validate_paths_sandboxed(&sources, &config)?;
        let dest_path = validate_sandboxed(&destination, &config)?;

        for src in validated_sources {
            let name = src.file_name().ok_or(FsError::InvalidPath)?;
            let target = dest_path.join(name);

            fs::rename(&src, &target)?;
            tracing::debug!(src = %src.display(), dst = %target.display(), "Entry moved");
        }

        Ok(())
    })
    .await
}

fn copy_single_entry(src: &Path, dest: &Path) -> FsResult<()> {
    let name = src.file_name().ok_or(FsError::InvalidPath)?;
    let target = dest.join(name);

    if src.is_dir() {
        copy_dir_iterative(src, &target)?;
    } else {
        fs::copy(src, &target)?;
    }

    Ok(())
}

/// Iterative directory copy to prevent stack overflow.
fn copy_dir_iterative(src: &Path, dst: &Path) -> FsResult<()> {
    let mut queue: VecDeque<(PathBuf, PathBuf, usize)> = VecDeque::new();
    queue.push_back((src.to_path_buf(), dst.to_path_buf(), 0));

    while let Some((current_src, current_dst, depth)) = queue.pop_front() {
        if depth > limits::MAX_DIRECTORY_DEPTH {
            return Err(FsError::DirectoryTooDeep);
        }

        fs::create_dir_all(&current_dst)?;

        for entry in fs::read_dir(&current_src)? {
            let entry = entry?;
            let src_path = entry.path();
            let dst_path = current_dst.join(entry.file_name());

            let meta = fs::symlink_metadata(&src_path)?;

            if is_reparse_point(&meta) || meta.file_type().is_symlink() {
                continue;
            }

            if meta.is_dir() {
                queue.push_back((src_path, dst_path, depth + 1));
            } else {
                fs::copy(&src_path, &dst_path)?;
            }
        }
    }

    Ok(())
}

// ============================================================================
// Tests
// ============================================================================

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

    #[test]
    fn validate_filename_rejects_traversal() {
        assert!(validate_filename(std::ffi::OsStr::new(".")).is_err());
        assert!(validate_filename(std::ffi::OsStr::new("..")).is_err());
    }

    #[tokio::test]
    async fn get_drives_returns_results() {
        let result = get_drives().await;
        assert!(result.is_ok());
        assert!(!result.unwrap().is_empty());
    }
}