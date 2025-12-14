//! File Manager Tauri application library.
//!
//! This module initializes the Tauri application with all file system
//! commands and proper security configuration.

mod commands;

use commands::{
    config::{get_security_config, set_security_config, SecurityConfig},
    fs::{
        copy_entries, copy_entries_parallel, create_directory, create_file,
        delete_entries, get_directory_stats, get_drives, get_file_content,
        get_parent_path, move_entries, path_exists, read_directory,
        read_directory_stream, rename_entry,
    },
    preview::get_file_preview,
    search::{search_by_name, search_content, search_files, search_files_stream},
    watcher::{unwatch_directory, watch_directory, WatcherState},
    SecurityConfigState,
};
use std::sync::{Arc, RwLock};
use tauri_specta::{collect_commands, Builder};

/// Initialize and run the Tauri application.
pub fn run() {
    // Initialize structured logging
    let _ = tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .with_target(false)
        .try_init();

    tracing::info!("Starting File Manager application");

    // Build Specta type definitions
    let builder = Builder::<tauri::Wry>::new().commands(collect_commands![
        read_directory,
        get_directory_stats,
        read_directory_stream,
        get_drives,
        create_directory,
        create_file,
        delete_entries,
        rename_entry,
        copy_entries,
        copy_entries_parallel,
        move_entries,
        get_file_content,
        get_parent_path,
        path_exists,
        search_files,
        search_files_stream,
        search_by_name,
        search_content,
        set_security_config,
        get_security_config,
        watch_directory,
        unwatch_directory,
        get_file_preview,
    ]);

    // Export TypeScript bindings in debug builds
    #[cfg(debug_assertions)]
    builder
        .export(
            specta_typescript::Typescript::default()
                .header("/* eslint-disable */\n// @ts-nocheck\n")
                .bigint(specta_typescript::BigIntExportBehavior::Number),
            "../src/shared/api/tauri/bindings.ts",
        )
        .expect("Failed to export TypeScript bindings");

    // Initialize security configuration with mounted disks
    let security_config: SecurityConfigState = Arc::new(RwLock::new(
        SecurityConfig::default_config().with_mounted_disks(),
    ));

    tracing::debug!(
        roots = ?security_config.read().map(|c| c.allowed_roots.len()).unwrap_or(0),
        "Security config initialized"
    );

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(Arc::new(WatcherState::new()))
        .manage(security_config)
        .invoke_handler(builder.invoke_handler())
        .setup(move |app| {
            builder.mount_events(app);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Error while running Tauri application");
}