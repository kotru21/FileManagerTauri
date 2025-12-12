use crate::commands::file_ops::{validate_path, run_blocking_fs};
use crate::commands::error::FsError;
type FsResult<T> = Result<T, FsError>;
use base64::{Engine, engine::general_purpose::STANDARD};
use serde::Serialize;
use specta::Type;
use std::fs;
use std::io::{Read, BufRead, BufReader};
// spawn_blocking replaced by centralized run_blocking_fs in file_ops

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
    run_blocking_fs(move || get_file_preview_sync(path)).await
}

fn get_file_preview_sync(path: String) -> FsResult<FilePreview> {
    let validated = validate_path(&path)?;
    let path = validated.as_path();
    let extension = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    match extension.as_str() {
        "txt" | "md" | "json" | "js" | "ts" | "tsx" | "jsx" | "rs" | "toml" | "yaml" | "yml"
        | "html" | "css" | "scss" | "less" | "xml" | "svg" | "sh" | "bat" | "ps1" | "py" | "rb"
        | "go" | "java" | "c" | "cpp" | "h" | "hpp" | "cs" | "php" | "sql" | "vue" | "svelte"
        | "astro" | "lock" | "gitignore" | "env" | "dockerfile" | "makefile" => {
            // Read at most 10k chars to avoid OOM on huge text files.
            const MAX_CHARS: usize = 10_000;
            let file = fs::File::open(path).map_err(|_| FsError::Io)?;
            let mut reader = BufReader::new(file);

            let mut buf = String::new();
            // Read some bytes, then truncate by char count.
            // (line-based reading keeps memory bounded and is UTF-8 friendly)
            while buf.chars().count() < MAX_CHARS {
                let mut line = String::new();
                let read = reader.read_line(&mut line).map_err(|_| FsError::Io)?;
                if read == 0 {
                    break;
                }
                buf.push_str(&line);
                if buf.len() > MAX_CHARS * 4 {
                    // bail out if pathological; we'll truncate anyway
                    break;
                }
            }

            let truncated = buf.chars().count() > MAX_CHARS;
            Ok(FilePreview::Text {
                content: buf.chars().take(MAX_CHARS).collect(),
                truncated,
            })
        }
        "png" | "jpg" | "jpeg" | "gif" | "webp" | "bmp" | "ico" => {
            // size check before reading
            const MAX_IMAGE_BYTES: u64 = 5_000_000;
            let meta = fs::metadata(path).map_err(|_| FsError::Io)?;
            if meta.len() > MAX_IMAGE_BYTES {
                return Ok(FilePreview::Unsupported {
                    mime: format!("image/{} (too large)", extension),
                });
            }

            let mut file = fs::File::open(path).map_err(|_| FsError::Io)?;
            let mut bytes = Vec::with_capacity(meta.len() as usize);
            file.read_to_end(&mut bytes).map_err(|_| FsError::Io)?;

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
