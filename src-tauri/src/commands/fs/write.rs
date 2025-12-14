//! Write operations for creating files and directories.

use crate::commands::error::{FsError, FsResult};
use crate::commands::validation::{validate_filename, validate_path, validate_path_no_follow};

use super::run_blocking;
use std::fs;
use std::path::PathBuf;
use tracing::instrument;

#[tauri::command]
#[specta::specta]
#[instrument(skip_all, fields(path = %path))]
pub async fn create_directory(path: String) -> Result<(), String> {
    run_blocking(move || create_directory_sync(&path)).await
}

fn create_directory_sync(path: &str) -> FsResult<()> {
    println!("=== create_directory_sync: {}", path);
    
    if path.is_empty() {
        println!("=== create_directory_sync: empty path");
        return Err(FsError::InvalidPath);
    }

    let p = PathBuf::from(path);
    let parent = p.parent().ok_or(FsError::InvalidPath)?;
    let name = p.file_name().ok_or(FsError::InvalidName)?;
    validate_filename(name)?;

    // Validate parent path with fallback to no-follow
    let validated_parent = validate_parent_path(parent)?;
    let new_path = validated_parent.join(name);

    // Check if directory already exists BEFORE attempting to create
    if new_path.exists() {
        println!("=== directory already exists: {:?}", new_path);
        return Err(FsError::AlreadyExists);
    }

    // Use create_dir instead of create_dir_all to avoid silent success on existing dirs
    fs::create_dir(&new_path).map_err(|e| {
        println!("=== fs::create_dir FAILED: {:?}", e);
        FsError::from(e)
    })?;

    println!("=== directory created: {:?}", new_path);
    Ok(())
}

#[tauri::command]
#[specta::specta]
#[instrument(skip_all, fields(path = %path))]
pub async fn create_file(path: String) -> Result<(), String> {
    run_blocking(move || create_file_sync(&path)).await
}

fn create_file_sync(path: &str) -> FsResult<()> {
    println!("=== create_file_sync: {}", path);

    if path.is_empty() {
        println!("=== create_file_sync: empty path");
        return Err(FsError::InvalidPath);
    }

    let p = PathBuf::from(path);
    let parent = p.parent().ok_or_else(|| {
        println!("=== create_file_sync: no parent directory");
        FsError::InvalidPath
    })?;
    let name = p.file_name().ok_or_else(|| {
        println!("=== create_file_sync: no file name");
        FsError::InvalidName
    })?;
    
    validate_filename(name)?;

    // Validate parent path with fallback to no-follow (same as create_directory)
    let validated_parent = validate_parent_path(parent)?;
    let new_path = validated_parent.join(name);

    // Check if file already exists
    if new_path.exists() {
        println!("=== file already exists: {:?}", new_path);
        return Err(FsError::AlreadyExists);
    }

    // Create the file using the validated path
    fs::File::create(&new_path).map_err(|e| {
        println!("=== fs::File::create FAILED: {:?}", e);
        FsError::from(e)
    })?;

    println!("=== file created: {:?}", new_path);
    Ok(())
}

/// Validate parent path with fallback to no-follow validation.
/// This is necessary because canonicalize() can fail with PermissionDenied
/// on some Windows drives even when creating child entries is allowed.
fn validate_parent_path(parent: &std::path::Path) -> FsResult<PathBuf> {
    let parent_str = parent.to_string_lossy();
    
    match validate_path(&parent_str) {
        Ok(v) => {
            println!("=== validated parent (canonical): {:?}", v);
            Ok(v)
        }
        Err(e) => {
            println!("=== validate_path failed for parent: {:?}, falling back to no-follow", e);
            
            // Try no-follow validation which doesn't canonicalize
            let validated = validate_path_no_follow(&parent_str).map_err(|e2| {
                println!("=== validate_path_no_follow also failed: {:?}", e2);
                e2
            })?;
            
            // Additionally verify the parent exists and is a directory
            if !validated.exists() {
                println!("=== parent does not exist: {:?}", validated);
                return Err(FsError::NotFound);
            }
            
            if !validated.is_dir() {
                println!("=== parent is not a directory: {:?}", validated);
                return Err(FsError::InvalidPath);
            }
            
            println!("=== validated parent (no-follow): {:?}", validated);
            Ok(validated)
        }
    }
}

#[tauri::command]
#[specta::specta]
#[instrument(skip_all, fields(old_path = %old_path, new_name = %new_name))]
pub async fn rename_entry(old_path: String, new_name: String) -> Result<String, String> {
    run_blocking(move || rename_entry_sync(&old_path, &new_name)).await
}

fn rename_entry_sync(old_path: &str, new_name: &str) -> FsResult<String> {
    validate_filename(std::ffi::OsStr::new(new_name))?;
    let validated_old = validate_path_no_follow(old_path)?;
    let parent = validated_old.parent().ok_or(FsError::InvalidPath)?;
    let new_path = parent.join(new_name);

    if new_path.exists() {
        println!("=== rename target already exists: {:?}", new_path);
        return Err(FsError::AlreadyExists);
    }

    fs::rename(&validated_old, &new_path).map_err(|e| {
        println!("=== fs::rename FAILED: {:?}", e);
        FsError::from(e)
    })?;

    println!("=== renamed {:?} to {:?}", validated_old, new_path);
    Ok(new_path.to_string_lossy().to_string())
}