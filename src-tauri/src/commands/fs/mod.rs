//! File system operations module.

mod copy_move;
mod delete;
mod read;
mod write;

use super::error::{FsError, FsResult};
use tauri::async_runtime::spawn_blocking;

pub use copy_move::{copy_entries, copy_entries_parallel, move_entries};
pub use delete::delete_entries;
pub use read::{
    get_directory_stats, get_drives, get_file_content, get_parent_path, path_exists,
    read_directory, read_directory_stream,
};
pub use write::{create_directory, create_file, rename_entry};

/// Execute a blocking filesystem operation on a dedicated thread pool.
pub async fn run_blocking<T, F>(f: F) -> Result<T, String>
where
    F: FnOnce() -> FsResult<T> + Send + 'static,
    T: Send + 'static,
{
    spawn_blocking(f)
        .await
        .map_err(|_| FsError::Internal.to_public_string())?
        .map_err(|e| e.to_public_string())
}