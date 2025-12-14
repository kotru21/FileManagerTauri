//! File preview generation for text and image files.

use crate::commands::config::limits;
use crate::commands::error::{FsError, FsResult};
use crate::commands::fs::run_blocking;
use crate::commands::validation::validate_sandboxed;
use crate::commands::{ConfigExt, SecurityConfigState};
use base64::{engine::general_purpose::STANDARD, Engine};
use serde::Serialize;
use specta::Type;
use std::fs;
use std::io::{BufReader, Read};
use std::path::Path;
use tauri::State;

/// File preview content.
#[derive(Debug, Clone, Serialize, Type)]
#[serde(tag = "type")]
pub enum FilePreview {
    Text { content: String, truncated: bool },
    Image { base64: String, mime: String },
    Unsupported { mime: String },
}

/// Text file extensions that can be previewed.
const TEXT_EXTENSIONS: &[&str] = &[
    "txt", "md", "json", "js", "ts", "tsx", "jsx", "rs", "toml", "yaml", "yml", "html", "css",
    "scss", "less", "xml", "svg", "sh", "bat", "ps1", "py", "rb", "go", "java", "c", "cpp", "h",
    "hpp", "cs", "php", "sql", "vue", "svelte", "astro", "lock", "gitignore", "env", "dockerfile",
    "makefile", "log", "ini", "cfg", "conf",
];

/// Image extensions that can be previewed.
const IMAGE_EXTENSIONS: &[&str] = &["png", "jpg", "jpeg", "gif", "webp", "bmp", "ico", "svg"];

/// Get file preview content.
#[tauri::command]
#[specta::specta]
pub async fn get_file_preview(
    path: String,
    config_state: State<'_, SecurityConfigState>,
) -> Result<FilePreview, String> {
    let config = config_state.get_config()?;
    run_blocking(move || get_preview_sync(&path, &config)).await
}

fn get_preview_sync(
    path: &str,
    config: &crate::commands::config::SecurityConfig,
) -> FsResult<FilePreview> {
    let validated = validate_sandboxed(path, config)?;

    let extension = validated
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    // Check file name for extensionless files
    let filename = validated
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_lowercase();

    // Handle extensionless config files
    let is_text_file = TEXT_EXTENSIONS.contains(&extension.as_str())
        || matches!(
            filename.as_str(),
            "dockerfile" | "makefile" | ".gitignore" | ".env" | ".editorconfig"
        );

    if is_text_file {
        preview_text(&validated)
    } else if IMAGE_EXTENSIONS.contains(&extension.as_str()) {
        preview_image(&validated, &extension)
    } else {
        let mime = mime_guess::from_ext(&extension)
            .first_or_octet_stream()
            .to_string();
        Ok(FilePreview::Unsupported { mime })
    }
}

fn preview_text(path: &Path) -> FsResult<FilePreview> {
    const MAX_CHARS: usize = limits::MAX_PREVIEW_CHARS;
    const MAX_BYTES: u64 = (MAX_CHARS as u64) * 4; // UTF-8 max 4 bytes per char

    let file = fs::File::open(path)?;
    let meta = file.metadata()?;

    // Quick check for obviously large files
    if meta.len() > MAX_BYTES {
        let mut reader = BufReader::new(file);
        let mut bytes = vec![0u8; MAX_BYTES as usize];
        let read = reader.read(&mut bytes)?;
        bytes.truncate(read);

        let content = String::from_utf8_lossy(&bytes);
        let truncated_content: String = content.chars().take(MAX_CHARS).collect();

        return Ok(FilePreview::Text {
            content: truncated_content,
            truncated: true,
        });
    }

    let mut reader = BufReader::new(file);
    let mut bytes = Vec::with_capacity(meta.len() as usize);
    reader.read_to_end(&mut bytes)?;

    let content = String::from_utf8_lossy(&bytes);
    let char_count = content.chars().count();
    let truncated = char_count > MAX_CHARS;

    Ok(FilePreview::Text {
        content: content.chars().take(MAX_CHARS).collect(),
        truncated,
    })
}

fn preview_image(path: &Path, extension: &str) -> FsResult<FilePreview> {
    let meta = fs::metadata(path)?;

    if meta.len() > limits::MAX_PREVIEW_IMAGE_BYTES {
        return Ok(FilePreview::Unsupported {
            mime: format!("image/{} (too large)", extension),
        });
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

    Ok(FilePreview::Image {
        base64: STANDARD.encode(&bytes),
        mime: mime_type.to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::commands::config::SecurityConfig;
    use std::io::Write;
    use tempfile::tempdir;

    #[test]
    fn preview_truncates_large_text() {
        let dir = tempdir().unwrap();
        let file = dir.path().join("large.txt");
        let mut f = fs::File::create(&file).unwrap();
        let content: String = (0..limits::MAX_PREVIEW_CHARS + 100).map(|_| 'a').collect();
        f.write_all(content.as_bytes()).unwrap();

        let config = SecurityConfig::default().with_mounted_disks();
        let preview = get_preview_sync(&file.to_string_lossy(), &config).unwrap();

        match preview {
            FilePreview::Text { content, truncated } => {
                assert!(truncated);
                assert_eq!(content.len(), limits::MAX_PREVIEW_CHARS);
            }
            _ => panic!("Expected text preview"),
        }
    }

    #[test]
    fn unsupported_extension() {
        let dir = tempdir().unwrap();
        let file = dir.path().join("file.xyz");
        fs::File::create(&file).unwrap();

        let config = SecurityConfig::default().with_mounted_disks();
        let preview = get_preview_sync(&file.to_string_lossy(), &config).unwrap();

        assert!(matches!(preview, FilePreview::Unsupported { .. }));
    }

    #[test]
    fn preview_dockerfile() {
        let dir = tempdir().unwrap();
        let file = dir.path().join("Dockerfile");
        fs::write(&file, "FROM ubuntu:latest").unwrap();

        let config = SecurityConfig::default().with_mounted_disks();
        let preview = get_preview_sync(&file.to_string_lossy(), &config).unwrap();

        match preview {
            FilePreview::Text { content, .. } => {
                assert!(content.contains("FROM"));
            }
            _ => panic!("Expected text preview for Dockerfile"),
        }
    }
}