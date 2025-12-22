//! Data models for the file manager.

mod drive_info;
mod events;
mod file_entry;
mod preview;
mod search;

pub use drive_info::DriveInfo;
pub use events::{CopyProgress, FsChangeEvent};
pub use file_entry::FileEntry;
pub use preview::FilePreview;
pub use preview::Thumbnail;
pub use search::{ContentMatch, SearchOptions, SearchProgress, SearchResult};
