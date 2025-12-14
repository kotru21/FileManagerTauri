//! Path validation.

use super::error::{FsError, FsResult};
use std::ffi::OsStr;
use std::path::{Component, Path, PathBuf};

/// Validate and canonicalize an absolute path.
pub fn validate_path(path: &str) -> FsResult<PathBuf> {
    let path_buf = PathBuf::from(path);
    if !path_buf.is_absolute() {
        return Err(FsError::PathNotAbsolute);
    }
    if has_traversal_components(&path_buf) {
        return Err(FsError::InvalidPath);
    }
    let canonical = path_buf.canonicalize().map_err(|_| FsError::InvalidPath)?;
    if canonical.components().count() < 1 {
        return Err(FsError::InvalidPath);
    }
    Ok(normalize_windows_path(canonical))
}

/// Validate path without following symlinks.
pub fn validate_path_no_follow(path: &str) -> FsResult<PathBuf> {
    let path_buf = PathBuf::from(path);
    if !path_buf.is_absolute() {
        return Err(FsError::PathNotAbsolute);
    }
    if has_traversal_components(&path_buf) {
        return Err(FsError::InvalidPath);
    }
    std::fs::symlink_metadata(&path_buf).map_err(|_| FsError::InvalidPath)?;
    Ok(normalize_windows_path(path_buf))
}

/// Validate multiple paths.
pub fn validate_paths(paths: &[String]) -> FsResult<Vec<PathBuf>> {
    paths.iter().map(|p| validate_path_no_follow(p)).collect()
}

fn has_traversal_components(path: &Path) -> bool {
    path.components().any(|c| matches!(c, Component::ParentDir))
}

/// Validate a filename component.
pub fn validate_filename(name: &OsStr) -> FsResult<()> {
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
    if s.contains('\0') {
        return Err(FsError::InvalidName);
    }
    #[cfg(windows)]
    validate_windows_name(&s)?;
    Ok(())
}

#[cfg(windows)]
fn validate_windows_name(name: &str) -> FsResult<()> {
    if name.contains(':') {
        return Err(FsError::InvalidName);
    }
    const INVALID_CHARS: [char; 7] = ['<', '>', '"', '|', '?', '*', ':'];
    if name.chars().any(|c| INVALID_CHARS.contains(&c)) {
        return Err(FsError::InvalidName);
    }
    const RESERVED: [&str; 22] = [
        "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8",
        "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
    ];
    let base_name = name.split('.').next().unwrap_or(name);
    let upper = base_name.trim_end_matches([' ', '.']).to_ascii_uppercase();
    if RESERVED.contains(&upper.as_str()) {
        return Err(FsError::InvalidName);
    }
    if name.ends_with(' ') || name.ends_with('.') {
        return Err(FsError::InvalidName);
    }
    Ok(())
}

pub fn normalize_windows_path(path: PathBuf) -> PathBuf {
    #[cfg(windows)]
    {
        let path_str = path.to_string_lossy();
        if let Some(stripped) = path_str.strip_prefix(r"\\?\") {
            return PathBuf::from(stripped);
        }
    }
    path
}

pub fn is_hidden(path: &Path) -> bool {
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        const FILE_ATTRIBUTE_HIDDEN: u32 = 0x2;
        if let Ok(meta) = std::fs::metadata(path) {
            return meta.file_attributes() & FILE_ATTRIBUTE_HIDDEN != 0;
        }
    }
    path.file_name()
        .and_then(|n| n.to_str())
        .map(|n| n.starts_with('.'))
        .unwrap_or(false)
}

pub fn is_reparse_point(meta: &std::fs::Metadata) -> bool {
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

pub fn is_link_like(meta: &std::fs::Metadata) -> bool {
    if meta.file_type().is_symlink() {
        return true;
    }
    is_reparse_point(meta)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn validate_path_accepts_absolute() {
        let dir = tempdir().unwrap();
        let result = validate_path(&dir.path().to_string_lossy());
        assert!(result.is_ok());
    }

    #[test]
    fn validate_path_rejects_relative() {
        let result = validate_path("./relative/path");
        assert!(matches!(result, Err(FsError::PathNotAbsolute)));
    }

    #[test]
    fn validate_filename_rejects_traversal() {
        assert!(validate_filename(OsStr::new(".")).is_err());
        assert!(validate_filename(OsStr::new("..")).is_err());
        assert!(validate_filename(OsStr::new("foo/bar")).is_err());
    }

    #[test]
    fn validate_filename_accepts_normal() {
        assert!(validate_filename(OsStr::new("file.txt")).is_ok());
        assert!(validate_filename(OsStr::new(".hidden")).is_ok());
    }
}