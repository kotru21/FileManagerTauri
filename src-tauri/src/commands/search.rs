//! File and content search functionality.

use crate::commands::config::limits;
use crate::commands::error::FsResult;
use crate::commands::fs::run_blocking;
use crate::commands::validation::validate_path;

use rayon::iter::ParallelBridge;
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use specta::Type;
use std::fs::File;
use std::io::{BufRead, BufReader};
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tracing::instrument;
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SearchResult {
    pub path: String,
    pub name: String,
    pub name_lower: String,
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
#[instrument(skip(options))]
pub async fn search_files(options: SearchOptions) -> Result<Vec<SearchResult>, String> {
    run_blocking(move || search_sync(&options, None)).await
}

#[tauri::command]
#[specta::specta]
#[instrument(skip(options, app))]
pub async fn search_files_stream(options: SearchOptions, app: AppHandle) -> Result<Vec<SearchResult>, String> {
    run_blocking(move || search_sync(&options, Some(app))).await
}

fn search_sync(options: &SearchOptions, app: Option<AppHandle>) -> FsResult<Vec<SearchResult>> {
    let search_path = validate_path(&options.search_path)?;
    let max_results = options.max_results.unwrap_or(500) as usize;
    let scanned = Arc::new(AtomicUsize::new(0));
    let found = Arc::new(AtomicUsize::new(0));
    let should_stop = Arc::new(AtomicBool::new(false));
    let query_lower = if options.case_sensitive { options.query.clone() } else { options.query.to_lowercase() };

    if let Some(ref app) = app {
        let _ = app.emit("search-progress", SearchProgress { scanned: 0, found: 0, current_path: options.search_path.clone() });
    }

    let results: Vec<SearchResult> = WalkDir::new(&search_path)
        .max_depth(limits::DEFAULT_SEARCH_DEPTH)
        .follow_links(false)
        .into_iter()
        .filter_map(|e| e.ok())
        .take(limits::MAX_WALK_ENTRIES)
        .par_bridge()
        .filter_map(|entry| {
            if should_stop.load(Ordering::Relaxed) { return None; }
            let current_scanned = scanned.fetch_add(1, Ordering::Relaxed) + 1;
            if let Some(ref app) = app {
                if current_scanned % limits::SEARCH_PROGRESS_INTERVAL == 0 {
                    let _ = app.emit("search-progress", SearchProgress {
                        scanned: current_scanned,
                        found: found.load(Ordering::Relaxed),
                        current_path: entry.path().to_string_lossy().to_string(),
                    });
                }
            }
            let result = process_entry(&entry, options, &query_lower);
            if result.is_some() {
                let current_found = found.fetch_add(1, Ordering::Relaxed) + 1;
                if current_found >= max_results { should_stop.store(true, Ordering::Relaxed); }
            }
            result
        })
        .take_any_while(|_| !should_stop.load(Ordering::Relaxed))
        .collect();

    if let Some(ref app) = app {
        let _ = app.emit("search-progress", SearchProgress { scanned: scanned.load(Ordering::Relaxed), found: results.len(), current_path: String::new() });
        let _ = app.emit("search-complete", results.len());
    }
    Ok(results.into_iter().take(max_results).collect())
}

fn process_entry(entry: &walkdir::DirEntry, options: &SearchOptions, query_lower: &str) -> Option<SearchResult> {
    let path = entry.path();
    let name = path.file_name()?.to_str()?.to_string();
    let name_lower = name.to_lowercase();
    if let Some(ref extensions) = options.file_extensions {
        if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
            if !extensions.iter().any(|e| e.eq_ignore_ascii_case(ext)) { return None; }
        } else if !entry.file_type().is_dir() { return None; }
    }
    let name_matches = if options.case_sensitive { name.contains(&options.query) } else { name_lower.contains(query_lower) };
    let content_matches = if options.search_content && entry.file_type().is_file() {
        search_file_content(path, options, query_lower)
    } else { Vec::new() };
    if name_matches || !content_matches.is_empty() {
        Some(SearchResult { path: path.to_string_lossy().to_string(), name, name_lower, is_dir: entry.file_type().is_dir(), matches: content_matches })
    } else { None }
}

fn search_file_content(path: &std::path::Path, options: &SearchOptions, query_lower: &str) -> Vec<ContentMatch> {
    let meta = match std::fs::metadata(path) { Ok(m) => m, Err(_) => return Vec::new() };
    if meta.len() > limits::MAX_SEARCH_FILE_SIZE { return Vec::new(); }
    let file = match File::open(path) { Ok(f) => f, Err(_) => return Vec::new() };
    let reader = BufReader::new(file);
    let mut matches = Vec::new();
    const MAX_MATCHES_PER_FILE: usize = 10;
    for (line_num, line) in reader.lines().enumerate() {
        let line = match line { Ok(l) => l, Err(_) => continue };
        let haystack = if options.case_sensitive { line.clone() } else { line.to_lowercase() };
        let needle = if options.case_sensitive { options.query.as_str() } else { query_lower };
        if let Some(start) = haystack.find(needle) {
            matches.push(ContentMatch { line_number: (line_num + 1) as u64, line_content: line, match_start: start as u64, match_end: (start + needle.len()) as u64 });
            if matches.len() >= MAX_MATCHES_PER_FILE { break; }
        }
    }
    matches
}

#[tauri::command]
#[specta::specta]
pub async fn search_by_name(search_path: String, query: String, max_results: Option<u32>) -> Result<Vec<SearchResult>, String> {
    search_files(SearchOptions { query, search_path, search_content: false, case_sensitive: false, max_results, file_extensions: None }).await
}

#[tauri::command]
#[specta::specta]
pub async fn search_content(search_path: String, query: String, extensions: Option<Vec<String>>, max_results: Option<u32>) -> Result<Vec<SearchResult>, String> {
    search_files(SearchOptions { query, search_path, search_content: true, case_sensitive: false, max_results, file_extensions: extensions }).await
}