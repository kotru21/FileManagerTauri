//! Filesystem watcher for real-time directory updates.

use std::path::Path;
use std::sync::mpsc;

use notify::{recommended_watcher, RecursiveMode, Watcher};
use tauri::{AppHandle, Emitter};

use crate::models::FsChangeEvent;

/// Starts watching a directory for filesystem changes.
#[tauri::command]
#[specta::specta]
pub async fn watch_directory(path: String, app: AppHandle) -> Result<(), String> {
    let (tx, rx) = mpsc::channel();

    let mut watcher = recommended_watcher(tx).map_err(|e| e.to_string())?;

    watcher
        .watch(Path::new(&path), RecursiveMode::NonRecursive)
        .map_err(|e| e.to_string())?;

    // Spawn a thread to keep the watcher alive and process events
    std::thread::spawn(move || {
        let _watcher = watcher; // Keep watcher alive

        while let Ok(event) = rx.recv() {
            if let Ok(e) = event {
                let _ = app.emit(
                    "fs-change",
                    FsChangeEvent {
                        kind: format!("{:?}", e.kind),
                        paths: e
                            .paths
                            .iter()
                            .map(|p| p.to_string_lossy().to_string())
                            .collect(),
                    },
                );
            }
        }
    });

    Ok(())
}

/// Stops watching directories.
///
/// Note: Currently a placeholder. State management for watchers
/// should be implemented for proper cleanup.
#[tauri::command]
#[specta::specta]
pub async fn unwatch_directory() -> Result<(), String> {
    // TODO: Implement watcher state management for proper cleanup
    Ok(())
}