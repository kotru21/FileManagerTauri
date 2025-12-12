use std::path::PathBuf;
use std::sync::RwLock;

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

#[derive(Debug, Clone)]
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

lazy_static::lazy_static! {
    static ref GLOBAL_SECURITY_CONFIG: RwLock<SecurityConfig> =
        RwLock::new(SecurityConfig::default_windows());
}

pub fn get_security_config() -> SecurityConfig {
    GLOBAL_SECURITY_CONFIG.read().unwrap().clone()
}

#[cfg(test)]
pub fn override_security_config(cfg: SecurityConfig) {
    let mut w = GLOBAL_SECURITY_CONFIG.write().unwrap();
    *w = cfg;
}
