//! Copy and move operations for files and directories.

use crate::commands::config::limits;
use crate::commands::error::{FsError, FsResult};
use crate::commands::types::CopyProgress;
use crate::commands::validation::{is_link_like, validate_path, validate_paths};

use super::run_blocking;
use std::collections::VecDeque;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use tauri::async_runtime::spawn_blocking;
use tauri::{AppHandle, Emitter};
use tokio::task::JoinSet;
use tracing::instrument;

#[tauri::command]
#[specta::specta]
#[instrument]
pub async fn copy_entries(sources: Vec<String>, destination: String) -> Result<(), String> {
    run_blocking(move || copy_entries_sync(sources, &destination)).await
}

pub fn copy_entries_sync(sources: Vec<String>, destination: &str) -> FsResult<()> {
    let validated_sources = validate_paths(&sources)?;
    let dest_path = validate_path(destination)?;
    if !dest_path.exists() {
        return Err(FsError::NotFound);
    }
    if !dest_path.is_dir() {
        return Err(FsError::InvalidPath);
    }
    for src in validated_sources {
        let name = src.file_name().ok_or(FsError::InvalidPath)?;
        let target = dest_path.join(name);
        let meta = fs::symlink_metadata(&src)?;
        if is_link_like(&meta) {
            tracing::debug!(path = %src.display(), "Skipping symlink/reparse point");
            continue;
        }
        if meta.is_dir() {
            copy_dir_iterative(&src, &target)?;
        } else {
            if src == target {
                continue;
            }
            fs::copy(&src, &target)?;
        }
        tracing::debug!(src = %src.display(), dst = %target.display(), "Entry copied");
    }
    Ok(())
}

#[tauri::command]
#[specta::specta]
#[instrument(skip(app))]
pub async fn copy_entries_parallel(
    sources: Vec<String>,
    destination: String,
    app: AppHandle,
) -> Result<(), String> {
    let validated_sources = validate_paths(&sources).map_err(|e| e.to_public_string())?;
    let dest_path = validate_path(&destination).map_err(|e| e.to_public_string())?;
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
        let permit = sem.clone().acquire_owned().await.map_err(|_| FsError::Internal.to_public_string())?;
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
            if current == total || current.is_multiple_of(5) {
                let _ = app.emit("copy-progress", CopyProgress { current, total, file: src_str });
            }
            result
        });
    }
    while let Some(result) = tasks.join_next().await {
        result.map_err(|_| FsError::Internal.to_public_string())?.map_err(|e| e.to_public_string())?;
    }
    Ok(())
}

#[tauri::command]
#[specta::specta]
#[instrument]
pub async fn move_entries(sources: Vec<String>, destination: String) -> Result<(), String> {
    run_blocking(move || move_entries_sync(sources, &destination)).await
}

fn move_entries_sync(sources: Vec<String>, destination: &str) -> FsResult<()> {
    let validated_sources = validate_paths(&sources)?;
    let dest_path = validate_path(destination)?;
    if !dest_path.exists() {
        return Err(FsError::NotFound);
    }
    if !dest_path.is_dir() {
        return Err(FsError::InvalidPath);
    }
    for src in validated_sources {
        let name = src.file_name().ok_or(FsError::InvalidPath)?;
        let target = dest_path.join(name);
        if src == target {
            continue;
        }
        if target.exists() {
            tracing::warn!(src = %src.display(), target = %target.display(), "Target already exists, skipping");
            continue;
        }
        match fs::rename(&src, &target) {
            Ok(()) => {
                tracing::debug!(src = %src.display(), dst = %target.display(), "Entry moved");
            }
            Err(e) => {
                #[cfg(unix)]
                if e.raw_os_error() == Some(libc::EXDEV) {
                    copy_single_entry(&src, &dest_path)?;
                    fs::remove_dir_all(&src)?;
                    continue;
                }
                #[cfg(windows)]
                if e.raw_os_error() == Some(17) {
                    copy_single_entry(&src, &dest_path)?;
                    if src.is_dir() {
                        fs::remove_dir_all(&src)?;
                    } else {
                        fs::remove_file(&src)?;
                    }
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