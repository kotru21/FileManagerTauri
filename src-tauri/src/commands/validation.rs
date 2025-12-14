//! Path validation and security sandboxing.
//!
//! All filesystem operations must validate paths through this module
//! to ensure security constraints are met.

use super::config::SecurityConfig;
use super::error::{FsError, FsResult};
use glob::Pattern;
use std::ffi::OsStr;
use std::path::{Component, Path, PathBuf};

/// Validate and canonicalize an absolute path.
///
/// # Errors
/// - `PathNotAbsolute` if path is relative
/// - `InvalidPath` if path cannot be canonicalized
pub fn validate_path(path: &str) -> FsResult<PathBuf> {
    let path_buf = PathBuf::from(path);

    if !path_buf.is_absolute() {
        return Err(FsError::PathNotAbsolute);
    }

    // Check for path traversal attempts before canonicalization
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
///
/// Used for operations that should act on the symlink itself (delete, rename).
pub fn validate_path_no_follow(path: &str) -> FsResult<PathBuf> {
    let path_buf = PathBuf::from(path);

    if !path_buf.is_absolute() {
        return Err(FsError::PathNotAbsolute);
    }

    // Check for path traversal attempts
    if has_traversal_components(&path_buf) {
        return Err(FsError::InvalidPath);
    }

    // Ensure path exists without following symlinks
    std::fs::symlink_metadata(&path_buf).map_err(|_| FsError::InvalidPath)?;

    Ok(normalize_windows_path(path_buf))
}

/// Validate path and check against security sandbox.
pub fn validate_sandboxed(path: &str, config: &SecurityConfig) -> FsResult<PathBuf> {
    let canonical = validate_path(path)?;
    check_sandbox(&canonical, config)?;
    Ok(canonical)
}

/// Validate path without following symlinks and check sandbox.
pub fn validate_sandboxed_no_follow(path: &str, config: &SecurityConfig) -> FsResult<PathBuf> {
    let path_buf = validate_path_no_follow(path)?;
    check_sandbox(&path_buf, config)?;
    Ok(path_buf)
}

/// Validate multiple paths with sandboxing (no symlink follow).
pub fn validate_paths_sandboxed(
    paths: &[String],
    config: &SecurityConfig,
) -> FsResult<Vec<PathBuf>> {
    paths
        .iter()
        .map(|p| validate_sandboxed_no_follow(p, config))
        .collect()
}

/// Check for path traversal components.
fn has_traversal_components(path: &Path) -> bool {
    path.components().any(|c| matches!(c, Component::ParentDir))
}

/// Check if a path is within the security sandbox.
fn check_sandbox(path: &Path, config: &SecurityConfig) -> FsResult<()> {
    let normalized_path = normalize_windows_path(path.to_path_buf());

    // Check allowed roots
    let in_allowed = config.allowed_roots.iter().any(|root| {
        let normalized_root = normalize_windows_path(root.clone());
        normalized_path.starts_with(&normalized_root)
    });

    if !in_allowed {
        tracing::debug!(
            path = %normalized_path.display(),
            roots = ?config.allowed_roots,
            "Path not in allowed roots"
        );
        return Err(FsError::AccessDenied);
    }

    // Check denied patterns
    let path_str = normalized_path.to_string_lossy();
    for pattern in &config.denied_patterns {
        if let Ok(pat) = Pattern::new(pattern) {
            if pat.matches(&path_str) {
                tracing::debug!(
                    path = %normalized_path.display(),
                    pattern = %pattern,
                    "Path matches denied pattern"
                );
                return Err(FsError::AccessDenied);
            }
        }
    }

    Ok(())
}

/// Validate a filename component (no path separators or traversal).
pub fn validate_filename(name: &OsStr) -> FsResult<()> {
    let s = name.to_string_lossy();

    if s.is_empty() {
        return Err(FsError::InvalidName);
    }

    // Reject traversal attempts
    if s == "." || s == ".." {
        return Err(FsError::InvalidName);
    }

    // Reject path separators
    if s.contains('/') || s.contains('\\') {
        return Err(FsError::InvalidName);
    }

    // Reject null bytes
    if s.contains('\0') {
        return Err(FsError::InvalidName);
    }

    // Platform-specific validation
    #[cfg(windows)]
    validate_windows_name(&s)?;

    Ok(())
}

#[cfg(windows)]
fn validate_windows_name(name: &str) -> FsResult<()> {
    // Reject Windows ADS (Alternate Data Streams)
    if name.contains(':') {
        return Err(FsError::InvalidName);
    }

    // Reserved characters on Windows
    const INVALID_CHARS: [char; 7] = ['<', '>', '"', '|', '?', '*', ':'];
    if name.chars().any(|c| INVALID_CHARS.contains(&c)) {
        return Err(FsError::InvalidName);
    }

    // Reserved names on Windows
    const RESERVED: [&str; 22] = [
        "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8",
        "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
    ];

    let base_name = name.split('.').next().unwrap_or(name);
    let upper = base_name.trim_end_matches([' ', '.']).to_ascii_uppercase();

    if RESERVED.contains(&upper.as_str()) {
        return Err(FsError::InvalidName);
    }

    // Names cannot end with space or dot on Windows
    if name.ends_with(' ') || name.ends_with('.') {
        return Err(FsError::InvalidName);
    }

    Ok(())
}

/// Normalize path for consistent handling.
/// On Windows, removes the extended-length path prefix (\\?\).
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

/// Check if a path is hidden.
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

/// Check if metadata indicates a Windows reparse point (symlink, junction, etc.).
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

/// Check if a file type represents a symlink or reparse point.
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
        assert!(validate_filename(OsStr::new("foo\\bar")).is_err());
    }

    #[test]
    fn validate_filename_accepts_normal() {
        assert!(validate_filename(OsStr::new("file.txt")).is_ok());
        assert!(validate_filename(OsStr::new(".hidden")).is_ok());
        assert!(validate_filename(OsStr::new("file with spaces.txt")).is_ok());
    }

    #[cfg(windows)]
    #[test]
    fn validate_filename_rejects_reserved() {
        assert!(validate_filename(OsStr::new("CON")).is_err());
        assert!(validate_filename(OsStr::new("COM1.txt")).is_err());
        assert!(validate_filename(OsStr::new("file:stream")).is_err());
    }

    #[test]
    fn sandbox_check_works() {
        let dir = tempdir().unwrap();
        let config = SecurityConfig {
            allowed_roots: vec![dir.path().to_path_buf()],
            denied_patterns: vec![],
        };

        let result = validate_sandboxed(&dir.path().to_string_lossy(), &config);
        assert!(result.is_ok());
    }
}