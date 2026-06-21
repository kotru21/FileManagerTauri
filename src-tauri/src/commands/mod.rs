//! Tauri command handlers.

pub mod file_ops;
pub mod preview;
pub mod search;
pub mod watcher;

/// Sync command implementations exposed for integration tests in `tests/`.
///
/// Integration tests are external crates; `#[cfg(test)]` is not enabled when the
/// library is built for them, so these re-exports are always available but hidden
/// from public docs.
#[doc(hidden)]
pub use file_ops::{
    copy_entries_sync, copy_single_entry_sync, create_directory_sync, create_file_sync,
    delete_entries_sync, get_file_content_sync, move_entries_sync, read_directory_sync,
    rename_entry_sync,
};
#[doc(hidden)]
pub use preview::{get_file_preview_sync, get_thumbnail_sync};
#[doc(hidden)]
pub use search::{search_by_name_sync, search_content_sync, search_files_sync};
#[doc(hidden)]
pub use watcher::unwatch_all_sync;
