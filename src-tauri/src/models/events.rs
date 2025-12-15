//! Event payload models.

use serde::{Deserialize, Serialize};
use specta::Type;

/// Progress information for copy operations.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct CopyProgress {
    pub current: u32,
    pub total: u32,
    pub file: String,
}

/// Filesystem change event from the watcher.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct FsChangeEvent {
    pub kind: String,
    pub paths: Vec<String>,
}