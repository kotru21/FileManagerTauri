//! Security and operational configuration for the file manager.

use serde::{Deserialize, Serialize};
use specta::Type;
use std::path::PathBuf;
use std::sync::{Arc, RwLock};
use tauri::State;

/// Operational limits to prevent resource exhaustion.
pub mod limits {
    /// Maximum directory traversal depth.
    pub const MAX_DIRECTORY_DEPTH: usize = 100;
    /// Batch size for streaming directory contents.
    pub const STREAM_BATCH_SIZE: usize = 100;
    /// Progress update interval for search operations.
    pub const SEARCH_PROGRESS_INTERVAL: usize = 100;
    /// Maximum entries to walk during search.
    pub const MAX_WALK_ENTRIES: usize = 200_000;
    /// Maximum characters for text preview.
    pub const MAX_PREVIEW_CHARS: usize = 10_000;
    /// Maximum image file size for preview (5 MB).
    pub const MAX_PREVIEW_IMAGE_BYTES: u64 = 5 * 1024 * 1024;
    /// Maximum file size for content reading (10 MB).
    pub const MAX_CONTENT_FILE_SIZE: u64 = 10 * 1024 * 1024;
    /// Maximum file size for content search (4 MB).
    pub const MAX_SEARCH_FILE_SIZE: u64 = 4 * 1024 * 1024;
    /// Default search depth.
    pub const DEFAULT_SEARCH_DEPTH: usize = 10;
    /// Maximum parallel copy operations.
    pub const MAX_PARALLEL_COPIES: usize = 16;
}

/// Security configuration for sandboxing file operations.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SecurityConfig {
    /// Allowed root directories for file operations.
    pub allowed_roots: Vec<PathBuf>,
    /// Glob patterns for denied paths.
    pub denied_patterns: Vec<String>,
}

impl SecurityConfig {
    /// Create default security config with common safe directories.
    pub fn default_config() -> Self {
        let mut roots = Vec::new();

        if let Some(home) = dirs::home_dir() {
            roots.push(home);
        }
        if let Some(docs) = dirs::document_dir() {
            roots.push(docs);
        }
        if let Some(downloads) = dirs::download_dir() {
            roots.push(downloads);
        }
        roots.push(std::env::temp_dir());

        Self {
            allowed_roots: roots,
            denied_patterns: Self::default_denied_patterns(),
        }
    }

    fn default_denied_patterns() -> Vec<String> {
        #[cfg(windows)]
        {
            vec![
                "**/Windows/System32/**".to_string(),
                "**/Windows/SysWOW64/**".to_string(),
                "**/Program Files/**".to_string(),
                "**/Program Files (x86)/**".to_string(),
                "**/ProgramData/**".to_string(),
            ]
        }
        #[cfg(not(windows))]
        {
            vec![
                "/etc/**".to_string(),
                "/usr/**".to_string(),
                "/bin/**".to_string(),
                "/sbin/**".to_string(),
                "/var/**".to_string(),
                "/proc/**".to_string(),
                "/sys/**".to_string(),
            ]
        }
    }

    /// Extend allowed roots with mounted disks.
    pub fn with_mounted_disks(mut self) -> Self {
        let disks = sysinfo::Disks::new_with_refreshed_list();
        for disk in &disks {
            let mount = disk.mount_point().to_path_buf();
            if !self.allowed_roots.contains(&mount) {
                self.allowed_roots.push(mount);
            }
        }
        self
    }
}

impl Default for SecurityConfig {
    fn default() -> Self {
        Self::default_config()
    }
}

/// Update the runtime security configuration.
#[tauri::command]
#[specta::specta]
pub fn set_security_config(
    cfg: SecurityConfig,
    state: State<'_, Arc<RwLock<SecurityConfig>>>,
) -> Result<(), String> {
    let mut guard = state
        .write()
        .map_err(|_| "Failed to acquire config lock")?;
    *guard = cfg;
    tracing::info!("Security config updated");
    Ok(())
}

/// Get the current security configuration.
#[tauri::command]
#[specta::specta]
pub fn get_security_config(
    state: State<'_, Arc<RwLock<SecurityConfig>>>,
) -> Result<SecurityConfig, String> {
    state
        .read()
        .map(|guard| guard.clone())
        .map_err(|_| "Failed to read security config".to_string())
}