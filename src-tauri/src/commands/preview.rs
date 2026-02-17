//! File preview generation for text, images, and office documents.

use std::fs;
use std::io::{BufRead, BufReader, Read};
use std::path::Path;

use tauri::async_runtime::spawn_blocking;

use base64::engine::general_purpose::STANDARD;
use base64::Engine;

use crate::constants::{
    DOCUMENT_EXTENSIONS, IMAGE_EXTENSIONS, MAX_DOCUMENT_PARAGRAPHS, MAX_OFFICE_FILE_SIZE,
    MAX_PRESENTATION_SLIDES, MAX_PREVIEW_FILE_SIZE, MAX_SPREADSHEET_ROWS,
    MAX_TEXT_PREVIEW_LENGTH, PRESENTATION_EXTENSIONS, SPREADSHEET_EXTENSIONS, TEXT_EXTENSIONS,
};
use crate::models::preview::{DocParagraph, PresentationSlide, SpreadsheetSheet};
use crate::models::FilePreview;
use crate::utils::get_extension;

/// Generates a preview for a file.
#[tauri::command]
#[specta::specta]
pub async fn get_file_preview(path: String) -> Result<FilePreview, String> {
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

        // Office documents
        if DOCUMENT_EXTENSIONS.contains(&extension.as_str()) {
            return generate_document_preview(&path);
        }

        if SPREADSHEET_EXTENSIONS.contains(&extension.as_str()) {
            return generate_spreadsheet_preview(&path);
        }

        if PRESENTATION_EXTENSIONS.contains(&extension.as_str()) {
            return generate_presentation_preview(&path);
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

// ---------------------------------------------------------------------------
// DOCX preview
// ---------------------------------------------------------------------------

/// Generates a preview for a .docx file by extracting paragraphs from word/document.xml.
fn generate_document_preview(path: &str) -> Result<FilePreview, String> {
    let meta = fs::metadata(path).map_err(|e| e.to_string())?;
    if meta.len() > MAX_OFFICE_FILE_SIZE {
        return Ok(FilePreview::Unsupported {
            mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document (too large)"
                .to_string(),
        });
    }

    let file = fs::File::open(path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| format!("Invalid DOCX: {e}"))?;

    let xml = {
        let mut entry = archive
            .by_name("word/document.xml")
            .map_err(|e| format!("Missing word/document.xml: {e}"))?;
        let mut buf = String::new();
        entry.read_to_string(&mut buf).map_err(|e| e.to_string())?;
        buf
    };

    let mut paragraphs = Vec::new();
    let mut truncated = false;

    let mut reader = quick_xml::Reader::from_str(&xml);
    reader.config_mut().trim_text(true);

    // State for parsing
    let mut in_paragraph = false;
    let mut in_run = false;
    let mut in_text = false;
    let mut current_style = String::from("normal");
    let mut current_text = String::new();

    let mut buf = Vec::new();

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(quick_xml::events::Event::Start(ref e)) | Ok(quick_xml::events::Event::Empty(ref e)) => {
                let name_bytes = e.name();
                let local = local_name(name_bytes.as_ref());
                match local {
                    b"p" => {
                        in_paragraph = true;
                        current_style = String::from("normal");
                        current_text.clear();
                    }
                    b"r" => {
                        in_run = true;
                    }
                    b"t" => {
                        if in_run {
                            in_text = true;
                        }
                    }
                    b"pStyle" => {
                        // <w:pStyle w:val="Heading1"/>
                        if in_paragraph {
                            for attr in e.attributes().flatten() {
                                if local_name(attr.key.as_ref()) == b"val" {
                                    let val = String::from_utf8_lossy(&attr.value).to_lowercase();
                                    current_style = classify_docx_style(&val);
                                }
                            }
                        }
                    }
                    b"numPr" => {
                        // Numbered/bulleted list item
                        if in_paragraph && current_style == "normal" {
                            current_style = String::from("listItem");
                        }
                    }
                    _ => {}
                }
            }
            Ok(quick_xml::events::Event::End(ref e)) => {
                let name_bytes = e.name();
                let local = local_name(name_bytes.as_ref());
                match local {
                    b"p" => {
                        if in_paragraph && !current_text.is_empty() {
                            paragraphs.push(DocParagraph {
                                text: current_text.clone(),
                                style: current_style.clone(),
                            });
                            if paragraphs.len() >= MAX_DOCUMENT_PARAGRAPHS {
                                truncated = true;
                                break;
                            }
                        }
                        in_paragraph = false;
                    }
                    b"r" => {
                        in_run = false;
                        in_text = false;
                    }
                    b"t" => {
                        in_text = false;
                    }
                    _ => {}
                }
            }
            Ok(quick_xml::events::Event::Text(ref e)) => {
                if in_text {
                    if let Ok(text) = e.unescape() {
                        current_text.push_str(&text);
                    }
                }
            }
            Ok(quick_xml::events::Event::Eof) => break,
            Err(e) => return Err(format!("Error parsing DOCX XML: {e}")),
            _ => {}
        }
        buf.clear();
    }

    Ok(FilePreview::Document {
        paragraphs,
        truncated,
    })
}

