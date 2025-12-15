//! Data models for the file manager.

mod file_entry;
mod drive_info;
mod search;
mod preview;
mod events;

pub use file_entry::FileEntry;
pub use drive_info::DriveInfo;
pub use search::{ContentMatch, SearchOptions, SearchProgress, SearchResult};
pub use preview::FilePreview;
pub use events::{CopyProgress, FsChangeEvent};