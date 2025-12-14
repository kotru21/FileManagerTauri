//! Commands module - exposes all Tauri commands for the file manager.

pub mod config;
pub mod error;
pub mod fs;
pub mod preview;
pub mod search;
pub mod types;
pub mod validation;
pub mod watcher;

use config::SecurityConfig;
use std::sync::{Arc, RwLock};

/// Type alias for the managed security config state.
pub type SecurityConfigState = Arc<RwLock<SecurityConfig>>;

/// Helper trait for extracting config from Tauri state.
pub trait ConfigExt {
    fn get_config(&self) -> Result<SecurityConfig, String>;
}

impl ConfigExt for tauri::State<'_, SecurityConfigState> {
    fn get_config(&self) -> Result<SecurityConfig, String> {
        self.read()
            .map(|guard| guard.clone())
            .map_err(|_| "Failed to read security config".to_string())
    }
}

