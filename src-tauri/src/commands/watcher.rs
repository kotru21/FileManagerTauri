//! Filesystem watcher for real-time directory updates.

use std::collections::HashMap;
use std::path::Path;
use std::sync::Mutex;

use notify::{recommended_watcher, Event, RecursiveMode, Watcher};
use tauri::{AppHandle, Emitter, Manager};

use crate::models::FsChangeEvent;

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
    let watch_path = path.clone();
    
    // Get watcher state
    let state = app.state::<WatcherState>();
    
    // Check if already watching this path
    {
        let watchers = state.watchers.lock().map_err(|e| e.to_string())?;
        if watchers.contains_key(&path) {
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
        watchers.insert(path, watcher);
    }
    
    Ok(())
}

/// Stops watching a specific directory.
#[tauri::command]
#[specta::specta]
pub async fn unwatch_directory(path: String, app: AppHandle) -> std::result::Result<(), String> {
    let state = app.state::<WatcherState>();
    let mut watchers = state.watchers.lock().map_err(|e| e.to_string())?;
    
    if let Some(mut watcher) = watchers.remove(&path) {
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