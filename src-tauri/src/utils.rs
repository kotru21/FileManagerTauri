//! Utility functions for file operations.

use std::path::Path;
use std::time::SystemTime;

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
