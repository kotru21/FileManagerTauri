//! Data models for the file manager.
//!
//! All models derive `specta::Type` for TypeScript binding generation.
//! Field names use snake_case to match existing frontend bindings.

use serde::{Deserialize, Serialize};
use specta::Type;

/// Represents a file or directory entry in the filesystem.
#[derive(Debug, Clone, Serialize, Type)]
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

/// Represents a drive/volume on the system.
#[derive(Debug, Clone, Serialize, Type)]
pub struct DriveInfo {
    pub name: String,
    pub path: String,
    pub total_space: u64,
    pub free_space: u64,
    pub drive_type: String,
}

/// Progress information for copy operations.
#[derive(Debug, Clone, Serialize, Type)]
pub struct CopyProgress {
    pub current: usize,
    pub total: usize,
    pub file: String,
}

/// A search result entry.
#[derive(Debug, Clone, Serialize, Type)]
pub struct SearchResult {
    pub path: String,
    pub name: String,
    pub is_dir: bool,
    pub matches: Vec<ContentMatch>,
}

/// A content match within a file (line-based).
#[derive(Debug, Clone, Serialize, Type)]
pub struct ContentMatch {
    pub line_number: u64,
    pub line_content: String,
    pub match_start: u64,
    pub match_end: u64,
}

/// Options for file search operations.
#[derive(Debug, Clone, Deserialize, Type)]
pub struct SearchOptions {
    pub query: String,
    pub search_path: String,
    pub search_content: bool,
    pub case_sensitive: bool,
    pub max_results: Option<u32>,
    pub file_extensions: Option<Vec<String>>,
}

/// Progress information for search operations.
#[derive(Debug, Clone, Serialize, Type)]
pub struct SearchProgress {
    pub scanned: usize,
    pub found: usize,
    pub current_path: String,
}

/// File preview content types.
#[derive(Debug, Clone, Serialize, Type)]
#[serde(tag = "type")]
pub enum FilePreview {
    Text { content: String, truncated: bool },
    Image { base64: String, mime: String },
    Unsupported { mime: String },
}

/// Filesystem change event from the watcher.
#[derive(Debug, Clone, Serialize, Type)]
pub struct FsChangeEvent {
    pub kind: String,
    pub paths: Vec<String>,
}

impl FileEntry {
    /// Creates a new `FileEntry` from filesystem metadata.
    pub fn from_path(path: &std::path::Path, metadata: &std::fs::Metadata) -> Self {
        use crate::utils::{get_extension, get_filename, is_hidden, system_time_to_timestamp};

        Self {
            name: get_filename(path),
            path: path.to_string_lossy().to_string(),
            is_dir: metadata.is_dir(),
            is_hidden: is_hidden(path),
            size: if metadata.is_file() { metadata.len() } else { 0 },
            modified: metadata.modified().ok().and_then(system_time_to_timestamp),
            created: metadata.created().ok().and_then(system_time_to_timestamp),
            extension: get_extension(path),
        }
    }
}