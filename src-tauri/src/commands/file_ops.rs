use crate::commands::config::SecurityConfig;
use serde::{Deserialize, Serialize};
use specta::Type;
use std::collections::VecDeque;
use std::fs;
use std::path::Path;
use std::path::PathBuf;
use std::sync::Arc;
use std::sync::RwLock;
use tauri::State;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::time::SystemTime;
use tauri::async_runtime::spawn_blocking;
use tauri::{AppHandle, Emitter};
use tracing::instrument;
use sysinfo::SystemExt;
use sysinfo::DiskExt;
use tokio::task::JoinSet;

use crate::commands::error::FsError;
use crate::commands::config::limits as limits;
pub fn validate_path_sandboxed_with_cfg(path: &str, cfg: &crate::commands::config::SecurityConfig) -> FsResult<std::path::PathBuf> {
    use glob::Pattern;
    let canonical = validate_path(path)?;
    let in_allowed = cfg.allowed_roots.iter().any(|root| canonical.starts_with(root));
    if !in_allowed {
        tracing::debug!(path = %canonical.to_string_lossy(), roots = ?cfg.allowed_roots, "sandbox validation failed: path not in allowed_roots (sandboxed)");
        return Err(FsError::AccessDenied);
    }

    for pattern in &cfg.denied_patterns {
        if let Ok(pat) = Pattern::new(pattern) && pat.matches(canonical.to_string_lossy().as_ref()) {
            return Err(FsError::AccessDenied);
        }
    }
    Ok(canonical)
}
// Legacy global getter removed. Commands now accept managed SecurityConfig from Tauri State

// Maximum recursion depth for directory operations
// using config::limits::MAX_DIRECTORY_DEPTH
pub fn validate_path_no_follow_sandboxed_with_cfg(path: &str, cfg: &crate::commands::config::SecurityConfig) -> FsResult<std::path::PathBuf> {
    let canonical = validate_path_no_follow(path)?;
    let in_allowed = cfg.allowed_roots.iter().any(|root| canonical.starts_with(root));
    if !in_allowed {
        tracing::debug!(path = %canonical.to_string_lossy(), roots = ?cfg.allowed_roots, "sandbox validation failed: path not in allowed_roots (no_follow)");
        return Err(FsError::AccessDenied);
    }
    for pattern in &cfg.denied_patterns {
        if let Ok(pat) = glob::Pattern::new(pattern) && pat.matches(canonical.to_string_lossy().as_ref()) {
            return Err(FsError::AccessDenied);
        }
    }
    Ok(canonical)
}

/// Maximum file size to read entirely (10 MB)
// Replace with constant from config.
const MAX_CONTENT_SIZE: u64 = limits::MAX_CONTENT_FILE_SIZE;

