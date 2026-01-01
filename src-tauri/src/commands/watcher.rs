//! Filesystem watcher for real-time directory updates.

use std::collections::HashMap;
use std::path::Path;
use std::sync::Mutex;

use notify::{recommended_watcher, Event, RecursiveMode, Watcher};
use tauri::{AppHandle, Emitter, Manager};

use crate::error::FileManagerError;
use crate::models::FsChangeEvent;

fn normalize_watch_key(raw: &str) -> String {
    let trimmed = raw.trim();
    let mut s = trimmed.replace('\\', "/");

    // Strip Windows extended-length prefixes to avoid duplicate keys.
    // Examples:
    // - \\?\C:\\Path -> C:\\Path
    // - \\?\UNC\\server\\share -> \\server\\share
    #[cfg(windows)]
    {
        if let Some(rest) = s.strip_prefix("\\\\?\\UNC\\") {
            s = format!("\\\\{}", rest);
        } else if let Some(rest) = s.strip_prefix("\\\\?\\") {
            s = rest.to_string();
        }
    }

    // Collapse repeated slashes (preserve UNC prefix).
    if s.starts_with("//") {
        let tail = s[2..].to_string();
        s = format!(
            "//{}",
            tail.split('/')
                .filter(|p| !p.is_empty())
                .collect::<Vec<_>>()
                .join("/")
        );
    } else {
        s = s
            .split('/')
            .filter(|p| !p.is_empty())
            .collect::<Vec<_>>()
            .join("/");
        // Keep a leading slash for POSIX absolute paths.
        if trimmed.starts_with('/') {
            s = format!("/{}", s);
        }
    }

    // Trim trailing separators, but keep drive roots like "c:/".
    while s.ends_with('/') {
        #[cfg(windows)]
        {
            let bytes = s.as_bytes();
            if bytes.len() == 3 && bytes[1] == b':' && bytes[2] == b'/' {
                break;
            }
        }

        if s == "/" {
            break;
        }
        s.pop();
    }

    // Windows is typically case-insensitive; normalize to lower-case to avoid duplicate watcher keys.
    #[cfg(windows)]
    {
        s = s.to_ascii_lowercase();
    }

    s
}

/// Global state for managing filesystem watchers.
pub struct WatcherState {
    watchers: Mutex<HashMap<String, notify::RecommendedWatcher>>,
}

impl WatcherState {
    pub fn new() -> Self {
        Self {
            watchers: Mutex::new(HashMap::new()),
        }
    }
}

impl Default for WatcherState {
    fn default() -> Self {
        Self::new()
    }
}

/// Starts watching a directory for filesystem changes.
#[tauri::command]
#[specta::specta]
pub async fn watch_directory(path: String, app: AppHandle) -> std::result::Result<(), String> {
    if path.trim().is_empty() {
        return Err(FileManagerError::EmptyPath.to_string());
    }

    let watch_path = path.clone();
    let key = normalize_watch_key(&watch_path);

    let watch_path_ref = Path::new(&watch_path);
    if !watch_path_ref.is_absolute() {
        return Err(FileManagerError::NotAbsolutePath(watch_path).to_string());
    }
    if !watch_path_ref.exists() {
        return Err(FileManagerError::DirectoryNotFound(watch_path).to_string());
    }
    if !watch_path_ref.is_dir() {
        return Err(FileManagerError::NotADirectory(watch_path).to_string());
    }

    // Get watcher state
    let state = app.state::<WatcherState>();

    // Check if already watching this path
    {
        let watchers = state.watchers.lock().map_err(|e| e.to_string())?;
        if watchers.contains_key(&key) {
            return Ok(()); // Already watching
        }
    }

    let app_clone = app.clone();

    let mut watcher = recommended_watcher(move |res: std::result::Result<Event, notify::Error>| {
        if let Ok(event) = res {
            // Debounce rapid events by checking event kind
            let kind_str = format!("{:?}", event.kind);

            // Skip noisy events
            if kind_str.contains("Access") {
                return;
            }

            let _ = app_clone.emit(
                "fs-change",
                FsChangeEvent {
                    kind: kind_str,
                    paths: event
                        .paths
                        .iter()
                        .map(|p| p.to_string_lossy().to_string())
                        .collect(),
                },
            );
        }
    })
    .map_err(|e| e.to_string())?;

    watcher
        .watch(Path::new(&watch_path), RecursiveMode::NonRecursive)
        .map_err(|e| e.to_string())?;

    // Store watcher in state
    {
        let mut watchers = state.watchers.lock().map_err(|e| e.to_string())?;
        watchers.insert(key, watcher);
    }

    Ok(())
}

/// Stops watching a specific directory.
#[tauri::command]
#[specta::specta]
pub async fn unwatch_directory(path: String, app: AppHandle) -> std::result::Result<(), String> {
    let state = app.state::<WatcherState>();
    let mut watchers = state.watchers.lock().map_err(|e| e.to_string())?;

    let key = normalize_watch_key(&path);

    if let Some(mut watcher) = watchers.remove(&key) {
        let _ = watcher.unwatch(Path::new(&path));
    }

    Ok(())
}

/// Stops watching all directories. Called on app cleanup.
#[tauri::command]
#[specta::specta]
pub async fn unwatch_all(app: AppHandle) -> std::result::Result<(), String> {
    let state = app.state::<WatcherState>();
    let mut watchers = state.watchers.lock().map_err(|e| e.to_string())?;
    watchers.clear();
    Ok(())
}