/// Classifies a DOCX w:pStyle value into a simpler style name.
fn classify_docx_style(val: &str) -> String {
    if val.starts_with("heading1") || val == "title" {
        "heading1".to_string()
    } else if val.starts_with("heading2") || val == "subtitle" {
        "heading2".to_string()
    } else if val.starts_with("heading") {
        "heading3".to_string()
    } else if val.contains("list") || val.contains("bullet") {
        "listItem".to_string()
    } else {
        "normal".to_string()
    }
}

// ---------------------------------------------------------------------------
// XLSX preview
// ---------------------------------------------------------------------------

/// Generates a preview for a .xlsx file using the calamine crate.
fn generate_spreadsheet_preview(path: &str) -> Result<FilePreview, String> {
    use calamine::{open_workbook, Data, Reader, Xlsx};

    let meta = fs::metadata(path).map_err(|e| e.to_string())?;
    if meta.len() > MAX_OFFICE_FILE_SIZE {
        return Ok(FilePreview::Unsupported {
            mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet (too large)"
                .to_string(),
        });
    }

    let mut workbook: Xlsx<_> =
        open_workbook(path).map_err(|e| format!("Cannot open XLSX: {e}"))?;

    let sheet_names: Vec<String> = workbook.sheet_names().to_vec();
    let mut sheets = Vec::new();

    for name in &sheet_names {
        let range = match workbook.worksheet_range(name) {
            Ok(r) => r,
            Err(_) => continue,
        };

        let total_rows = range.height() as u64;
        let mut headers = Vec::new();
        let mut rows = Vec::new();
        let mut truncated = false;

        for (i, row) in range.rows().enumerate() {
            let cells: Vec<String> = row
                .iter()
                .map(|cell| match cell {
                    Data::Empty => String::new(),
                    Data::String(s) => s.clone(),
                    Data::Float(f) => {
                        if *f == (*f as i64) as f64 {
                            format!("{}", *f as i64)
                        } else {
                            format!("{f}")
                        }
                    }
                    Data::Int(n) => format!("{n}"),
                    Data::Bool(b) => if *b { "TRUE" } else { "FALSE" }.to_string(),
                    Data::Error(e) => format!("#{e:?}"),
                    Data::DateTime(dt) => format!("{dt}"),
                    Data::DateTimeIso(s) => s.clone(),
                    Data::DurationIso(s) => s.clone(),
                })
                .collect();

            if i == 0 {
                headers = cells;
            } else {
                rows.push(cells);
                if rows.len() >= MAX_SPREADSHEET_ROWS {
                    truncated = true;
                    break;
                }
            }
        }

        sheets.push(SpreadsheetSheet {
            name: name.clone(),
            headers,
            rows,
            total_rows,
            truncated,
        });
    }

    Ok(FilePreview::Spreadsheet { sheets })
}

