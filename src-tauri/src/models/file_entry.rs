//! File entry model.

use serde::{Deserialize, Serialize};
use specta::Type;

use crate::utils::{get_extension, get_filename, is_hidden, system_time_to_timestamp};

/// Represents a file or directory entry in the filesystem.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub is_hidden: bool,
    pub size: u64,
    pub modified: Option<i64>,
    pub created: Option<i64>,
    pub extension: Option<String>,
}

impl FileEntry {
    /// Creates a new `FileEntry` from filesystem metadata.
    pub fn from_path(path: &std::path::Path, metadata: &std::fs::Metadata) -> Self {
        Self {
            name: get_filename(path),
            path: path.to_string_lossy().to_string(),
            is_dir: metadata.is_dir(),
            is_hidden: is_hidden(path),
            size: if metadata.is_file() {
                metadata.len()
            } else {
                0
            },
            modified: metadata.modified().ok().and_then(system_time_to_timestamp),
            created: metadata.created().ok().and_then(system_time_to_timestamp),
            extension: get_extension(path),
        }
    }
}
