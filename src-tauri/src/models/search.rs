//! Search-related models.

use serde::{Deserialize, Serialize};
use specta::Type;

/// A search result entry.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SearchResult {
    pub path: String,
    pub name: String,
    pub is_dir: bool,
    pub matches: Vec<ContentMatch>,
}

/// A content match within a file (line-based).
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ContentMatch {
    pub line_number: u64,
    pub line_content: String,
    pub match_start: u64,
    pub match_end: u64,
}

/// Options for file search operations.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SearchOptions {
    pub query: String,
    pub search_path: String,
    pub search_content: bool,
    pub case_sensitive: bool,
    pub max_results: Option<u32>,
    pub file_extensions: Option<Vec<String>>,
}

/// Progress information for search operations.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SearchProgress {
    pub scanned: usize,
    pub found: usize,
    pub current_path: String,
}