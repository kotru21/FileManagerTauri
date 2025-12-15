//! File search functionality with content search support.

use std::fs::File;
use std::io::{BufRead, BufReader};
use std::path::Path;
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::Arc;

use rayon::prelude::*;
use tauri::{async_runtime::spawn_blocking, AppHandle, Emitter};
use walkdir::WalkDir;

use crate::constants::{
    DEFAULT_MAX_SEARCH_RESULTS, MAX_CONTENT_MATCHES_PER_FILE, MAX_SEARCH_DEPTH,
    MAX_SEARCH_FILE_SIZE, SEARCH_PROGRESS_INTERVAL,
};
use crate::error::{FileManagerError, Result};
use crate::models::{ContentMatch, SearchOptions, SearchProgress, SearchResult};

/// Searches for files matching the given options.
#[tauri::command]
#[specta::specta]
pub async fn search_files(
    options: SearchOptions,
) -> std::result::Result<Vec<SearchResult>, String> {
    spawn_blocking(move || search_files_sync(&options))
        .await
        .map_err(|e| e.to_string())?
        .map_err(Into::into)
}

/// Streaming search with progress events.
#[tauri::command]
#[specta::specta]
pub async fn search_files_stream(
    options: SearchOptions,
    app: AppHandle,
) -> std::result::Result<Vec<SearchResult>, String> {
    let options_clone = options.clone();
    spawn_blocking(move || search_files_with_progress(&options_clone, &app))
        .await
        .map_err(|e| e.to_string())?
        .map_err(Into::into)
}

/// Search with progress reporting.
fn search_files_with_progress(options: &SearchOptions, app: &AppHandle) -> Result<Vec<SearchResult>> {
    let search_path = Path::new(&options.search_path);

    if !search_path.exists() {
        return Err(FileManagerError::SearchPathNotFound(
            options.search_path.clone(),
        ));
    }

    let max_results = options.max_results.unwrap_or(DEFAULT_MAX_SEARCH_RESULTS as u32) as usize;

    // Collect entries with depth limit
    let entries: Vec<_> = WalkDir::new(search_path)
        .max_depth(MAX_SEARCH_DEPTH)
        .follow_links(false)
        .into_iter()
        .filter_map(|e| e.ok())
        .collect();

    let total_entries = entries.len();
    let scanned = Arc::new(AtomicUsize::new(0));
    let found = Arc::new(AtomicUsize::new(0));
    let should_stop = Arc::new(AtomicBool::new(false));

    // Emit initial progress
    let _ = app.emit(
        "search-progress",
        SearchProgress {
            scanned: 0,
            found: 0,
            current_path: options.search_path.clone(),
        },
    );

    // Parallel processing with rayon
    let results: Vec<SearchResult> = entries
        .par_iter()
        .filter_map(|entry| {
            if should_stop.load(Ordering::Relaxed) {
                return None;
            }

            let current_scanned = scanned.fetch_add(1, Ordering::Relaxed);

            // Emit progress periodically
            if current_scanned.is_multiple_of(SEARCH_PROGRESS_INTERVAL) {
                let _ = app.emit(
                    "search-progress",
                    SearchProgress {
                        scanned: current_scanned,
                        found: found.load(Ordering::Relaxed),
                        current_path: entry.path().to_string_lossy().to_string(),
                    },
                );
            }

            let result = process_search_entry(entry, options);

            if result.is_some() {
                let current_found = found.fetch_add(1, Ordering::Relaxed);
                if current_found >= max_results {
                    should_stop.store(true, Ordering::Relaxed);
                }
            }

            result
        })
        .take_any_while(|_| !should_stop.load(Ordering::Relaxed))
        .collect();

    // Emit final progress
    let _ = app.emit(
        "search-progress",
        SearchProgress {
            scanned: total_entries,
            found: results.len(),
            current_path: String::new(),
        },
    );

    let _ = app.emit("search-complete", results.len());

    Ok(results.into_iter().take(max_results).collect())
}

