use serde::{Deserialize, Serialize};
use specta::Type;
use std::path::Path;
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

#[tauri::command]
#[specta::specta]
pub async fn search_files(options: SearchOptions) -> Result<Vec<SearchResult>, String> {
    let search_path = Path::new(&options.search_path);
    
    if !search_path.exists() {
        return Err("Search path does not exist".to_string());
    }

    let mut results = Vec::new();
    let max_results = options.max_results.unwrap_or(1000) as usize;
    let query_lower = options.query.to_lowercase();

    for entry in WalkDir::new(search_path)
        .follow_links(false)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if results.len() >= max_results {
            break;
        }

        let path = entry.path();
        let name = path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();

        // Filter by extension if specified
        if let Some(ref extensions) = options.file_extensions {
            if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                if !extensions.iter().any(|e| e.eq_ignore_ascii_case(ext)) {
                    continue;
                }
            } else if !entry.file_type().is_dir() {
                continue;
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
            if let Ok(content) = std::fs::read_to_string(path) {
                for (line_num, line) in content.lines().enumerate() {
                    let matches = if options.case_sensitive {
                        line.contains(&options.query)
                    } else {
                        line.to_lowercase().contains(&query_lower)
                    };

                    if matches {
                        let search_in = if options.case_sensitive {
                            line.to_string()
                        } else {
                            line.to_lowercase()
                        };
                        
                        let search_for = if options.case_sensitive {
                            &options.query
                        } else {
                            &query_lower
                        };

                        if let Some(start) = search_in.find(search_for) {
                            content_matches.push(ContentMatch {
                                line_number: (line_num + 1) as u64,
                                line_content: line.to_string(),
                                match_start: start as u64,
                                match_end: (start + options.query.len()) as u64,
                            });
                        }

                        if content_matches.len() >= 10 {
                            break;
                        }
                    }
                }
            }
        }

        if name_matches || !content_matches.is_empty() {
            results.push(SearchResult {
                path: path.to_string_lossy().to_string(),
                name,
                is_dir: entry.file_type().is_dir(),
                matches: content_matches,
            });
        }
    }

    Ok(results)
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
    }).await
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
    }).await
}
