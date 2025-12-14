//! Write operations for creating files and directories.

use crate::commands::config::SecurityConfig;
use crate::commands::error::{FsError, FsResult};
use crate::commands::validation::{validate_filename, validate_sandboxed, validate_sandboxed_no_follow};
use crate::commands::{ConfigExt, SecurityConfigState};

use super::run_blocking;
use std::fs;
use std::path::Path;
use tauri::State;
use tracing::instrument;

/// Create a new directory.
#[tauri::command]
#[specta::specta]
#[instrument(skip(config_state))]
pub async fn create_directory(
    path: String,
    config_state: State<'_, SecurityConfigState>,
) -> Result<(), String> {
    let config = config_state.get_config()?;
    run_blocking(move || create_directory_sync(&path, &config)).await
}

fn create_directory_sync(path: &str, config: &SecurityConfig) -> FsResult<()> {
    if path.is_empty() {
        return Err(FsError::InvalidPath);
    }

    let p = Path::new(path);
    let parent = p.parent().ok_or(FsError::InvalidPath)?;
    let name = p.file_name().ok_or(FsError::InvalidName)?;

    validate_filename(name)?;
    let validated_parent = validate_sandboxed(&parent.to_string_lossy(), config)?;
    let new_path = validated_parent.join(name);

    fs::create_dir_all(&new_path)?;
    tracing::debug!(path = %new_path.display(), "Directory created");

    Ok(())
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
    run_blocking(move || create_file_sync(&path, &config)).await
}

fn create_file_sync(path: &str, config: &SecurityConfig) -> FsResult<()> {
    if path.is_empty() {
        return Err(FsError::InvalidPath);
    }

    let p = Path::new(path);
    let parent = p.parent().ok_or(FsError::InvalidPath)?;
    let name = p.file_name().ok_or(FsError::InvalidName)?;

    validate_filename(name)?;
    let validated_parent = validate_sandboxed(&parent.to_string_lossy(), config)?;
    let new_path = validated_parent.join(name);

    // Create parent directories if needed
    if let Some(parent) = new_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)?;
        }
    }

    // Check if file already exists
    if new_path.exists() {
        return Err(FsError::AlreadyExists);
    }

    fs::File::create(&new_path)?;
    tracing::debug!(path = %new_path.display(), "File created");

    Ok(())
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
    run_blocking(move || rename_entry_sync(&old_path, &new_name, &config)).await
}

fn rename_entry_sync(old_path: &str, new_name: &str, config: &SecurityConfig) -> FsResult<String> {
    validate_filename(std::ffi::OsStr::new(new_name))?;

    let validated_old = validate_sandboxed_no_follow(old_path, config)?;
    let parent = validated_old.parent().ok_or(FsError::InvalidPath)?;

    // Ensure parent is still in sandbox
    validate_sandboxed(&parent.to_string_lossy(), config)?;

    let new_path = parent.join(new_name);

    // Check if target already exists
    if new_path.exists() {
        return Err(FsError::AlreadyExists);
    }

    fs::rename(&validated_old, &new_path)?;

    tracing::debug!(
        old = %validated_old.display(),
        new = %new_path.display(),
        "Entry renamed"
    );

    Ok(new_path.to_string_lossy().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::commands::config::SecurityConfig;
    use tempfile::tempdir;

    #[test]
    fn create_and_rename_file() {
        let dir = tempdir().unwrap();
        let config = SecurityConfig::default().with_mounted_disks();

        let file_path = dir.path().join("test.txt");
        create_file_sync(&file_path.to_string_lossy(), &config).unwrap();
        assert!(file_path.exists());

        let new_path =
            rename_entry_sync(&file_path.to_string_lossy(), "renamed.txt", &config).unwrap();
        assert!(!file_path.exists());
        assert!(Path::new(&new_path).exists());
    }

    #[test]
    fn create_directory_nested() {
        let dir = tempdir().unwrap();
        let config = SecurityConfig::default().with_mounted_disks();

        let nested = dir.path().join("a").join("b").join("c");
        create_directory_sync(&nested.to_string_lossy(), &config).unwrap();
        assert!(nested.exists());
    }
}