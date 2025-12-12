use crate::commands::file_ops::{validate_path, run_blocking_fs};
use crate::commands::error::FsError;
type FsResult<T> = Result<T, FsError>;
use rayon::prelude::*;
use rayon::iter::ParallelBridge;
use serde::{Deserialize, Serialize};
use specta::Type;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::{
    fs::File,
    io::{BufRead, BufReader},
};
// spawn_blocking replaced by centralized run_blocking_fs in file_ops
use tauri::{AppHandle, Emitter};
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SearchResult {
    pub path: String,
    pub name: String,
    pub is_dir: bool,
    pub matches: Vec<ContentMatch>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ContentMatch {
    pub line_number: u64,
    pub line_content: String,
    pub match_start: u64,
    pub match_end: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SearchOptions {
    pub query: String,
    pub search_path: String,
    pub search_content: bool,
    pub case_sensitive: bool,
    pub max_results: Option<u32>,
    pub file_extensions: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SearchProgress {
    pub scanned: usize,
    pub found: usize,
    pub current_path: String,
}

#[tauri::command]
#[specta::specta]
pub async fn search_files(options: SearchOptions) -> Result<Vec<SearchResult>, String> {
    // Heavy IO, run on a blocking thread to keep async runtime responsive.
    run_blocking_fs(move || search_files_sync(options)).await
}

/// Стриминг поиска с прогрессом
#[tauri::command]
#[specta::specta]
pub async fn search_files_stream(
    options: SearchOptions,
    app: AppHandle,
) -> Result<Vec<SearchResult>, String> {
    let options_clone = options.clone();

    run_blocking_fs(move || search_files_with_progress(options_clone, app)).await
}

fn search_files_with_progress(
    options: SearchOptions,
    app: AppHandle,
 ) -> FsResult<Vec<SearchResult>> {
    let search_path = validate_path(&options.search_path)?;

    let max_results = options.max_results.unwrap_or(500) as usize;
    let max_depth = 10; // Ограничиваем глубину поиска
    // Hard cap to avoid OOM when walking huge directory trees.
    const MAX_WALK_ENTRIES: usize = 200_000;

    let scanned = Arc::new(AtomicUsize::new(0));
    let found = Arc::new(AtomicUsize::new(0));
    let should_stop = Arc::new(AtomicBool::new(false));

    // Отправляем начальный прогресс
    let _ = app.emit(
        "search-progress",
        SearchProgress {
            scanned: 0,
            found: 0,
            current_path: options.search_path.clone(),
        },
    );

    // Parallel streaming walk to avoid allocating a huge Vec of entries.
    let results: Vec<SearchResult> = WalkDir::new(search_path)
        .max_depth(max_depth)
        .follow_links(false)
        .into_iter()
        .filter_map(|e| e.ok())
        .take(MAX_WALK_ENTRIES)
        .par_bridge()
        .filter_map(|entry| {
            if should_stop.load(Ordering::Relaxed) {
                return None;
            }

            let current_scanned = scanned.fetch_add(1, Ordering::Relaxed) + 1;

            // Отправляем прогресс каждые 100 файлов
            if current_scanned.is_multiple_of(100) {
                let _ = app.emit(
                    "search-progress",
                    SearchProgress {
                        scanned: current_scanned,
                        found: found.load(Ordering::Relaxed),
                        current_path: entry.path().to_string_lossy().to_string(),
                    },
                );
            }

            let result = process_search_entry(&entry, &options);

            if result.is_some() {
                let current_found = found.fetch_add(1, Ordering::Relaxed) + 1;
                if current_found >= max_results {
                    should_stop.store(true, Ordering::Relaxed);
                }
            }

            result
        })
        .take_any_while(|_| !should_stop.load(Ordering::Relaxed))
        .collect();

    // Отправляем финальный прогресс
    let scanned_final = scanned.load(Ordering::Relaxed);
    let _ = app.emit(
        "search-progress",
        SearchProgress {
            scanned: scanned_final,
            found: results.len(),
            current_path: "".to_string(),
        },
    );

    let _ = app.emit("search-complete", results.len());

    Ok(results.into_iter().take(max_results).collect())
}

fn search_files_sync(options: SearchOptions) -> FsResult<Vec<SearchResult>> {
    let search_path = validate_path(&options.search_path)?;

    let max_results = options.max_results.unwrap_or(500) as usize;
    let max_depth = 10; // Ограничиваем глубину поиска
    // Hard cap to avoid OOM when walking huge directory trees.
    const MAX_WALK_ENTRIES: usize = 200_000;

    let found_count = Arc::new(AtomicUsize::new(0));
    let should_stop = Arc::new(AtomicBool::new(false));

    // Parallel streaming walk.
    let results: Vec<SearchResult> = WalkDir::new(search_path)
        .max_depth(max_depth)
        .follow_links(false)
        .into_iter()
        .filter_map(|e| e.ok())
        .take(MAX_WALK_ENTRIES)
        .par_bridge()
        .filter_map(|entry| {
            if should_stop.load(Ordering::Relaxed) {
                return None;
            }

            let result = process_search_entry(&entry, &options);

            if result.is_some() {
                let count = found_count.fetch_add(1, Ordering::Relaxed) + 1;
                if count >= max_results {
                    should_stop.store(true, Ordering::Relaxed);
                }
            }

            result
        })
        .take_any_while(|_| !should_stop.load(Ordering::Relaxed))
        .collect();

    Ok(results.into_iter().take(max_results).collect())
}

/// Обрабатывает одну запись для поиска
fn process_search_entry(
    entry: &walkdir::DirEntry,
    options: &SearchOptions,
) -> Option<SearchResult> {
    let path = entry.path();
    let query_lower = options.query.to_lowercase();

    let name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();

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
        name.to_lowercase().contains(&query_lower)
    };

    let mut content_matches = Vec::new();

    // Search content if enabled and it's a file
    if options.search_content && entry.file_type().is_file() {
        // Skip very large files to keep UX snappy (e.g., > 4 MB)
        const MAX_FILE_SIZE: u64 = 4 * 1024 * 1024;
        if let Ok(meta) = entry.metadata()
            && meta.len() > MAX_FILE_SIZE
        {
            return None;
        }

        if let Ok(file) = File::open(path) {
            let reader = BufReader::new(file);
            for (line_num, line) in reader.lines().enumerate() {
                let Ok(line) = line else { continue };

                let haystack_owned;
                let haystack = if options.case_sensitive {
                    line.as_str()
                } else {
                    haystack_owned = line.to_lowercase();
                    &haystack_owned
                };

                let needle = if options.case_sensitive {
                    options.query.as_str()
                } else {
                    query_lower.as_str()
                };

                if let Some(start) = haystack.find(needle) {
                    content_matches.push(ContentMatch {
                        line_number: (line_num + 1) as u64,
                        line_content: line,
                        match_start: start as u64,
                        match_end: (start + needle.len()) as u64,
                    });

                    if content_matches.len() >= 10 {
                        break;
                    }
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

#[tauri::command]
#[specta::specta]
pub async fn search_by_name(
    search_path: String,
    query: String,
    max_results: Option<u32>,
) -> Result<Vec<SearchResult>, String> {
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

#[tauri::command]
#[specta::specta]
pub async fn search_content(
    search_path: String,
    query: String,
    extensions: Option<Vec<String>>,
    max_results: Option<u32>,
) -> Result<Vec<SearchResult>, String> {
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
