//! Write operations for creating files and directories.

use crate::commands::error::{FsError, FsResult};
use crate::commands::validation::{validate_filename, validate_path, validate_path_no_follow};

use super::run_blocking;
use std::fs;
use std::path::Path;
use tracing::instrument;

#[tauri::command]
#[specta::specta]
#[instrument]
pub async fn create_directory(path: String) -> Result<(), String> {
    run_blocking(move || create_directory_sync(&path)).await
}

fn create_directory_sync(path: &str) -> FsResult<()> {
    println!("=== create_directory_sync: {}", path);
    if path.is_empty() {
        println!("=== create_directory_sync: empty path");
        return Err(FsError::InvalidPath);
    }
    let p = Path::new(path);
    let parent = p.parent().ok_or(FsError::InvalidPath)?;
    let name = p.file_name().ok_or(FsError::InvalidName)?;
    validate_filename(name)?;

    // Try to validate parent path (canonicalize). If validation fails due to
    // permission issues or other reasons, fall back to a no-follow validation
    // which does not canonicalize the path. This helps on Windows where
    // canonicalize can fail with PermissionDenied even when creating a child
    // entry is allowed.
    let validated_parent = match validate_path(&parent.to_string_lossy()) {
        Ok(v) => {
            println!("=== validated parent (canonical): {:?}", v);
            v
        }
        Err(e) => {
            println!("=== validate_path failed for parent: {:?}, falling back to no-follow", e);
            // Try no-follow validation; propagate any error if it fails too
            crate::commands::validation::validate_path_no_follow(&parent.to_string_lossy())?
        }
    };

    let new_path = validated_parent.join(name);
    if let Err(e) = fs::create_dir_all(&new_path) {
        println!("=== fs::create_dir_all FAILED: {:?}", e);
        return Err(FsError::from(e));
    }
    tracing::debug!(path = %new_path.display(), "Directory created");
    println!("=== directory created: {:?}", new_path);
    Ok(())
}

#[tauri::command]
#[specta::specta]
#[instrument]
pub async fn create_file(path: String) -> Result<(), String> {
    run_blocking(move || create_file_sync(&path)).await
}

fn create_file_sync(path: &str) -> FsResult<()> {
    println!("=== create_file_sync: {}", path);
    if path.is_empty() {
        println!("=== create_file_sync: empty path");
        return Err(FsError::InvalidPath);
    }
    let p = Path::new(path);
    let parent = p.parent().ok_or(FsError::InvalidPath)?;
    let name = p.file_name().ok_or(FsError::InvalidName)?;
    validate_filename(name)?;

    let validated_parent = match validate_path(&parent.to_string_lossy()) {
        Ok(v) => {
            println!("=== validated parent (canonical): {:?}", v);
            v
        }
        Err(e) => {
            println!("=== validate_path failed for parent: {:?}, falling back to no-follow", e);
            crate::commands::validation::validate_path_no_follow(&parent.to_string_lossy())?
        }
    };

    let new_path = validated_parent.join(name);
    if let Some(parent) = new_path.parent() {
        if !parent.exists() {
            if let Err(e) = fs::create_dir_all(parent) {
                println!("=== fs::create_dir_all FAILED: {:?}", e);
                return Err(FsError::from(e));
            }
        }
    }
    if new_path.exists() {
        return Err(FsError::AlreadyExists);
    }
    if let Err(e) = fs::File::create(&new_path) {
        println!("=== fs::File::create FAILED: {:?}", e);
        return Err(FsError::from(e));
    }
    tracing::debug!(path = %new_path.display(), "File created");
    println!("=== file created: {:?}", new_path);
    Ok(())
}

#[tauri::command]
#[specta::specta]
#[instrument]
pub async fn rename_entry(old_path: String, new_name: String) -> Result<String, String> {
    run_blocking(move || rename_entry_sync(&old_path, &new_name)).await
}

fn rename_entry_sync(old_path: &str, new_name: &str) -> FsResult<String> {
    validate_filename(std::ffi::OsStr::new(new_name))?;
    let validated_old = validate_path_no_follow(old_path)?;
    let parent = validated_old.parent().ok_or(FsError::InvalidPath)?;
    let new_path = parent.join(new_name);
    if new_path.exists() {
        return Err(FsError::AlreadyExists);
    }
    fs::rename(&validated_old, &new_path)?;
    tracing::debug!(old = %validated_old.display(), new = %new_path.display(), "Entry renamed");
    Ok(new_path.to_string_lossy().to_string())
}