type FsResult<T> = Result<T, FsError>;

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

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct DriveInfo {
    pub name: String,
    pub path: String,
    pub total_space: u64,
    pub free_space: u64,
    pub drive_type: String,
    pub label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct DirectoryStats {
    pub count: usize,
    pub exceeded_threshold: bool,
}

// OperationProgress previously used for streaming long operations—removed as unused
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


/// Validate path to prevent path traversal attacks
/// Checks that path is absolute and does not contain unsafe components
pub fn validate_path(path: &str) -> FsResult<std::path::PathBuf> {
    let path_buf = std::path::PathBuf::from(path);

    // Path must be absolute
    if !path_buf.is_absolute() {
        return Err(FsError::PathNotAbsolute);
    }

    // Canonicalize the path to resolve .. and .
    let canonical = path_buf
        .canonicalize()
        .map_err(|_| FsError::InvalidPath)?;

    // Check that the path does not attempt to escape the root
    if canonical.components().count() < 1 {
        return Err(FsError::InvalidPath);
    }


    #[cfg(windows)]
    let canonical = strip_windows_prefix(canonical);

    Ok(canonical)
}


#[cfg(windows)]
fn strip_windows_prefix(path: std::path::PathBuf) -> std::path::PathBuf {
    let path_str = path.to_string_lossy();
    if let Some(stripped) = path_str.strip_prefix(r"\\?\") {
        std::path::PathBuf::from(stripped)
    } else {
        path
    }
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

    // Reject alternate data streams on Windows (ADS). Colon is reserved for ADS
    if s.contains(':') {
        return Err(FsError::InvalidName);
    }

    // Windows device names and trailing dots/spaces can cause surprising behavior.
    #[cfg(windows)]
    {
        let base_name = s.split('.').next().unwrap_or(&s);
        let upper = base_name.trim_end_matches([' ', '.']).to_ascii_uppercase();
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
        (meta.file_attributes() & FILE_ATTRIBUTE_REPARSE_POINT) != 0
    }
    #[cfg(not(windows))]
    {
        let _ = meta;
        false
    }
}

// validate_paths removed—use individual validate_path or validate_paths_sandboxed instead
// Removed legacy test-only wrapper validate_paths_sandboxed — use validate_paths_no_follow_sandboxed_with_cfg instead in tests.

/// Validate a set of paths without following symlinks and sandbox them
// validate_paths_no_follow_sandboxed removed — use validate_paths_no_follow_sandboxed_with_cfg(paths, &cfg)

/// Validate set of paths no follow using provided SecurityConfig
pub fn validate_paths_no_follow_sandboxed_with_cfg(paths: &[String], cfg: &crate::commands::config::SecurityConfig) -> FsResult<Vec<std::path::PathBuf>> {
    paths.iter().map(|p| validate_path_no_follow_sandboxed_with_cfg(p, cfg)).collect()
}
// validate_path_sandboxed removed — use validate_path_sandboxed_with_cfg

// validate_paths_no_follow removed—use validate_paths_no_follow_sandboxed or validate_path_no_follow
/// Validate a path without following symlinks and ensure sandbox rules (allowed_roots/denied_patterns)
// validate_path_no_follow_sandboxed removed — use validate_path_no_follow_sandboxed_with_cfg

pub fn validate_path_no_follow(path: &str) -> FsResult<std::path::PathBuf> {
    let path_buf = std::path::PathBuf::from(path);
    if !path_buf.is_absolute() {
        return Err(FsError::PathNotAbsolute);
    }
    // Ensure the path exists and we can lstat it (symlink_metadata) without following symlinks
    std::fs::symlink_metadata(&path_buf).map_err(|_| FsError::InvalidPath)?;

    #[cfg(windows)]
    let path_buf = strip_windows_prefix(path_buf);

    Ok(path_buf)
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

/// Helper: run a blocking FS closure and convert FsError into a public String
pub(crate) async fn run_blocking_fs<T, F>(f: F) -> Result<T, String>
where
    F: FnOnce() -> FsResult<T> + Send + 'static,
    T: Send + 'static,
{
    let inner = spawn_blocking(f).await.map_err(|_| FsError::Internal.to_public_string())?;
    inner.map_err(|e| e.to_public_string())
}



#[tauri::command]
#[specta::specta]
#[instrument(skip(path, config_state))]
pub async fn read_directory(
    path: String,
    config_state: tauri::State<'_, std::sync::Arc<std::sync::RwLock<crate::commands::config::SecurityConfig>>>,
) -> Result<Vec<FileEntry>, String> {
    let config = config_state.read().map_err(|_| "Failed to read security config")?.clone();
    let v = run_blocking_fs({
        let path = path.clone();
        let config = config.clone();
        move || read_directory_sync_with_cfg(path, &config)
    }).await?;
    Ok(v)
}

pub(crate) fn read_directory_sync_with_cfg(path: String, cfg: &SecurityConfig) -> FsResult<Vec<FileEntry>> {
    // validate path for reading
    let dir_path = validate_path_sandboxed_with_cfg(&path, cfg)?;

    let mut entries = Vec::new();

    let read_dir = fs::read_dir(dir_path).map_err(|_| FsError::ReadDirectoryFailed)?;

    for entry in read_dir.flatten() {
        let entry_path = entry.path();
        let metadata = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };

        let name_str = entry_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();
        let name = name_str.clone().into_boxed_str();
        let name_lower = name_str.to_lowercase().into_boxed_str();

        let extension = entry_path
            .extension()
            .and_then(|e| e.to_str())
            .map(|s| s.to_lowercase());

        entries.push(FileEntry {
            name,
            name_lower,
            path: entry_path.to_string_lossy().to_string().into_boxed_str(),
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
        _ => a.name_lower.cmp(&b.name_lower),
    });

    Ok(entries)
}

#[tauri::command]
#[specta::specta]
pub async fn get_directory_stats(
    path: String,
    config_state: State<'_, Arc<RwLock<crate::commands::config::SecurityConfig>>>,
) -> Result<DirectoryStats, String> {
    let config = config_state
        .read()
        .map_err(|_| "Failed to read security config")?
        .clone();
    run_blocking_fs(move || get_directory_stats_sync_with_cfg(path, &config)).await
}

pub(crate) fn get_directory_stats_sync_with_cfg(path: String, cfg: &SecurityConfig) -> FsResult<DirectoryStats> {
    let dir_path = validate_path_sandboxed_with_cfg(&path, cfg)?;
    let read_dir = fs::read_dir(dir_path).map_err(|_| FsError::ReadDirectoryFailed)?;
    let mut count = 0usize;
    let threshold = limits::STREAM_BATCH_SIZE * 20; // default heuristic; could make property in config
    for _entry in read_dir.flatten() {
        count += 1;
        if count > threshold {
            return Ok(DirectoryStats { count, exceeded_threshold: true });
        }
    }
    Ok(DirectoryStats { count, exceeded_threshold: false })
}

// Removed legacy wrapper read_directory_sync — use read_directory_sync_with_cfg(path, &cfg) directly.

#[tauri::command]
#[specta::specta]
pub async fn get_drives() -> Result<Vec<DriveInfo>, String> {
    // Use sysinfo to enumerate disks and provide total/free space in a cross-platform manner.
    let mut sys = sysinfo::System::new_all();
    sys.refresh_disks_list();
    sys.refresh_disks();

    let mut drives = Vec::new();
    for d in sys.disks() {
        let name = d.name().to_string_lossy().to_string();
        let path = d.mount_point().to_string_lossy().to_string();
        // Attempt to extract OS-specific volume label where possible.
        let label: Option<String> = {
            #[cfg(windows)]
            {
                // Attempt to use WinAPI GetVolumeInformationW for a reliable label.
                use std::os::windows::ffi::OsStrExt;
                // no null_mut used; volume label retrieval does not use it explicitly
                use winapi::um::fileapi::GetVolumeInformationW;
                use winapi::shared::minwindef::DWORD;

                let mount = d.mount_point();
                let mut vol_name: Vec<u16> = vec![0u16; 260];
                let mut fs_name: Vec<u16> = vec![0u16; 260];
                let mut serial: DWORD = 0;
                let mut max_comp: DWORD = 0;
                let mut flags: DWORD = 0;
                let mut root: Vec<u16> = mount.as_os_str().encode_wide().collect();
                // Ensure null-termination
                if *root.last().unwrap_or(&0) != 0 {
                    root.push(0);
                }
                let res = unsafe {
                    GetVolumeInformationW(
                        root.as_ptr(),
                        vol_name.as_mut_ptr(),
                        vol_name.len() as DWORD,
                        &mut serial,
                        &mut max_comp,
                        &mut flags,
                        fs_name.as_mut_ptr(),
                        fs_name.len() as DWORD,
                    )
                };
                if res != 0 {
                    let len = vol_name.iter().position(|&c| c == 0).unwrap_or(vol_name.len());
                    let s = String::from_utf16_lossy(&vol_name[..len]);
                    if s.trim().is_empty() {
                        None
                    } else {
                        Some(s)
                    }
                } else {
                    // Fallback to sysinfo name as label if available
                    if name.is_empty() { None } else { Some(name.clone()) }
                }
            }
            #[cfg(not(windows))]
            {
                // On non-Windows, sysinfo's `name()` is usually the mount label or name.
                if name.is_empty() { None } else { Some(name.clone()) }
            }
        };
        drives.push(DriveInfo {
            name,
            path,
            total_space: d.total_space(),
            free_space: d.available_space(),
            drive_type: "local".to_string(),
            label,
        });
        tracing::debug!(disk = %d.mount_point().to_string_lossy(), total = %d.total_space(), free = %d.available_space(), "found disk");
    }
    if drives.is_empty() {
        // Fallback
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
}


#[tauri::command]
#[specta::specta]
pub async fn create_directory(
    path: String,
    config_state: tauri::State<'_, std::sync::Arc<std::sync::RwLock<crate::commands::config::SecurityConfig>>>,
) -> Result<(), String> {
    tracing::debug!(path = %path, "create_directory called");
    let config = config_state.read().map_err(|_| "Failed to read security config")?.clone();
    run_blocking_fs(move || create_directory_sync_with_cfg(path, &config)).await
}

pub(crate) fn create_directory_sync_with_cfg(path: String, cfg: &SecurityConfig) -> FsResult<()> {
    if path.is_empty() {
        return Err(FsError::InvalidPath);
    }

    let p = Path::new(&path);
    let parent = p.parent().ok_or(FsError::InvalidPath)?;
    // validate the parent directory to ensure we don't write outside allowed locations
    let validated_parent = validate_path_sandboxed_with_cfg(&parent.to_string_lossy(), cfg)?;
    let name = p.file_name().ok_or(FsError::InvalidName)?;
    validate_child_name(name)?;
    let new_path = validated_parent.join(name);
    fs::create_dir_all(new_path).map_err(|_| FsError::Io)
}

#[tauri::command]
#[specta::specta]
pub async fn create_file(
    path: String,
    config_state: State<'_, Arc<RwLock<crate::commands::config::SecurityConfig>>>,
) -> Result<(), String> {
    tracing::debug!(path = %path, "create_file called");
    let config = config_state
        .read()
        .map_err(|_| "Failed to read security config")?
        .clone();
    run_blocking_fs(move || create_file_sync_with_cfg(path, &config)).await
}

pub(crate) fn create_file_sync_with_cfg(path: String, cfg: &SecurityConfig) -> FsResult<()> {
    if path.is_empty() {
        return Err(FsError::InvalidPath);
    }

    let file_path = Path::new(&path);
    let parent = file_path.parent().ok_or(FsError::InvalidPath)?;
    // validate parent
    let validated_parent = validate_path_sandboxed_with_cfg(&parent.to_string_lossy(), cfg)?;
    let file_name = file_path.file_name().ok_or(FsError::InvalidName)?;
    validate_child_name(file_name)?;
    let new_file_path = validated_parent.join(file_name);
    if let Some(parent) = new_file_path.parent() && !parent.exists() {
        fs::create_dir_all(parent).map_err(|_| FsError::Io)?;
    }

    fs::File::create(&new_file_path).map_err(|_| FsError::Io)?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn delete_entries(
    paths: Vec<String>,
    permanent: bool,
    config_state: State<'_, Arc<RwLock<crate::commands::config::SecurityConfig>>>,
) -> Result<(), String> {
    tracing::debug!(?paths, permanent, "delete_entries called");
    let config = config_state
        .read()
        .map_err(|_| "Failed to read security config")?
        .clone();
    // NOTE: This can be heavy IO (recursive deletes), keep it off the async runtime.
    run_blocking_fs(move || delete_entries_sync_with_cfg(paths, permanent, &config)).await
}

pub(crate) fn delete_entries_sync_with_cfg(paths: Vec<String>, permanent: bool, cfg: &SecurityConfig) -> FsResult<()> {
    // Validate all paths without following symlinks — operation should act on the symlink itself
    // Validate against sandbox rules as we are performing a mutating operation
    let validated_paths: Vec<PathBuf> = validate_paths_no_follow_sandboxed_with_cfg(&paths, cfg)?;

    for entry_path in validated_paths {
        if !entry_path.exists() {
            continue;
        }

        if permanent {
            // Use symlink_metadata to avoid following symlinks / reparse points.
            let meta = fs::symlink_metadata(&entry_path).map_err(|_| FsError::Io)?;

            // On Windows, treat reparse points as non-directories to avoid deleting the target.
            if is_windows_reparse_point(&meta) {
                fs::remove_file(&entry_path).map_err(|_| FsError::Io)?;
                continue;
            }

            let ft = meta.file_type();
            if ft.is_symlink() {
                fs::remove_file(&entry_path).map_err(|_| FsError::Io)?;
            } else if ft.is_dir() {
                fs::remove_dir_all(&entry_path).map_err(|_| FsError::Io)?;
            } else {
                fs::remove_file(&entry_path).map_err(|_| FsError::Io)?;
            }
        } else {
            // Move to OS trash / recycle bin.
            trash::delete(&entry_path).map_err(|_| FsError::Io)?;
        }
    }

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn rename_entry(
    old_path: String,
    new_name: String,
    config_state: State<'_, Arc<RwLock<crate::commands::config::SecurityConfig>>>,
) -> Result<String, String> {
    // Perform blocking IO through helper
    let config = config_state
        .read()
        .map_err(|_| "Failed to read security config")?
        .clone();
    run_blocking_fs(move || rename_entry_sync_with_cfg(old_path, new_name, &config)).await
}

pub(crate) fn rename_entry_sync_with_cfg(old_path: String, new_name: String, cfg: &SecurityConfig) -> FsResult<String> {
    // Validate source without following symlinks — rename should operate on the entry itself
        let validated_old = validate_path_no_follow_sandboxed_with_cfg(&old_path, cfg)?;
    // Prevent directory traversal via name
        validate_child_name(std::ffi::OsStr::new(&new_name))?;
    let parent = validated_old.parent().ok_or(FsError::InvalidPath)?;
    let new_path = parent.join(&new_name);
    // Do not allow moving to parents outside the validated parent
    // Validate parent of new path to ensure it's within allowed paths (sandboxed)
    let _ = validate_path_sandboxed_with_cfg(&parent.to_string_lossy(), cfg)?;
    fs::rename(&validated_old, &new_path).map_err(|_| FsError::Io)?;

    Ok(new_path.to_string_lossy().to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn copy_entries(
    sources: Vec<String>,
    destination: String,
    config_state: State<'_, Arc<RwLock<crate::commands::config::SecurityConfig>>>,
) -> Result<(), String> {
    tracing::debug!(?sources, destination = %destination, "copy_entries called");
    let config = config_state
        .read()
        .map_err(|_| "Failed to read security config")?
        .clone();
    run_blocking_fs(move || copy_entries_sync_with_cfg(sources, destination, &config)).await
}

pub(crate) fn copy_entries_sync_with_cfg(sources: Vec<String>, destination: String, cfg: &SecurityConfig) -> FsResult<()> {
    // Validate paths without following symlinks — aggressively skip symlinks when copying
    // Validate sources without following and sandbox them
    let validated_sources: Vec<PathBuf> = validate_paths_no_follow_sandboxed_with_cfg(&sources, cfg)?;
    // Destination must be sandboxed for write operations
    let dest_path = validate_path_sandboxed_with_cfg(&destination, cfg)?;

    for src_path in validated_sources {
        let file_name = src_path.file_name().ok_or(FsError::InvalidPath)?;
        let target = dest_path.join(file_name);

        // Use symlink_metadata so we can detect symlinks without following them
        let meta = fs::symlink_metadata(&src_path).map_err(|_| FsError::Io)?;
        if meta.file_type().is_symlink() {
            // Skip symlinks by default to avoid copying outside the tree
            continue;
        }
        if meta.is_dir() {
            copy_dir_iterative(&src_path, &target)?;
        } else {
            fs::copy(&src_path, &target).map_err(|_| FsError::Io)?;
        }
    }
    Ok(())
}

/// Iterative directory copy
fn copy_dir_iterative(src: &Path, dst: &Path) -> FsResult<()> {
    let mut queue: VecDeque<(PathBuf, PathBuf, usize)> = VecDeque::new();
    queue.push_back((src.to_path_buf(), dst.to_path_buf(), 0));

    while let Some((current_src, current_dst, depth)) = queue.pop_front() {
        // Protect against excessive nesting depth
        if depth > limits::MAX_DIRECTORY_DEPTH {
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
pub async fn move_entries(
    sources: Vec<String>,
    destination: String,
    config_state: State<'_, Arc<RwLock<crate::commands::config::SecurityConfig>>>,
) -> Result<(), String> {
    tracing::debug!(?sources, destination = %destination, "move_entries called");
    let config = config_state
        .read()
        .map_err(|_| "Failed to read security config")?
        .clone();
    run_blocking_fs(move || move_entries_sync_with_cfg(sources, destination, &config)).await
}

pub(crate) fn move_entries_sync_with_cfg(sources: Vec<String>, destination: String, cfg: &SecurityConfig) -> FsResult<()> {
    // Validate paths without following symlinks: moving should act on the object itself
    let validated_sources: Vec<PathBuf> = validate_paths_no_follow_sandboxed_with_cfg(&sources, cfg)?;
    let dest_path = validate_path_sandboxed_with_cfg(&destination, cfg)?;

    for src_path in validated_sources {
        let file_name = src_path.file_name().ok_or(FsError::InvalidPath)?;
        let target = dest_path.join(file_name);

        fs::rename(&src_path, &target).map_err(|_| FsError::Io)?;
    }
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn get_file_content(
    path: String,
    config_state: State<'_, Arc<RwLock<crate::commands::config::SecurityConfig>>>,
) -> Result<String, String> {
    let config = config_state
        .read()
        .map_err(|_| "Failed to read security config")?
        .clone();
    let content = run_blocking_fs(move || get_file_content_sync_with_cfg(path, &config)).await?;
    Ok(content)
}

pub(crate) fn get_file_content_sync_with_cfg(path: String, cfg: &SecurityConfig) -> FsResult<String> {
    let validated_path = validate_path_sandboxed_with_cfg(&path, cfg)?;
    let meta = fs::metadata(&validated_path).map_err(|_| FsError::Io)?;
    if meta.len() > MAX_CONTENT_SIZE {
        return Err(FsError::FileTooLarge);
    }
    fs::read_to_string(&validated_path).map_err(|_| FsError::Io)
}

#[tauri::command]
#[specta::specta]
pub async fn get_parent_path(
    path: String,
    config_state: State<'_, Arc<RwLock<crate::commands::config::SecurityConfig>>>,
) -> Result<Option<String>, String> {
    let config = config_state
        .read()
        .map_err(|_| "Failed to read security config")?
        .clone();
    let p_clone = path.clone();
    let r = run_blocking_fs(move || {
        let validated = validate_path_sandboxed_with_cfg(&p_clone, &config)?;
        Ok::<_, FsError>(validated.parent().map(|p| p.to_string_lossy().to_string()))
    }).await?;
    Ok(r)
}

#[tauri::command]
#[specta::specta]
pub async fn path_exists(
    path: String,
    config_state: State<'_, Arc<RwLock<crate::commands::config::SecurityConfig>>>,
) -> Result<bool, String> {
    let config = config_state
        .read()
        .map_err(|_| "Failed to read security config")?
        .clone();
    let p_clone = path.clone();
    let r = run_blocking_fs(move || {
        let validated = validate_path_sandboxed_with_cfg(&p_clone, &config)?;
        Ok::<_, FsError>(validated.exists())
    }).await?;
    Ok(r)
}

/// Parallel file copy with progress
#[tauri::command]
#[specta::specta]
pub async fn copy_entries_parallel(
    sources: Vec<String>,
    destination: String,
    app: AppHandle,
    config_state: State<'_, Arc<RwLock<crate::commands::config::SecurityConfig>>>,
) -> Result<(), String> {
    // Валидация путей: use sandboxed validation (no follow for sources)
    let config = config_state
        .read()
        .map_err(|_| "Failed to read security config")?
        .clone();
    let validated_sources: Vec<PathBuf> = validate_paths_no_follow_sandboxed_with_cfg(&sources, &config).map_err(|e| e.to_public_string())?;
    let validated_dest = validate_path_sandboxed_with_cfg(&destination, &config).map_err(|e| e.to_public_string())?;

    let total = validated_sources.len();
    if total == 0 {
        return Ok(());
    }

    let parallelism = std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(4)
        .clamp(1, 16);

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

            let current = counter.fetch_add(1, Ordering::Relaxed);
            // Throttle progress events to avoid overwhelming the UI: emit every 5th file and the final file
            if current + 1 == total || (current + 1).is_multiple_of(5) {
                let _ = app.emit(
                    "copy-progress",
                    CopyProgress {
                        current: current + 1,
                        total,
                        file: source_str,
                    },
                );
            }

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

/// Stream directory entries in batches for large directories
#[tauri::command]
#[specta::specta]
pub async fn read_directory_stream(
    path: String,
    app: AppHandle,
    config_state: State<'_, Arc<RwLock<crate::commands::config::SecurityConfig>>>,
) -> Result<(), String> {
    let path_clone = path.clone();
    let config = config_state
        .read()
        .map_err(|_| "Failed to read security config")?
        .clone();

    run_blocking_fs(move || {
        // Validate incoming path inside blocking context (canonicalize can hit disk).
        let validated_path = validate_path_sandboxed_with_cfg(&path_clone, &config)?;
        let dir_path = validated_path.as_path();
        let read_dir = fs::read_dir(dir_path).map_err(|_| FsError::ReadDirectoryFailed)?;

        let mut batch = Vec::with_capacity(limits::STREAM_BATCH_SIZE);

        for entry in read_dir.flatten() {
            if let Some(file_entry) = entry_to_file_entry(&entry) {
                batch.push(file_entry);

                // Emit in batches
                if batch.len() >= limits::STREAM_BATCH_SIZE {
                    let _ = app.emit("directory-batch", &batch);
                    batch.clear();
                }
            }
        }

        // Remainder
        if !batch.is_empty() {
            let _ = app.emit("directory-batch", &batch);
        }

        let _ = app.emit("directory-complete", &path_clone);
        Ok::<_, FsError>(())
    }).await?;

    Ok(())
}

fn entry_to_file_entry(entry: &fs::DirEntry) -> Option<FileEntry> {
    let entry_path = entry.path();
    let metadata = entry.metadata().ok()?;

    let name_str = entry_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();
    let name = name_str.clone().into_boxed_str();
    let name_lower = name_str.to_lowercase().into_boxed_str();

    let extension = entry_path
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_lowercase());

    Some(FileEntry {
        name,
        name_lower,
        path: entry_path.to_string_lossy().to_string().into_boxed_str(),
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

    #[test]
    fn read_directory_contains_name_lower() {
        let dir = tempdir().unwrap();
        let p = dir.path();
        let file_path = p.join("AbC.txt");
        fs::File::create(&file_path).unwrap();

        let cfg = crate::commands::config::SecurityConfig::default_windows();
        let entries = read_directory_sync_with_cfg(p.to_string_lossy().to_string(), &cfg).unwrap();
        let found = entries.into_iter().find(|e| e.path.ends_with("AbC.txt"));
        assert!(found.is_some());
        let e = found.unwrap();
        assert_eq!(e.name_lower.as_ref(), "abc.txt");
    }

    #[tokio::test]
    async fn get_drives_should_succeed() {
        let res = get_drives().await;
        assert!(res.is_ok());
        let _v = res.unwrap();
    }

    #[cfg(windows)]
    #[tokio::test]
    async fn get_drives_should_have_label() {
        let res = get_drives().await;
        assert!(res.is_ok());
        let v = res.unwrap();
        assert!(!v.is_empty());
        // At least one drive should have a label (volume name) or name set
        let any_label = v.iter().any(|d| d.label.is_some() || !d.name.is_empty());
        assert!(any_label);
    }
}
