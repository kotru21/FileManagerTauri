//! File Manager Tauri Application Library
//!
//! This crate provides the backend functionality for the file manager,
//! including file operations, search, preview, and filesystem watching.

mod commands;
mod constants;
mod error;
mod models;
mod utils;

use tauri_specta::{collect_commands, Builder};

/// Runs the Tauri application.
pub fn run() {
    let builder = Builder::<tauri::Wry>::new()
        .commands(collect_commands![
            // File operations
            commands::read_directory,
            commands::read_directory_stream,
            commands::get_drives,
            commands::create_directory,
            commands::create_file,
            commands::delete_entries,
            commands::rename_entry,
            commands::copy_entries,
            commands::copy_entries_parallel,
            commands::move_entries,
            commands::get_file_content,
            commands::get_parent_path,
            commands::path_exists,
            // Search
            commands::search_files,
            commands::search_files_stream,
            commands::search_by_name,
            commands::search_content,
            // Preview
            commands::get_file_preview,
            // Watcher
            commands::watch_directory,
            commands::unwatch_directory,
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
        .invoke_handler(builder.invoke_handler())
        .setup(move |app| {
            builder.mount_events(app);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}