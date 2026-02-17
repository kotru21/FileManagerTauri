//! File preview models.

use serde::{Deserialize, Serialize};
use specta::Type;

/// File preview content types.
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(tag = "type")]
pub struct Thumbnail {
    pub base64: String,
    pub mime: String,
}

/// A paragraph extracted from a DOCX document.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct DocParagraph {
    pub text: String,
    /// Style hint: "heading1", "heading2", "heading3", "listItem", "normal"
    pub style: String,
}

/// A sheet extracted from an XLSX spreadsheet.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SpreadsheetSheet {
    pub name: String,
    pub headers: Vec<String>,
    pub rows: Vec<Vec<String>>,
    pub total_rows: u64,
    pub truncated: bool,
}

/// A slide extracted from a PPTX presentation.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct PresentationSlide {
    pub number: u32,
    pub title: Option<String>,
    pub texts: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(tag = "type")]
pub enum FilePreview {
    Text {
        content: String,
        truncated: bool,
    },
    Image {
        base64: String,
        mime: String,
    },
    Document {
        paragraphs: Vec<DocParagraph>,
        truncated: bool,
    },
    Spreadsheet {
        sheets: Vec<SpreadsheetSheet>,
    },
    Presentation {
        slides: Vec<PresentationSlide>,
    },
    Unsupported {
        mime: String,
    },
}
