//! Centralized error handling for the file manager.

use serde::Serialize;
use thiserror::Error;

/// Application-level errors with descriptive messages.
#[derive(Debug, Error)]
pub enum FileManagerError {
    #[error("Directory does not exist: {0}")]
    DirectoryNotFound(String),

    #[error("Path is not a directory: {0}")]
    NotADirectory(String),

    #[error("Path must be absolute: {0}")]
    NotAbsolutePath(String),

    #[error("Path is empty")]
    EmptyPath,

    #[error("Invalid source path")]
    InvalidSourcePath,

    #[error("Invalid path: {0}")]
    InvalidPath(String),

    #[error("Search path does not exist: {0}")]
    SearchPathNotFound(String),

    #[error("Failed to read directory: {0}")]
    ReadDirError(String),

    #[error("Failed to create directory: {0}")]
    CreateDirError(String),

    #[error("Failed to create file: {0}")]
    CreateFileError(String),

    #[error("Failed to delete: {0}")]
    DeleteError(String),

    #[error("Failed to rename: {0}")]
    RenameError(String),

    #[error("Failed to copy: {0}")]
    CopyError(String),

    #[error("Failed to move: {0}")]
    MoveError(String),

    #[error("Failed to read file: {0}")]
    ReadFileError(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Task join error: {0}")]
    JoinError(String),

    #[error("Watcher error: {0}")]
    WatcherError(String),
}

impl Serialize for FileManagerError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

/// Converts `FileManagerError` to `String` for Tauri command compatibility.
impl From<FileManagerError> for String {
    fn from(err: FileManagerError) -> Self {
        err.to_string()
    }
}

/// Result type alias for file manager operations.
pub type Result<T> = std::result::Result<T, FileManagerError>;