use notify::{recommended_watcher, Event, RecursiveMode, Watcher};
use serde::Serialize;
use specta::Type;
use std::path::Path;
use std::sync::mpsc;
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, Serialize, Type)]
pub struct FsChangeEvent {
    pub kind: String,
    pub paths: Vec<String>,
}

#[tauri::command]
#[specta::specta]
pub async fn watch_directory(path: String, app: AppHandle) -> Result<(), String> {
    let (tx, rx) = mpsc::channel::<Result<Event, notify::Error>>();

    let mut watcher = recommended_watcher(tx).map_err(|e| e.to_string())?;

    watcher
        .watch(Path::new(&path), RecursiveMode::NonRecursive)
        .map_err(|e| e.to_string())?;

    // Храним watcher в отдельном потоке, чтобы не дропнулся
    tokio::spawn(async move {
        let _watcher = watcher; // keep alive
        while let Ok(event) = rx.recv() {
            if let Ok(e) = event {
                let _ = app.emit(
                    "fs-change",
                    FsChangeEvent {
                        kind: format!("{:?}", e.kind),
                        paths: e.paths.iter().map(|p| p.to_string_lossy().to_string()).collect(),
                    },
                );
            }
        }
    });

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn unwatch_directory() -> Result<(), String> {
    // В будущем можно добавить управление state для остановки watcher
    Ok(())
}
