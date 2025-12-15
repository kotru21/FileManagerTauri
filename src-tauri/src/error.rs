//! Centralized error handling for the file manager.

use serde::Serialize;
use thiserror::Error;

/// Application-level errors with descriptive messages.
#[derive(Error, Debug)]
pub enum FileManagerError {
    #[error("Directory not found: {0}")]
    DirectoryNotFound(String),

    #[error("Path is not a directory: {0}")]
    NotADirectory(String),

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

    #[error("Invalid path: {0}")]
    InvalidPath(String),

    #[error("Invalid source path")]
    InvalidSourcePath,

    #[error("Path must be absolute: {0}")]
    NotAbsolutePath(String),

    #[error("Empty path provided")]
    EmptyPath,

    #[error("Search path not found: {0}")]
    SearchPathNotFound(String),

    #[error("Join error: {0}")]
    JoinError(String),

    #[error("Watch error: {0}")]
    WatchError(String),

    #[error("Operation cancelled")]
    Cancelled,

    #[error("IO error: {0}")]
    IoError(String),
}

impl Serialize for FileManagerError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

impl From<FileManagerError> for String {
    fn from(err: FileManagerError) -> Self {
        err.to_string()
    }
}

impl From<std::io::Error> for FileManagerError {
    fn from(err: std::io::Error) -> Self {
        FileManagerError::IoError(err.to_string())
    }
}

/// Result type alias for file manager operations.
pub type Result<T> = std::result::Result<T, FileManagerError>;
