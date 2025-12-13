use crate::commands::file_ops::{validate_path_sandboxed_with_cfg, run_blocking_fs};
use crate::commands::config::SecurityConfig;
use tauri::State;
use crate::commands::error::FsError;
use crate::commands::config::limits as limits;
type FsResult<T> = Result<T, FsError>;
use base64::{Engine, engine::general_purpose::STANDARD};
use serde::Serialize;
use specta::Type;
use std::fs;
use std::io::{Read, BufReader};

#[derive(Debug, Clone, Serialize, Type)]
#[serde(tag = "type")]
pub enum FilePreview {
    Text { content: String, truncated: bool },
    Image { base64: String, mime: String },
    Unsupported { mime: String },
}

#[tauri::command]
#[specta::specta]
pub async fn get_file_preview(
    path: String,
    config_state: State<'_, std::sync::Arc<std::sync::RwLock<SecurityConfig>>>,
) -> Result<FilePreview, String> {
    let cfg = config_state.read().map_err(|_| "Failed to read security config")?.clone();
    run_blocking_fs(move || get_file_preview_sync_with_cfg(path, &cfg)).await
}

fn get_file_preview_sync_with_cfg(path: String, cfg: &SecurityConfig) -> FsResult<FilePreview> {
    let validated = validate_path_sandboxed_with_cfg(&path, cfg)?;
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
            // Read at most MAX_PREVIEW_CHARS characters, using a conservative
            // byte limit (avg 4 bytes per char) to keep memory bounded and
            // avoid expensive per-line `chars().count()` loops.
            const MAX_CHARS: usize = limits::MAX_PREVIEW_CHARS;
            let max_bytes = (MAX_CHARS as u64).saturating_mul(4);
            let file = fs::File::open(path).map_err(|_| FsError::Io)?;
            let mut reader = BufReader::new(file);

            // Read up to `max_bytes` into a buffer.
            let mut bytes = Vec::with_capacity(max_bytes as usize);
            reader
                .by_ref()
                .take(max_bytes)
                .read_to_end(&mut bytes)
                .map_err(|_| FsError::Io)?;

            let s = String::from_utf8_lossy(&bytes);
            let truncated = s.chars().count() > MAX_CHARS;
            Ok(FilePreview::Text {
                content: s.chars().take(MAX_CHARS).collect(),
                truncated,
            })
        }
        "png" | "jpg" | "jpeg" | "gif" | "webp" | "bmp" | "ico" => {
            // size check before reading
            const MAX_IMAGE_BYTES: u64 = limits::MAX_PREVIEW_IMAGE_BYTES;
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

// Removed legacy wrapper get_file_preview_sync — use get_file_preview_sync_with_cfg(path, &cfg) directly.

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    use std::fs::File;
    use std::io::Write;

    #[test]
    fn preview_truncates_large_text_file() {
        let dir = tempdir().unwrap();
        let file = dir.path().join("big.txt");
        let mut f = File::create(&file).unwrap();
        let mut content = String::new();
        let repeat = (limits::MAX_PREVIEW_CHARS as usize) + 50;
        for _ in 0..repeat {
            content.push('a');
        }
        f.write_all(content.as_bytes()).unwrap();

        let cfg = crate::commands::config::SecurityConfig::default_windows();
        let res = get_file_preview_sync_with_cfg(file.to_string_lossy().to_string(), &cfg).unwrap();
        match res {
            FilePreview::Text { content, truncated } => {
                assert!(truncated, "expected truncated true for large file");
                assert_eq!(content.chars().count(), limits::MAX_PREVIEW_CHARS as usize);
            }
            _ => panic!("expected text preview"),
        }
    }
}
