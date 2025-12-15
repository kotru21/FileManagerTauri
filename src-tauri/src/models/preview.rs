//! File preview models.

use serde::{Deserialize, Serialize};
use specta::Type;

/// File preview content types.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(tag = "type")]
pub enum FilePreview {
    Text { content: String, truncated: bool },
    Image { base64: String, mime: String },
    Unsupported { mime: String },
}
