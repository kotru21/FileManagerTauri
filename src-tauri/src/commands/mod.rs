//! Commands module - exposes all Tauri commands for the file manager.

pub mod config;
pub mod error;
pub mod file_ops;
pub mod preview;
pub mod search;
pub mod validation;
pub mod watcher;

// Re-export commands for lib.rs
pub use file_ops::{
    copy_entries, copy_entries_parallel, create_directory, create_file, delete_entries,
    get_directory_stats, get_drives, get_file_content, get_parent_path, move_entries, path_exists,
    read_directory, read_directory_stream, rename_entry, ConfigExt, SecurityConfigState,
};
pub use preview::get_file_preview;
pub use search::{search_by_name, search_content, search_files, search_files_stream};
pub use watcher::{unwatch_directory, watch_directory, WatcherState};