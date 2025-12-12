use std::io;

use thiserror::Error;

/// Backend error type for filesystem-related Tauri commands.
///
/// Design goals:
/// - Keep public error messages safe (avoid leaking absolute paths / OS details).
/// - Keep debug context available in debug builds.
#[derive(Debug, Error)]
pub enum FsError {
    #[error("Path must be absolute")]
    PathNotAbsolute,

    #[error("Invalid path")]
    InvalidPath,

    #[error("Invalid name")]
    InvalidName,


    #[error("Directory depth exceeds maximum allowed")]
    DirectoryTooDeep,

    #[error("I/O error")]
    Io,
    #[error("Access denied")]
    AccessDenied,

    #[error("Read directory failed")]
    ReadDirectoryFailed,

    #[error("File too large")]
    FileTooLarge,

    #[error("Internal error")]
    Internal,
}

impl FsError {
    /// Public-safe string for returning to the frontend.
    ///
    /// In release builds we intentionally avoid including absolute paths or raw OS errors.
    pub fn to_public_string(&self) -> String {
        // Keep it stable and localized on the frontend if desired.
        // Here we keep English to avoid mixing locales in backend.
        self.to_string()
    }
}

impl From<io::Error> for FsError {
    fn from(_value: io::Error) -> Self {
        FsError::Io
    }
}
