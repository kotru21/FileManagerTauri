//! Copy and move operations for files and directories.

use crate::commands::config::{limits, SecurityConfig};
use crate::commands::error::{FsError, FsResult};
use crate::commands::types::CopyProgress;
use crate::commands::validation::{is_link_like, validate_paths_sandboxed, validate_sandboxed};
use crate::commands::{ConfigExt, SecurityConfigState};

use super::run_blocking;
use std::collections::VecDeque;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use tauri::async_runtime::spawn_blocking;
use tauri::{AppHandle, Emitter, State};
use tokio::task::JoinSet;
use tracing::instrument;

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

    // Ensure destination exists and is a directory
    if !dest_path.exists() {
        return Err(FsError::NotFound);
    }
    if !dest_path.is_dir() {
        return Err(FsError::InvalidPath);
    }

    for src in validated_sources {
        let name = src.file_name().ok_or(FsError::InvalidPath)?;
        let target = dest_path.join(name);

        // Get metadata without following symlinks
        let meta = fs::symlink_metadata(&src)?;

        // Skip symlinks and reparse points for security
        if is_link_like(&meta) {
            tracing::debug!(path = %src.display(), "Skipping symlink/reparse point");
            continue;
        }

        if meta.is_dir() {
            copy_dir_iterative(&src, &target)?;
        } else {
            // Check if we're copying to the same file
            if src == target {
                continue;
            }
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

            // Emit progress periodically
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
    run_blocking(move || move_entries_sync(sources, &destination, &config)).await
}

fn move_entries_sync(
    sources: Vec<String>,
    destination: &str,
    config: &SecurityConfig,
) -> FsResult<()> {
    let validated_sources = validate_paths_sandboxed(&sources, config)?;
    let dest_path = validate_sandboxed(destination, config)?;

    // Ensure destination exists and is a directory
    if !dest_path.exists() {
        return Err(FsError::NotFound);
    }
    if !dest_path.is_dir() {
        return Err(FsError::InvalidPath);
    }

    for src in validated_sources {
        let name = src.file_name().ok_or(FsError::InvalidPath)?;
        let target = dest_path.join(name);

        // Skip if source and target are the same
        if src == target {
            continue;
        }

        // Check if target already exists
        if target.exists() {
            tracing::warn!(
                src = %src.display(),
                target = %target.display(),
                "Target already exists, skipping"
            );
            continue;
        }

        // Try rename first (atomic, works on same filesystem)
        match fs::rename(&src, &target) {
            Ok(()) => {
                tracing::debug!(src = %src.display(), dst = %target.display(), "Entry moved");
            }
            Err(e) => {
                // If rename fails (cross-filesystem), fall back to copy + delete
                #[cfg(unix)]
                if e.raw_os_error() == Some(libc::EXDEV) {
                    copy_single_entry(&src, &dest_path)?;
                    fs::remove_dir_all(&src)?;
                    tracing::debug!(src = %src.display(), dst = %target.display(), "Entry moved (copy+delete)");
                    continue;
                }

                // On Windows, error 17 (ERROR_NOT_SAME_DEVICE) indicates cross-volume move
                #[cfg(windows)]
                if e.raw_os_error() == Some(17) {
                    copy_single_entry(&src, &dest_path)?;
                    if src.is_dir() {
                        fs::remove_dir_all(&src)?;
                    } else {
                        fs::remove_file(&src)?;
                    }
                    tracing::debug!(src = %src.display(), dst = %target.display(), "Entry moved (copy+delete)");
                    continue;
                }

                return Err(e.into());
            }
        }
    }

    Ok(())
}

fn copy_single_entry(src: &Path, dest: &Path) -> FsResult<()> {
    let name = src.file_name().ok_or(FsError::InvalidPath)?;
    let target = dest.join(name);

    let meta = fs::symlink_metadata(src)?;

    // Skip symlinks and reparse points
    if is_link_like(&meta) {
        return Ok(());
    }

    if meta.is_dir() {
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
            if is_link_like(&meta) {
                tracing::debug!(path = %src_path.display(), "Skipping symlink in copy");
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
        )
        .unwrap();

        // Symlink should be skipped, and the copied directory shouldn't contain the link
        let copied = dst.path().join(src.path().file_name().unwrap());
        assert!(!copied.join("link").exists());
    }

    #[test]
    fn move_within_same_filesystem() {
        let dir = tempdir().unwrap();
        let src_file = dir.path().join("source.txt");
        let dest_dir = dir.path().join("dest");

        fs::write(&src_file, "content").unwrap();
        fs::create_dir(&dest_dir).unwrap();

        let config = SecurityConfig::default().with_mounted_disks();
        move_entries_sync(
            vec![src_file.to_string_lossy().to_string()],
            &dest_dir.to_string_lossy(),
            &config,
        )
        .unwrap();

        assert!(!src_file.exists());
        assert!(dest_dir.join("source.txt").exists());
    }
}