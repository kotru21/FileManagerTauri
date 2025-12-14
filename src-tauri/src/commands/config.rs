//! Operational configuration for the file manager.

/// Operational limits to prevent resource exhaustion.
pub mod limits {
    /// Maximum directory traversal depth.
    pub const MAX_DIRECTORY_DEPTH: usize = 100;
    /// Batch size for streaming directory contents.
    pub const STREAM_BATCH_SIZE: usize = 100;
    /// Progress update interval for search operations.
    pub const SEARCH_PROGRESS_INTERVAL: usize = 100;
    /// Maximum entries to walk during search.
    pub const MAX_WALK_ENTRIES: usize = 200_000;
    /// Maximum characters for text preview.
    pub const MAX_PREVIEW_CHARS: usize = 10_000;
    /// Maximum image file size for preview (5 MB).
    pub const MAX_PREVIEW_IMAGE_BYTES: u64 = 5 * 1024 * 1024;
    /// Maximum file size for content reading (10 MB).
    pub const MAX_CONTENT_FILE_SIZE: u64 = 10 * 1024 * 1024;
    /// Maximum file size for content search (4 MB).
    pub const MAX_SEARCH_FILE_SIZE: u64 = 4 * 1024 * 1024;
    /// Default search depth.
    pub const DEFAULT_SEARCH_DEPTH: usize = 10;
    /// Maximum parallel copy operations.
    pub const MAX_PARALLEL_COPIES: usize = 16;
}