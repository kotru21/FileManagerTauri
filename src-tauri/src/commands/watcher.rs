use notify::{recommended_watcher, Event, RecursiveMode, Watcher};
use serde::Serialize;
use specta::Type;
use std::collections::HashMap;
use std::path::Path;
use std::sync::{mpsc, Arc, Mutex};
use std::sync::atomic::{AtomicBool, Ordering};
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
    // Сначала останавливаем предыдущий watcher для этого пути, если есть
    {
        let flags = state.stop_flags.lock().map_err(|e| e.to_string())?;
        if let Some(flag) = flags.get(&path) {
            flag.store(true, Ordering::SeqCst);
        }
    }

    let (tx, rx) = mpsc::channel::<Result<Event, notify::Error>>();
    let stop_flag = Arc::new(AtomicBool::new(false));

    let mut watcher = recommended_watcher(tx).map_err(|e| e.to_string())?;

    watcher
        .watch(Path::new(&path), RecursiveMode::NonRecursive)
        .map_err(|e| e.to_string())?;

    // Сохраняем флаг для остановки
    {
        let mut flags = state.stop_flags.lock().map_err(|e| e.to_string())?;
        flags.insert(path.clone(), stop_flag.clone());
    }

    let path_for_cleanup = path.clone();
    let state_clone = state.inner().clone();

    // Храним watcher в отдельном потоке (блокирующий поток для mpsc)
    std::thread::spawn(move || {
        let _watcher = watcher; // keep alive

        loop {
            // Проверяем флаг остановки
            if stop_flag.load(Ordering::SeqCst) {
                break;
            }

            // Используем recv_timeout для периодической проверки флага
            match rx.recv_timeout(std::time::Duration::from_millis(100)) {
                Ok(Ok(e)) => {
                    let _ = app.emit(
                        "fs-change",
                        FsChangeEvent {
                            kind: format!("{:?}", e.kind),
                            paths: e.paths.iter().map(|p| p.to_string_lossy().to_string()).collect(),
                        },
                    );
                }
                Ok(Err(_)) => {
                    // Ошибка события, продолжаем
                }
                Err(mpsc::RecvTimeoutError::Timeout) => {
                    // Таймаут, проверяем флаг и продолжаем
                }
                Err(mpsc::RecvTimeoutError::Disconnected) => {
                    // Канал закрыт, выходим
                    break;
                }
            }
        }

        // Очищаем запись из state
        if let Ok(mut flags) = state_clone.stop_flags.lock() {
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
    let flags = state.stop_flags.lock().map_err(|e| e.to_string())?;
    
    if let Some(flag) = flags.get(&path) {
        flag.store(true, Ordering::SeqCst);
    }
    // Watcher для этого пути не найден, но это не ошибка
    Ok(())
}
