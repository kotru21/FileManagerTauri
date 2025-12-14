//! Copy and move operations for files and directories.

use crate::commands::config::{limits, ConfigExt, SecurityConfig, SecurityConfigState};
use crate::commands::error::{FsError, FsResult};
use crate::commands::file_ops::run_blocking;
use crate::commands::validation::{is_reparse_point, validate_paths_sandboxed, validate_sandboxed};
use serde::{Deserialize, Serialize};
use specta::Type;
use std::collections::VecDeque;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use tauri::async_runtime::spawn_blocking;
use tauri::{AppHandle, Emitter, State};
use tokio::task::JoinSet;
use tracing::instrument;

/// Progress information for copy operations.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct CopyProgress {
    pub current: usize,
    pub total: usize,
    pub file: String,
}

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
    run_blocking(move || copy_entries_sync(sources, &destination, &config)).await
}

pub fn copy_entries_sync(
    sources: Vec<String>,
    destination: &str,
    config: &SecurityConfig,
) -> FsResult<()> {
    let validated_sources = validate_paths_sandboxed(&sources, config)?;
    let dest_path = validate_sandboxed(destination, config)?;
    
    for src in validated_sources {
        let name = src.file_name().ok_or(FsError::InvalidPath)?;
        let target = dest_path.join(name);
        
        // Skip symlinks for security
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
    
    let validated_sources = validate_paths_sandboxed(&sources, &config)
        .map_err(|e| e.to_public_string())?;
    let dest_path = validate_sandboxed(&destination, &config)
        .map_err(|e| e.to_public_string())?;
    
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
        let permit = sem.clone().acquire_owned().await
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
            
            // Emit progress periodically
            if current == total || current % 5 == 0 {
                let _ = app.emit("copy-progress", CopyProgress {
                    current,
                    total,
                    file: src_str,
                });
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
    run_blocking(move || move_entries_sync(sources, &destination, &config)).await
}

fn move_entries_sync(
    sources: Vec<String>,
    destination: &str,
    config: &SecurityConfig,
) -> FsResult<()> {
    let validated_sources = validate_paths_sandboxed(&sources, config)?;
    let dest_path = validate_sandboxed(destination, config)?;
    
    for src in validated_sources {
        let name = src.file_name().ok_or(FsError::InvalidPath)?;
        let target = dest_path.join(name);
        
        fs::rename(&src, &target)?;
        tracing::debug!(src = %src.display(), dst = %target.display(), "Entry moved");
    }
    
    Ok(())
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

/// Iterative (non-recursive) directory copy to prevent stack overflow.
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
            
            // Skip symlinks and reparse points for security
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

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn copy_directory_structure() {
        let src = tempdir().unwrap();
        let dst = tempdir().unwrap();
        
        // Create nested structure
        fs::create_dir(src.path().join("sub")).unwrap();
        fs::File::create(src.path().join("file.txt")).unwrap();
        fs::File::create(src.path().join("sub/nested.txt")).unwrap();
        
        let target = dst.path().join("copied");
        copy_dir_iterative(src.path(), &target).unwrap();
        
        assert!(target.join("file.txt").exists());
        assert!(target.join("sub/nested.txt").exists());
    }

    #[test]
    fn copy_skips_symlinks() {
        let src = tempdir().unwrap();
        let dst = tempdir().unwrap();
        let outside = tempdir().unwrap();
        
        fs::write(outside.path().join("secret.txt"), "data").unwrap();
        
        #[cfg(unix)]
        std::os::unix::fs::symlink(outside.path(), src.path().join("link")).unwrap();
        #[cfg(windows)]
        std::os::windows::fs::symlink_dir(outside.path(), src.path().join("link")).unwrap();
        
        let config = SecurityConfig::default().with_mounted_disks();
        copy_entries_sync(
            vec![src.path().to_string_lossy().to_string()],
            &dst.path().to_string_lossy(),
            &config,
        ).unwrap();
        
        // Symlink should be skipped
        assert!(!dst.path().join("link").exists());
    }
}