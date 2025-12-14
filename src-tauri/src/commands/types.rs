//! Common data types for file operations.

use serde::{Deserialize, Serialize};
use specta::Type;
use std::fs;
use std::path::Path;
use std::time::SystemTime;

use super::validation::is_hidden;

/// Represents a file or directory entry.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct FileEntry {
    pub name: Box<str>,
    pub name_lower: Box<str>,
    pub path: Box<str>,
    pub is_dir: bool,
    pub is_hidden: bool,
    pub size: u64,
    pub modified: Option<i64>,
    pub created: Option<i64>,
    pub extension: Option<String>,
}

impl FileEntry {
    /// Create a FileEntry from a directory entry.
    pub fn from_dir_entry(entry: &fs::DirEntry) -> Option<Self> {
        let path = entry.path();
        let metadata = entry.metadata().ok()?;
        let name = path.file_name()?.to_str()?.to_string();

        Some(Self {
            name_lower: name.to_lowercase().into_boxed_str(),
            name: name.into_boxed_str(),
            path: path.to_string_lossy().into_owned().into_boxed_str(),
            is_dir: metadata.is_dir(),
            is_hidden: is_hidden(&path),
            size: if metadata.is_file() {
                metadata.len()
            } else {
                0
            },
            modified: to_timestamp(metadata.modified().ok()),
            created: to_timestamp(metadata.created().ok()),
            extension: path
                .extension()
                .and_then(|e| e.to_str())
                .map(|s| s.to_lowercase()),
        })
    }

    /// Create a FileEntry from a path with metadata.
    #[allow(dead_code)]
    pub fn from_path(path: &Path, metadata: &fs::Metadata) -> Option<Self> {
        let name = path.file_name()?.to_str()?.to_string();

        Some(Self {
            name_lower: name.to_lowercase().into_boxed_str(),
            name: name.into_boxed_str(),
            path: path.to_string_lossy().into_owned().into_boxed_str(),
            is_dir: metadata.is_dir(),
            is_hidden: is_hidden(path),
            size: if metadata.is_file() {
                metadata.len()
            } else {
                0
            },
            modified: to_timestamp(metadata.modified().ok()),
            created: to_timestamp(metadata.created().ok()),
            extension: path
                .extension()
                .and_then(|e| e.to_str())
                .map(|s| s.to_lowercase()),
        })
    }
}

/// Information about a drive/volume.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct DriveInfo {
    pub name: String,
    pub path: String,
    pub total_space: u64,
    pub free_space: u64,
    pub drive_type: String,
    pub label: Option<String>,
}

/// Statistics about a directory.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct DirectoryStats {
    pub count: usize,
    pub exceeded_threshold: bool,
}

/// Progress information for copy operations.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct CopyProgress {
    pub current: usize,
    pub total: usize,
    pub file: String,
}

/// Convert SystemTime to Unix timestamp.
pub fn to_timestamp(time: Option<SystemTime>) -> Option<i64> {
    time?.duration_since(SystemTime::UNIX_EPOCH)
        .ok()
        .map(|d| d.as_secs() as i64)
}