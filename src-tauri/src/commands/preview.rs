//! File preview generation for text and images.

use std::fs;
use std::io::{BufRead, BufReader};
use std::path::Path;

use tauri::async_runtime::spawn_blocking;

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
    // All preview generation touches filesystem and may decode images.
    // Keep UI responsive by running it in a blocking thread.
    spawn_blocking(move || {
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
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Generates a text preview with truncation.
fn generate_text_preview(path: &str) -> Result<FilePreview, String> {
    let file = fs::File::open(path).map_err(|e| e.to_string())?;
    let mut reader = BufReader::new(file);

    let mut content = String::new();
    let mut char_count: usize = 0;
    let mut truncated = false;

    // Read line-by-line to avoid loading huge files into memory.
    loop {
        if char_count >= MAX_TEXT_PREVIEW_LENGTH {
            truncated = true;
            break;
        }

        let mut line = String::new();
        let bytes = reader.read_line(&mut line).map_err(|e| e.to_string())?;
        if bytes == 0 {
            break;
        }

        // Append but keep within the char limit.
        let remaining = MAX_TEXT_PREVIEW_LENGTH.saturating_sub(char_count);
        if remaining == 0 {
            truncated = true;
            break;
        }

        let mut it = line.chars();
        for _ in 0..remaining {
            if let Some(ch) = it.next() {
                content.push(ch);
                char_count = char_count.saturating_add(1);
            } else {
                break;
            }
        }

        if it.next().is_some() {
            truncated = true;
            break;
        }
    }

    Ok(FilePreview::Text { content, truncated })
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