/// Synchronous search implementation.
fn search_files_sync(options: &SearchOptions) -> Result<Vec<SearchResult>> {
    let search_path = Path::new(&options.search_path);

    if !search_path.exists() {
        return Err(FileManagerError::SearchPathNotFound(
            options.search_path.clone(),
        ));
    }

    let max_results = options.max_results.unwrap_or(DEFAULT_MAX_SEARCH_RESULTS as u32) as usize;
    let found_count = Arc::new(AtomicUsize::new(0));

    let results: Vec<SearchResult> = WalkDir::new(search_path)
        .max_depth(MAX_SEARCH_DEPTH)
        .follow_links(false)
        .into_iter()
        .par_bridge()
        .filter_map(|e| e.ok())
        .filter_map(|entry| {
            let count = found_count.fetch_add(0, Ordering::Relaxed);
            if count >= max_results {
                return None;
            }

            let result = process_search_entry(&entry, options);
            if result.is_some() {
                found_count.fetch_add(1, Ordering::Relaxed);
            }
            result
        })
        .take_any(max_results)
        .collect();

    Ok(results)
}

/// Processes a single entry for search matching.
fn process_search_entry(entry: &walkdir::DirEntry, options: &SearchOptions) -> Option<SearchResult> {
    let path = entry.path();
    let name = path.file_name()?.to_str()?.to_string();

    // Filter by extension if specified
    if let Some(ref extensions) = options.file_extensions {
        if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
            if !extensions.iter().any(|e| e.eq_ignore_ascii_case(ext)) {
                return None;
            }
        } else if !entry.file_type().is_dir() {
            return None;
        }
    }

    // Check filename match
    let name_matches = if options.case_sensitive {
        name.contains(&options.query)
    } else {
        name.to_lowercase()
            .contains(&options.query.to_lowercase())
    };

    // Search content if enabled and it's a file
    let mut content_matches = Vec::new();

    if options.search_content && entry.file_type().is_file() {
        if let Ok(meta) = entry.metadata() {
            if meta.len() <= MAX_SEARCH_FILE_SIZE {
                if let Ok(file) = File::open(path) {
                    let reader = BufReader::new(file);
                    content_matches = search_file_content(reader, options);
                }
            }
        }
    }

    if name_matches || !content_matches.is_empty() {
        Some(SearchResult {
            path: path.to_string_lossy().to_string(),
            name,
            is_dir: entry.file_type().is_dir(),
            matches: content_matches,
        })
    } else {
        None
    }
}

/// Searches file content for matches.
fn search_file_content(reader: BufReader<File>, options: &SearchOptions) -> Vec<ContentMatch> {
    let mut matches = Vec::new();
    let query_lower = options.query.to_lowercase();

    for (line_num, line_result) in reader.lines().enumerate() {
        let Ok(line) = line_result else {
            continue;
        };

        let (haystack, needle) = if options.case_sensitive {
            (line.as_str(), options.query.as_str())
        } else {
            // Allocate lowercase version for case-insensitive search
            let haystack_lower = line.to_lowercase();
            if let Some(start) = haystack_lower.find(&query_lower) {
                matches.push(ContentMatch {
                    line_number: (line_num + 1) as u64,
                    line_content: line.chars().take(200).collect(),
                    match_start: start as u64,
                    match_end: (start + query_lower.len()) as u64,
                });

                if matches.len() >= MAX_CONTENT_MATCHES_PER_FILE {
                    break;
                }
            }
            continue;
        };

        if let Some(start) = haystack.find(needle) {
            matches.push(ContentMatch {
                line_number: (line_num + 1) as u64,
                line_content: line.chars().take(200).collect(),
                match_start: start as u64,
                match_end: (start + needle.len()) as u64,
            });

            if matches.len() >= MAX_CONTENT_MATCHES_PER_FILE {
                break;
            }
        }
    }

    matches
}

/// Searches for files by name only.
#[tauri::command]
#[specta::specta]
pub async fn search_by_name(
    search_path: String,
    query: String,
    max_results: Option<u32>,
) -> std::result::Result<Vec<SearchResult>, String> {
    search_files(SearchOptions {
        query,
        search_path,
        search_content: false,
        case_sensitive: false,
        max_results,
        file_extensions: None,
    })
    .await
}

/// Searches file contents.
#[tauri::command]
#[specta::specta]
pub async fn search_content(
    search_path: String,
    query: String,
    extensions: Option<Vec<String>>,
    max_results: Option<u32>,
) -> std::result::Result<Vec<SearchResult>, String> {
    search_files(SearchOptions {
        query,
        search_path,
        search_content: true,
        case_sensitive: false,
        max_results,
        file_extensions: extensions,
    })
    .await
}