//! Drive information model.

use serde::{Deserialize, Serialize};
use specta::Type;

/// Represents a drive/volume on the system.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct DriveInfo {
    pub name: String,
    pub path: String,
    pub total_space: u64,
    pub free_space: u64,
    pub drive_type: String,
}