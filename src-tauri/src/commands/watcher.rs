use crate::commands::file_ops::validate_path;
use crate::commands::error::FsError;
use notify::{Event, RecursiveMode, Watcher, recommended_watcher};
use serde::Serialize;
use specta::Type;
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, mpsc};
use tauri::{AppHandle, Emitter, State};

#[derive(Debug, Clone, Serialize, Type)]
pub struct FsChangeEvent {
    pub kind: String,
    pub paths: Vec<String>,
}

/// Состояние для управления watchers
pub struct WatcherState {
    /// Флаги для остановки watchers по пути
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
pub async fn watch_directory(
    path: String,
    app: AppHandle,
    state: State<'_, Arc<WatcherState>>,
) -> Result<(), String> {
    // Validate path
    let validated_path = validate_path(&path).map_err(|e| e.to_public_string())?;
    let canonical_key = validated_path.to_string_lossy().to_string();

    // Сначала останавливается предыдущий watcher для этого пути, если есть
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

    //  флаг для остановки
    {
        let mut flags = state.stop_flags.lock().map_err(|_| FsError::Internal.to_public_string())?;
        flags.insert(canonical_key.clone(), stop_flag.clone());
    }

    let path_for_cleanup = canonical_key.clone();
    let state_clone = state.inner().clone();

    //  watcher в отдельном потоке (блокирующий поток для mpsc)
    std::thread::spawn(move || {
        let _watcher = watcher; // keep alive

        loop {
            // флаг остановки
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
                    // Ошибка события
                }
                Err(mpsc::RecvTimeoutError::Timeout) => {
                    // Таймаут
                }
                Err(mpsc::RecvTimeoutError::Disconnected) => {
                    // Канал закрыт
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
) -> Result<(), String> {
    // Validate path and use canonical form to lookup
    let validated = validate_path(&path).map_err(|e| e.to_public_string())?;
    let key = validated.to_string_lossy().to_string();

    let flags = state.stop_flags.lock().map_err(|e| e.to_string())?;
    if let Some(flag) = flags.get(&key) {
        flag.store(true, Ordering::SeqCst);
    }
    // Watcher для этого пути не найден, но это не ошибка
    Ok(())
}
