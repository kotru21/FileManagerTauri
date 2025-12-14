//! File preview generation for text and images.

use std::fs;
use std::path::Path;

use base64::engine::general_purpose::STANDARD;
use base64::Engine;

use crate::constants::{IMAGE_EXTENSIONS, MAX_PREVIEW_FILE_SIZE, MAX_TEXT_PREVIEW_LENGTH, TEXT_EXTENSIONS};
use crate::models::FilePreview;
use crate::utils::get_extension;

/// Generates a preview for a file.
#[tauri::command]
#[specta::specta]
pub async fn get_file_preview(path: String) -> Result<FilePreview, String> {
    let file_path = Path::new(&path);
    let extension = get_extension(file_path).unwrap_or_default();

    // Text files
    if TEXT_EXTENSIONS.contains(&extension.as_str()) {
        return generate_text_preview(&path);
    }

    // Image files
    if IMAGE_EXTENSIONS.contains(&extension.as_str()) {
        return generate_image_preview(&path, &extension);
    }

    // Unsupported file type
    let mime = mime_guess::from_path(&path)
        .first_or_octet_stream()
        .to_string();

    Ok(FilePreview::Unsupported { mime })
}

/// Generates a text preview with truncation.
fn generate_text_preview(path: &str) -> Result<FilePreview, String> {
    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let truncated = content.len() > MAX_TEXT_PREVIEW_LENGTH;

    Ok(FilePreview::Text {
        content: content.chars().take(MAX_TEXT_PREVIEW_LENGTH).collect(),
        truncated,
    })
}

/// Generates an image preview as base64.
fn generate_image_preview(path: &str, extension: &str) -> Result<FilePreview, String> {
    let bytes = fs::read(path).map_err(|e| e.to_string())?;

    // Limit preview size
    if bytes.len() > MAX_PREVIEW_FILE_SIZE {
        return Ok(FilePreview::Unsupported {
            mime: format!("image/{} (too large)", extension),
        });
    }

    let mime_type = match extension {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "gif" => "image/gif",
        "bmp" => "image/bmp",
        "webp" => "image/webp",
        "ico" => "image/x-icon",
        _ => "image/png",
    };

    Ok(FilePreview::Image {
        base64: STANDARD.encode(&bytes),
        mime: mime_type.to_string(),
    })
}