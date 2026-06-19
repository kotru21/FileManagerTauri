//! File Manager Tauri Application Library
//!
//! This crate provides the backend functionality for the file manager,
//! including file operations, search, preview, and filesystem watching.

mod commands;
mod constants;
mod error;
mod models;
mod utils;

use commands::watcher::WatcherState;
use tauri_specta::{collect_commands, Builder};

/// Runs the Tauri application.
pub fn run() {
    let builder = Builder::<tauri::Wry>::new().commands(collect_commands![
        // File operations
        commands::file_ops::read_directory,
        commands::file_ops::read_directory_stream,
        commands::file_ops::get_drives,
        commands::file_ops::create_directory,
        commands::file_ops::create_file,
        commands::file_ops::delete_entries,
        commands::file_ops::rename_entry,
        commands::file_ops::copy_entries,
        commands::file_ops::copy_entries_parallel,
        commands::file_ops::move_entries,
        commands::file_ops::get_file_content,
        commands::file_ops::get_parent_path,
        commands::file_ops::path_exists,
        // Search
        commands::search::search_files,
        commands::search::search_files_stream,
        commands::search::search_by_name,
        commands::search::search_content,
        // Preview
        commands::preview::get_file_preview,
        commands::preview::get_thumbnail,
        // Watcher
        commands::watcher::watch_directory,
        commands::watcher::unwatch_directory,
        commands::watcher::unwatch_all,
    ]);

    #[cfg(debug_assertions)]
    builder
        .export(
            specta_typescript::Typescript::default()
                .header("/* eslint-disable */\n// @ts-nocheck\n")
                .bigint(specta_typescript::BigIntExportBehavior::Number),
            "../src/shared/api/tauri/bindings.ts",
        )
        .expect("Failed to export typescript bindings");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(WatcherState::new())
        .invoke_handler(builder.invoke_handler())
        .setup(move |app| {
            builder.mount_events(app);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
