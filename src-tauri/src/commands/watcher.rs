use crate::commands::file_ops::validate_path_sandboxed_with_cfg;
use crate::commands::config::SecurityConfig;
use std::sync::RwLock;
use crate::commands::error::FsError;
use notify::{Event, RecursiveMode, Watcher, recommended_watcher};
use serde::Serialize;
use specta::Type;
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, mpsc};
use tauri::{AppHandle, Emitter, State};
use tracing::instrument;

#[derive(Debug, Clone, Serialize, Type)]
pub struct FsChangeEvent {
    pub kind: String,
    pub paths: Vec<String>,
}

/// State for managing watchers
pub struct WatcherState {
    /// Stop flags for watchers per path
    stop_flags: Mutex<HashMap<String, Arc<AtomicBool>>>, 
}

impl WatcherState {
    pub fn new() -> Self {
        Self {
            stop_flags: Mutex::new(HashMap::new()),
        }
    }
}

impl Default for WatcherState {
    fn default() -> Self {
        Self::new()
    }
}

#[tauri::command]
#[specta::specta]
#[instrument(skip(path, app, state))]
pub async fn watch_directory(
    path: String,
    app: AppHandle,
    state: State<'_, Arc<WatcherState>>,
    config_state: State<'_, Arc<RwLock<SecurityConfig>>>,
) -> Result<(), String> {
    // Validate path
    let cfg = config_state
        .read()
        .map_err(|_| FsError::Internal.to_public_string())?
        .clone();
    let validated_path = validate_path_sandboxed_with_cfg(&path, &cfg).map_err(|e| e.to_public_string())?;
    let canonical_key = validated_path.to_string_lossy().to_string();

    tracing::debug!(path = %canonical_key, "Starting watch for path");
    // First stop the previous watcher for this path if one exists
    {
        let flags = state.stop_flags.lock().map_err(|_| FsError::Internal.to_public_string())?;
        // We store stop flags by canonical (validated) path key.
        if let Some(flag) = flags.get(&canonical_key) {
            flag.store(true, Ordering::SeqCst);
        }
    }

    let (tx, rx) = mpsc::channel::<Result<Event, notify::Error>>();
    let stop_flag = Arc::new(AtomicBool::new(false));

    let mut watcher = recommended_watcher(tx).map_err(|_| FsError::Internal.to_public_string())?;

    watcher
        .watch(validated_path.as_path(), RecursiveMode::NonRecursive)
        .map_err(|_| FsError::Io.to_public_string())?;

    // Stop flag
    {
        let mut flags = state.stop_flags.lock().map_err(|_| FsError::Internal.to_public_string())?;
        flags.insert(canonical_key.clone(), stop_flag.clone());
    }

    let path_for_cleanup = canonical_key.clone();
    let state_clone = state.inner().clone();

    // Watcher runs in a separate thread (blocking mpsc receiver)
    std::thread::spawn(move || {
        let _watcher = watcher; // keep alive

        loop {
            // Stop flag
            if stop_flag.load(Ordering::SeqCst) {
                break;
            }

            // recv_timeout для периодической проверки флага
            match rx.recv_timeout(std::time::Duration::from_millis(100)) {
                Ok(Ok(e)) => {
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
                Ok(Err(_)) => {
                    // Event error
                }
                Err(mpsc::RecvTimeoutError::Timeout) => {
                    // Timeout
                }
                Err(mpsc::RecvTimeoutError::Disconnected) => {
                    // Channel closed
                    break;
                }
            }
        }

        if let Ok(mut flags) = state_clone.stop_flags.lock()
            && let Some(current) = flags.get(&path_for_cleanup)
            && Arc::ptr_eq(current, &stop_flag)
        {
            // Do not remove a newer watcher stop flag.
            flags.remove(&path_for_cleanup);
        }
    });

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn unwatch_directory(
    path: String,
    state: State<'_, Arc<WatcherState>>,
    config_state: State<'_, Arc<RwLock<SecurityConfig>>>,
) -> Result<(), String> {
    // Validate path and use canonical form to lookup
    let cfg = config_state
        .read()
        .map_err(|_| FsError::Internal.to_public_string())?
        .clone();
    let validated = validate_path_sandboxed_with_cfg(&path, &cfg).map_err(|e| e.to_public_string())?;
    let key = validated.to_string_lossy().to_string();

    tracing::debug!(path = %key, "unwatch_directory called");
    let flags = state.stop_flags.lock().map_err(|e| e.to_string())?;
    if let Some(flag) = flags.get(&key) {
        flag.store(true, Ordering::SeqCst);
    }
    // Watcher for this path not found, but it's not an error
    Ok(())
}
