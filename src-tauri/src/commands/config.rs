use std::path::PathBuf;
use std::sync::RwLock;
use serde::{Deserialize, Serialize};
use specta::Type;
use std::sync::Arc;
use tauri::State;

pub mod limits {
    pub const MAX_DIRECTORY_DEPTH: usize = 100;
    pub const STREAM_BATCH_SIZE: usize = 100;
    pub const SEARCH_PROGRESS_INTERVAL: usize = 100;
    pub const MAX_WALK_ENTRIES: usize = 200_000;
    pub const MAX_PREVIEW_CHARS: usize = 10_000;
    pub const MAX_PREVIEW_IMAGE_BYTES: u64 = 5 * 1024 * 1024;
    pub const MAX_CONTENT_FILE_SIZE: u64 = 10 * 1024 * 1024;
    pub const MAX_SEARCH_FILE_SIZE: u64 = 4 * 1024 * 1024;
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SecurityConfig {
    pub allowed_roots: Vec<PathBuf>,
    pub denied_patterns: Vec<String>,
}

impl SecurityConfig {
    pub fn default_windows() -> Self {
        Self {
            allowed_roots: vec![
                dirs::home_dir().unwrap_or_default(),
                std::env::temp_dir(),
                dirs::document_dir().unwrap_or_default(),
                dirs::download_dir().unwrap_or_default(),
            ],
            denied_patterns: vec![
                "**/Windows/System32/**".to_string(),
                "**/Program Files/**".to_string(),
            ],
        }
    }
}

// No global config - application should manage config in Tauri State<Arc<RwLock<SecurityConfig>>>.
// Legacy global config was removed in favor of state-managed configuration for greater
// auditability and to avoid global mutable state across tauri commands.

 
/// Tauri command for updating the runtime security configuration. This updates
/// both the global config (for legacy code) and the application-managed state.
#[tauri::command]
#[specta::specta]
pub fn set_security_config_command(
    cfg: SecurityConfig,
    config_state: State<'_, Arc<RwLock<SecurityConfig>>>,
) -> Result<(), String> {
    // Legacy global config removed; update the managed state only.
    // If the app manages a state RwLock for the config, update that too.
    let mut w = config_state.write().map_err(|_| "Failed to acquire config write lock".to_string())?;
    *w = cfg;
    Ok(())
}

/// Returns the current security config (managed state) for frontend consumption.
#[tauri::command]
#[specta::specta]
pub fn get_security_config_command(config_state: State<'_, Arc<RwLock<SecurityConfig>>>) -> Result<SecurityConfig, String> {
    let cfg = config_state.read().map_err(|_| "Failed to read security config".to_string())?.clone();
    Ok(cfg)
}
