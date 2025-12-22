//! File preview generation for text and images.

use std::fs;
use std::path::Path;

use base64::engine::general_purpose::STANDARD;
use base64::Engine;

use crate::constants::{
    IMAGE_EXTENSIONS, MAX_PREVIEW_FILE_SIZE, MAX_TEXT_PREVIEW_LENGTH, TEXT_EXTENSIONS,
};
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

/// Generates a thumbnail (resized image) as base64 with given max side length.
#[allow(dead_code)]
#[tauri::command]
#[specta::specta]
pub async fn get_thumbnail(
    path: String,
    max_side: u32,
) -> Result<crate::models::Thumbnail, String> {
    use image::imageops::FilterType;
    use image::io::Reader as ImageReader;

    let file_path = Path::new(&path);
    let _extension = get_extension(file_path).unwrap_or_default();

    // Try to open and decode image
    let img = ImageReader::open(path)
        .map_err(|e| e.to_string())?
        .decode()
        .map_err(|e| e.to_string())?;

    // Resize preserving aspect ratio to fit inside max_side x max_side
    let resized = img.resize(max_side, max_side, FilterType::Lanczos3);

    // Encode as PNG
    let mut buf: Vec<u8> = Vec::new();
    resized
        .write_to(
            &mut std::io::Cursor::new(&mut buf),
            image::ImageOutputFormat::Png,
        )
        .map_err(|e| e.to_string())?;

    let base64 = STANDARD.encode(&buf);
    let mime = "image/png".to_string();

    Ok(crate::models::Thumbnail { base64, mime })
}
