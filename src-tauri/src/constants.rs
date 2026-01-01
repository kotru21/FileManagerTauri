//! Application-wide constants for the file manager.

/// Maximum file size for content search (4 MB).
pub const MAX_SEARCH_FILE_SIZE: u64 = 4 * 1024 * 1024;

/// Maximum file size for preview (5 MB).
pub const MAX_PREVIEW_FILE_SIZE: usize = 5_000_000;

/// Maximum file size allowed for thumbnail generation (25 MB).
///
/// This is a safety and performance limit to avoid decoding extremely large files.
pub const MAX_THUMBNAIL_FILE_SIZE: u64 = 25 * 1024 * 1024;

/// Maximum pixel count allowed for thumbnail generation (100 MP).
///
/// This is a safety limit against decompression bombs / pathological images.
pub const MAX_THUMBNAIL_PIXELS: u64 = 100_000_000;

/// Minimum and maximum allowed thumbnail side requested by the UI.
pub const MIN_THUMBNAIL_SIDE: u32 = 16;
pub const MAX_THUMBNAIL_SIDE: u32 = 512;

/// Maximum text preview length in characters.
pub const MAX_TEXT_PREVIEW_LENGTH: usize = 10_000;

/// Batch size for directory streaming.
pub const DIRECTORY_BATCH_SIZE: usize = 100;

/// Maximum depth for recursive search.
pub const MAX_SEARCH_DEPTH: usize = 10;

/// Default maximum search results.
pub const DEFAULT_MAX_SEARCH_RESULTS: usize = 500;

/// Maximum content matches per file.
pub const MAX_CONTENT_MATCHES_PER_FILE: usize = 10;

/// Progress update interval for search (every N files).
pub const SEARCH_PROGRESS_INTERVAL: usize = 100;

/// Windows hidden file attribute flag.
#[cfg(windows)]
pub const FILE_ATTRIBUTE_HIDDEN: u32 = 0x2;

/// Text file extensions for preview.
pub const TEXT_EXTENSIONS: &[&str] = &[
    "txt", "md", "json", "xml", "html", "css", "js", "ts", "tsx", "jsx", "rs", "py", "go", "java",
    "c", "cpp", "h", "hpp", "toml", "yaml", "yml", "ini", "cfg", "conf", "sh", "bat", "ps1", "log",
    "csv",
];

/// Image extensions for preview.
pub const IMAGE_EXTENSIONS: &[&str] = &["png", "jpg", "jpeg", "gif", "bmp", "webp", "ico"];
