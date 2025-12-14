//! File preview generation for text and image files.

use crate::commands::config::limits;
use crate::commands::error::{FsError, FsResult};
use crate::commands::fs::run_blocking;
use crate::commands::validation::validate_path;

use base64::{engine::general_purpose::STANDARD, Engine};
use serde::Serialize;
use specta::Type;
use std::fs;
use std::io::{BufReader, Read};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Type)]
#[serde(tag = "type")]
pub enum FilePreview {
    Text { content: String, truncated: bool },
    Image { base64: String, mime: String },
    Unsupported { mime: String },
}

const TEXT_EXTENSIONS: &[&str] = &[
    "txt", "md", "json", "js", "ts", "tsx", "jsx", "rs", "toml", "yaml", "yml", "html", "css",
    "scss", "less", "xml", "svg", "sh", "bat", "ps1", "py", "rb", "go", "java", "c", "cpp", "h",
    "hpp", "cs", "php", "sql", "vue", "svelte", "astro", "lock", "gitignore", "env", "dockerfile",
    "makefile", "log", "ini", "cfg", "conf",
];

const IMAGE_EXTENSIONS: &[&str] = &["png", "jpg", "jpeg", "gif", "webp", "bmp", "ico", "svg"];

#[tauri::command]
#[specta::specta]
pub async fn get_file_preview(path: String) -> Result<FilePreview, String> {
    run_blocking(move || get_preview_sync(&path)).await
}

fn get_preview_sync(path: &str) -> FsResult<FilePreview> {
    let validated = validate_path(path)?;
    let extension = validated.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
    let filename = validated.file_name().and_then(|n| n.to_str()).unwrap_or("").to_lowercase();
    let is_text_file = TEXT_EXTENSIONS.contains(&extension.as_str())
        || matches!(filename.as_str(), "dockerfile" | "makefile" | ".gitignore" | ".env" | ".editorconfig");
    if is_text_file {
        preview_text(&validated)
    } else if IMAGE_EXTENSIONS.contains(&extension.as_str()) {
        preview_image(&validated, &extension)
    } else {
        let mime = mime_guess::from_ext(&extension).first_or_octet_stream().to_string();
        Ok(FilePreview::Unsupported { mime })
    }
}

fn preview_text(path: &Path) -> FsResult<FilePreview> {
    const MAX_CHARS: usize = limits::MAX_PREVIEW_CHARS;
    const MAX_BYTES: u64 = (MAX_CHARS as u64) * 4;
    let file = fs::File::open(path)?;
    let meta = file.metadata()?;
    if meta.len() > MAX_BYTES {
        let mut reader = BufReader::new(file);
        let mut bytes = vec![0u8; MAX_BYTES as usize];
        let read = reader.read(&mut bytes)?;
        bytes.truncate(read);
        let content = String::from_utf8_lossy(&bytes);
        let truncated_content: String = content.chars().take(MAX_CHARS).collect();
        return Ok(FilePreview::Text { content: truncated_content, truncated: true });
    }
    let mut reader = BufReader::new(file);
    let mut bytes = Vec::with_capacity(meta.len() as usize);
    reader.read_to_end(&mut bytes)?;
    let content = String::from_utf8_lossy(&bytes);
    let char_count = content.chars().count();
    let truncated = char_count > MAX_CHARS;
    Ok(FilePreview::Text { content: content.chars().take(MAX_CHARS).collect(), truncated })
}

fn preview_image(path: &Path, extension: &str) -> FsResult<FilePreview> {
    let meta = fs::metadata(path)?;
    if meta.len() > limits::MAX_PREVIEW_IMAGE_BYTES {
        return Ok(FilePreview::Unsupported { mime: format!("image/{} (too large)", extension) });
    }
    let bytes = fs::read(path)?;
    let mime_type = match extension {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "bmp" => "image/bmp",
        "ico" => "image/x-icon",
        "svg" => "image/svg+xml",
        _ => "image/png",
    };
    Ok(FilePreview::Image { base64: STANDARD.encode(&bytes), mime: mime_type.to_string() })
}