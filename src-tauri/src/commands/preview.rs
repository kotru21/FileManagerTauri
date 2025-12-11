use base64::{engine::general_purpose::STANDARD, Engine};
use serde::Serialize;
use specta::Type;
use std::fs;
use crate::commands::file_ops::validate_path;

#[derive(Debug, Clone, Serialize, Type)]
#[serde(tag = "type")]
pub enum FilePreview {
    Text { content: String, truncated: bool },
    Image { base64: String, mime: String },
    Unsupported { mime: String },
}

#[tauri::command]
#[specta::specta]
pub async fn get_file_preview(path: String) -> Result<FilePreview, String> {
    let validated = validate_path(&path)?;
    let path = validated.as_path();
    let extension = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    match extension.as_str() {
        "txt" | "md" | "json" | "js" | "ts" | "tsx" | "jsx" | "rs" | "toml" | "yaml" | "yml"
        | "html" | "css" | "scss" | "less" | "xml" | "svg" | "sh" | "bat" | "ps1" | "py"
        | "rb" | "go" | "java" | "c" | "cpp" | "h" | "hpp" | "cs" | "php" | "sql" | "vue"
        | "svelte" | "astro" | "lock" | "gitignore" | "env" | "dockerfile" | "makefile" => {
            let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
            let truncated = content.len() > 10000;
            Ok(FilePreview::Text {
                content: content.chars().take(10000).collect(),
                truncated,
            })
        }
        "png" | "jpg" | "jpeg" | "gif" | "webp" | "bmp" | "ico" => {
            let bytes = fs::read(path).map_err(|e| e.to_string())?;

            // размер для превью (5 MB)
            if bytes.len() > 5_000_000 {
                return Ok(FilePreview::Unsupported {
                    mime: format!("image/{} (too large)", extension),
                });
            }

            let mime_type = match extension.as_str() {
                "jpg" | "jpeg" => "image/jpeg",
                "png" => "image/png",
                "gif" => "image/gif",
                "webp" => "image/webp",
                "bmp" => "image/bmp",
                "ico" => "image/x-icon",
                _ => "image/png",
            };

            Ok(FilePreview::Image {
                base64: STANDARD.encode(&bytes),
                mime: mime_type.to_string(),
            })
        }
        _ => {
            let mime = mime_guess::from_ext(&extension)
                .first_or_octet_stream()
                .to_string();
            Ok(FilePreview::Unsupported { mime })
        }
    }
}
