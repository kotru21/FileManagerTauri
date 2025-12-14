//! File system change watching.

use crate::commands::error::FsError;
use crate::commands::validation::validate_path;

use notify::{Event, RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use specta::Type;
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{mpsc, Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Emitter, State};
use tracing::instrument;

#[derive(Debug, Clone, Serialize, Type)]
pub struct FsChangeEvent {
    pub kind: String,
    pub paths: Vec<String>,
}

pub struct WatcherState {
    stop_flags: Mutex<HashMap<String, Arc<AtomicBool>>>,
}

impl WatcherState {
    pub fn new() -> Self {
        Self { stop_flags: Mutex::new(HashMap::new()) }
    }
}

impl Default for WatcherState {
    fn default() -> Self { Self::new() }
}

#[tauri::command]
#[specta::specta]
#[instrument(skip(app, state))]
pub async fn watch_directory(path: String, app: AppHandle, state: State<'_, Arc<WatcherState>>) -> Result<(), String> {
    let validated = validate_path(&path).map_err(|e| e.to_public_string())?;
    let key = validated.to_string_lossy().to_string();
    tracing::debug!(path = %key, "Starting directory watch");
    {
        let flags = state.stop_flags.lock().map_err(|_| FsError::Internal.to_public_string())?;
        if let Some(flag) = flags.get(&key) { flag.store(true, Ordering::SeqCst); }
    }
    let (tx, rx) = mpsc::channel::<Result<Event, notify::Error>>();
    let stop_flag = Arc::new(AtomicBool::new(false));
    let mut watcher: RecommendedWatcher = notify::recommended_watcher(tx).map_err(|_| FsError::Internal.to_public_string())?;
    watcher.watch(validated.as_path(), RecursiveMode::NonRecursive).map_err(|e| FsError::io(e.to_string()).to_public_string())?;
    {
        let mut flags = state.stop_flags.lock().map_err(|_| FsError::Internal.to_public_string())?;
        flags.insert(key.clone(), stop_flag.clone());
    }
    let cleanup_key = key.clone();
    let state_clone = state.inner().clone();
    let stop_flag_clone = stop_flag.clone();
    std::thread::spawn(move || {
        let _watcher = watcher;
        loop {
            if stop_flag.load(Ordering::SeqCst) { break; }
            match rx.recv_timeout(Duration::from_millis(100)) {
                Ok(Ok(event)) => {
                    let kind = format!("{:?}", event.kind);
                    let paths: Vec<String> = event.paths.iter().map(|p| p.to_string_lossy().to_string()).collect();
                    let _ = app.emit("fs-change", FsChangeEvent { kind, paths });
                }
                Ok(Err(e)) => { tracing::warn!(error = %e, "Watcher error"); }
                Err(mpsc::RecvTimeoutError::Timeout) => {}
                Err(mpsc::RecvTimeoutError::Disconnected) => break,
            }
        }
        if let Ok(mut flags) = state_clone.stop_flags.lock() {
            if let Some(current) = flags.get(&cleanup_key) {
                if Arc::ptr_eq(current, &stop_flag_clone) { flags.remove(&cleanup_key); }
            }
        }
        tracing::debug!(path = %cleanup_key, "Directory watch stopped");
    });
    Ok(())
}

#[tauri::command]
#[specta::specta]
#[instrument(skip(state))]
pub async fn unwatch_directory(path: String, state: State<'_, Arc<WatcherState>>) -> Result<(), String> {
    let validated = validate_path(&path).map_err(|e| e.to_public_string())?;
    let key = validated.to_string_lossy().to_string();
    tracing::debug!(path = %key, "Stopping directory watch");
    let flags = state.stop_flags.lock().map_err(|e| e.to_string())?;
    if let Some(flag) = flags.get(&key) { flag.store(true, Ordering::SeqCst); }
    Ok(())
}