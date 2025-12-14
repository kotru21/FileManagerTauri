//! Unified error handling for filesystem commands.
//!
//! Design principles:
//! - Public error messages are safe (no absolute paths or OS details in release)
//! - Full context available via Debug in development
//! - Serializable for frontend consumption

use serde::Serialize;
use specta::Type;
use std::io;
use thiserror::Error;

/// Backend error type for filesystem-related Tauri commands.
#[derive(Debug, Error, Serialize, Type)]
#[serde(tag = "code", content = "details")]
pub enum FsError {
    #[error("Path must be absolute")]
    PathNotAbsolute,

    #[error("Invalid path")]
    InvalidPath,

    #[error("Invalid name")]
    InvalidName,

    #[error("Directory depth exceeds maximum allowed")]
    DirectoryTooDeep,

    #[error("I/O error: {0}")]
    Io(String),

    #[error("Access denied")]
    AccessDenied,

    #[error("Read directory failed")]
    ReadDirectoryFailed,

    #[error("File too large")]
    FileTooLarge,

    #[error("Path not found")]
    NotFound,

    #[error("Already exists")]
    AlreadyExists,

    #[error("Internal error")]
    Internal,

    #[error("Operation cancelled")]
    Cancelled,
}

impl FsError {
    /// Create a public-safe error message for the frontend.
    /// In release builds, we avoid including absolute paths or raw OS errors.
    pub fn to_public_string(&self) -> String {
        match self {
            // In release, sanitize IO errors
            #[cfg(not(debug_assertions))]
            FsError::Io(_) => "I/O error".to_string(),
            _ => self.to_string(),
        }
    }

    /// Create an Io error with context
    pub fn io(msg: impl Into<String>) -> Self {
        FsError::Io(msg.into())
    }

    /// Create an Io error from std::io::Error
    pub fn from_io(err: io::Error) -> Self {
        #[cfg(debug_assertions)]
        {
            FsError::Io(err.to_string())
        }
        #[cfg(not(debug_assertions))]
        {
            let _ = err;
            FsError::Io("operation failed".to_string())
        }
    }
}

impl From<io::Error> for FsError {
    fn from(err: io::Error) -> Self {
        Self::from_io(err)
    }
}

impl From<notify::Error> for FsError {
    fn from(_: notify::Error) -> Self {
        FsError::Internal
    }
}

/// Result type alias for filesystem operations.
pub type FsResult<T> = Result<T, FsError>;

/// Convert FsError to a String suitable for Tauri command responses.
impl From<FsError> for String {
    fn from(err: FsError) -> Self {
        err.to_public_string()
    }
}