// ---------------------------------------------------------------------------
// PPTX preview
// ---------------------------------------------------------------------------

/// Generates a preview for a .pptx file by extracting slide text.
fn generate_presentation_preview(path: &str) -> Result<FilePreview, String> {
    let meta = fs::metadata(path).map_err(|e| e.to_string())?;
    if meta.len() > MAX_OFFICE_FILE_SIZE {
        return Ok(FilePreview::Unsupported {
            mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation (too large)"
                .to_string(),
        });
    }

    let file = fs::File::open(path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| format!("Invalid PPTX: {e}"))?;

    // Collect slide file names and sort them by number
    let mut slide_names: Vec<String> = (0..archive.len())
        .filter_map(|i| {
            let name = archive.by_index(i).ok()?.name().to_string();
            if name.starts_with("ppt/slides/slide") && name.ends_with(".xml") {
                Some(name)
            } else {
                None
            }
        })
        .collect();

    slide_names.sort_by(|a, b| {
        let num_a = extract_slide_number(a);
        let num_b = extract_slide_number(b);
        num_a.cmp(&num_b)
    });

    let mut slides = Vec::new();

    for slide_name in &slide_names {
        if slides.len() >= MAX_PRESENTATION_SLIDES {
            break;
        }

        let xml = {
            let mut entry = match archive.by_name(slide_name) {
                Ok(e) => e,
                Err(_) => continue,
            };
            let mut buf = String::new();
            entry.read_to_string(&mut buf).map_err(|e| e.to_string())?;
            buf
        };

        let slide_num = extract_slide_number(slide_name);
        let (title, texts) = extract_pptx_slide_text(&xml);

        slides.push(PresentationSlide {
            number: slide_num,
            title,
            texts,
        });
    }

    Ok(FilePreview::Presentation { slides })
}

/// Extracts the slide number from a path like "ppt/slides/slide3.xml".
fn extract_slide_number(name: &str) -> u32 {
    name.trim_start_matches("ppt/slides/slide")
        .trim_end_matches(".xml")
        .parse::<u32>()
        .unwrap_or(0)
}

