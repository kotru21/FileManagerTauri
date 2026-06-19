//! Utility functions for file operations.

use std::fs;
use std::path::{Component, Path};
use std::time::SystemTime;

use crate::error::{FileManagerError, Result};

/// Validates an absolute filesystem path for use in destructive/read commands.
///
/// Security: rejects empty, relative, and filesystem root paths.
pub fn validate_absolute_path(path: &str) -> Result<()> {
    if path.is_empty() {
        return Err(FileManagerError::EmptyPath);
    }

    let entry_path = Path::new(path);

    if !entry_path.is_absolute() {
        return Err(FileManagerError::NotAbsolutePath(path.to_string()));
    }

    let has_normal_component = entry_path
        .components()
        .any(|c| matches!(c, Component::Normal(_)));
    if !has_normal_component {
        return Err(FileManagerError::InvalidPath(format!(
            "Refusing root path: {path}"
        )));
    }

    Ok(())
}

/// Copies a symlink from `src` to `dst` without following it.
pub fn copy_symlink(src: &Path, dst: &Path) -> Result<()> {
    let target = fs::read_link(src)
        .map_err(|e| FileManagerError::CopyError(format!("read_link: {e}")))?;
    symlink_file(&target, dst)
}

#[cfg(unix)]
fn symlink_file(target: &Path, dst: &Path) -> Result<()> {
    std::os::unix::fs::symlink(target, dst)
        .map_err(|e| FileManagerError::CopyError(format!("symlink: {e}")))
}

#[cfg(windows)]
fn symlink_file(target: &Path, dst: &Path) -> Result<()> {
    use std::os::windows::fs::symlink_file;
    symlink_file(target, dst)
        .map_err(|e| FileManagerError::CopyError(format!("symlink: {e}")))
}

/// Converts `SystemTime` to Unix timestamp (seconds since epoch).
#[inline]
pub fn system_time_to_timestamp(time: SystemTime) -> Option<i64> {
    time.duration_since(SystemTime::UNIX_EPOCH)
        .ok()
        .map(|d| d.as_secs() as i64)
}

/// Checks if a file is hidden (platform-specific).
///
/// On Windows, checks the hidden file attribute.
/// On Unix-like systems, checks if the filename starts with a dot.
pub fn is_hidden(path: &Path) -> bool {
    #[cfg(windows)]
    {
        use crate::constants::FILE_ATTRIBUTE_HIDDEN;
        use std::os::windows::fs::MetadataExt;

        if let Ok(metadata) = path.metadata() {
            return metadata.file_attributes() & FILE_ATTRIBUTE_HIDDEN != 0;
        }
    }

    path.file_name()
        .and_then(|n| n.to_str())
        .map(|n| n.starts_with('.'))
        .unwrap_or(false)
}

/// Extracts file extension as a lowercase string.
#[inline]
pub fn get_extension(path: &Path) -> Option<String> {
    path.extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_lowercase())
}

/// Gets the filename from a path as a string.
#[inline]
pub fn get_filename(path: &Path) -> String {
    path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string()
}

// /// Checks if an extension is in the allowed list (case-insensitive).
// pub fn extension_matches(ext: Option<&str>, allowed: &[String]) -> bool {
//     match ext {
//         Some(e) => allowed.iter().any(|a| a.eq_ignore_ascii_case(e)),
//         None => false,
//     }
// }