/// Extracts title and body text from a single PPTX slide XML.
fn extract_pptx_slide_text(xml: &str) -> (Option<String>, Vec<String>) {
    let mut reader = quick_xml::Reader::from_str(xml);
    reader.config_mut().trim_text(true);

    let mut title: Option<String> = None;
    let mut texts: Vec<String> = Vec::new();

    // Track shape type and text accumulation
    let mut in_shape = false;
    let mut is_title_shape = false;
    let mut in_text_body = false;
    let mut in_paragraph = false;
    let mut in_a_t = false;
    let mut current_paragraph = String::new();
    let mut shape_paragraphs: Vec<String> = Vec::new();

    let mut buf = Vec::new();

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(quick_xml::events::Event::Start(ref e)) | Ok(quick_xml::events::Event::Empty(ref e)) => {
                let name_bytes = e.name();
                let local = local_name(name_bytes.as_ref());
                match local {
                    b"sp" => {
                        in_shape = true;
                        is_title_shape = false;
                        shape_paragraphs.clear();
                    }
                    b"ph" => {
                        // <p:ph type="title"/> or <p:ph type="ctrTitle"/>
                        if in_shape {
                            for attr in e.attributes().flatten() {
                                if local_name(attr.key.as_ref()) == b"type" {
                                    let val = String::from_utf8_lossy(&attr.value);
                                    if val.contains("itle") {
                                        is_title_shape = true;
                                    }
                                }
                            }
                        }
                    }
                    b"txBody" => {
                        if in_shape {
                            in_text_body = true;
                        }
                    }
                    b"p" => {
                        if in_text_body {
                            in_paragraph = true;
                            current_paragraph.clear();
                        }
                    }
                    b"t" => {
                        if in_paragraph {
                            in_a_t = true;
                        }
                    }
                    _ => {}
                }
            }
            Ok(quick_xml::events::Event::End(ref e)) => {
                let name_bytes = e.name();
                let local = local_name(name_bytes.as_ref());
                match local {
                    b"sp" => {
                        if in_shape {
                            if is_title_shape {
                                let combined = shape_paragraphs.join(" ");
                                if !combined.is_empty() && title.is_none() {
                                    title = Some(combined);
                                }
                            } else {
                                for p in &shape_paragraphs {
                                    if !p.is_empty() {
                                        texts.push(p.clone());
                                    }
                                }
                            }
                        }
                        in_shape = false;
                        is_title_shape = false;
                        in_text_body = false;
                    }
                    b"txBody" => {
                        in_text_body = false;
                    }
                    b"p" => {
                        if in_paragraph && !current_paragraph.is_empty() {
                            shape_paragraphs.push(current_paragraph.clone());
                        }
                        in_paragraph = false;
                    }
                    b"t" => {
                        in_a_t = false;
                    }
                    _ => {}
                }
            }
            Ok(quick_xml::events::Event::Text(ref e)) => {
                if in_a_t {
                    if let Ok(text) = e.unescape() {
                        current_paragraph.push_str(&text);
                    }
                }
            }
            Ok(quick_xml::events::Event::Eof) => break,
            Err(_) => break,
            _ => {}
        }
        buf.clear();
    }

    (title, texts)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Returns the local name of an XML tag, stripping the namespace prefix.
/// e.g. b"w:p" -> b"p", b"a:t" -> b"t"
fn local_name(full: &[u8]) -> &[u8] {
    match full.iter().position(|&b| b == b':') {
        Some(pos) => &full[pos + 1..],
        None => full,
    }
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

    use crate::constants::{
        MAX_THUMBNAIL_FILE_SIZE, MAX_THUMBNAIL_PIXELS, MAX_THUMBNAIL_SIDE, MIN_THUMBNAIL_SIDE,
    };

    spawn_blocking(move || {
        let path = path.trim().to_string();
        if path.is_empty() {
            return Err("Empty path".to_string());
        }

        let file_path = Path::new(&path);
        let extension = get_extension(file_path).unwrap_or_default();

        if !IMAGE_EXTENSIONS.contains(&extension.as_str()) {
            return Err(format!(
                "Unsupported image extension for thumbnail: {extension}"
            ));
        }

        let meta = fs::metadata(&path).map_err(|e| e.to_string())?;
        if !meta.is_file() {
            return Err("Not a file".to_string());
        }
        if meta.len() > MAX_THUMBNAIL_FILE_SIZE {
            return Err("File is too large for thumbnail generation".to_string());
        }

        let mut max_side = max_side.clamp(MIN_THUMBNAIL_SIDE, MAX_THUMBNAIL_SIDE);

        let (w, h) = image::image_dimensions(&path).map_err(|e| e.to_string())?;
        if w == 0 || h == 0 {
            return Err("Invalid image dimensions".to_string());
        }
        let pixels = (w as u64).saturating_mul(h as u64);
        if pixels > MAX_THUMBNAIL_PIXELS {
            return Err("Image is too large for thumbnail generation".to_string());
        }

        let max_dim = w.max(h);
        if max_side > max_dim {
            max_side = max_dim.max(MIN_THUMBNAIL_SIDE);
        }

        let img = ImageReader::open(&path)
            .map_err(|e| e.to_string())?
            .with_guessed_format()
            .map_err(|e| e.to_string())?
            .decode()
            .map_err(|e| e.to_string())?;

        let resized = img.resize(max_side, max_side, FilterType::Lanczos3);

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
    })
    .await
    .map_err(|e| e.to_string())?
}
