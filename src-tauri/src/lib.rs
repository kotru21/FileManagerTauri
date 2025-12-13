mod commands;

use commands::{
    copy_entries, copy_entries_parallel, create_directory, create_file, delete_entries, get_drives,
    get_directory_stats,
    get_file_content, get_file_preview, get_parent_path, move_entries, path_exists, read_directory,
    read_directory_stream, rename_entry, search_by_name, search_content, search_files,
    search_files_stream, unwatch_directory, watch_directory, watcher::WatcherState,
};
use std::sync::Arc;
use tauri_specta::{Builder, collect_commands};

pub fn run() {
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
        watch_directory,
        unwatch_directory,
        get_file_preview,
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
        .manage(Arc::new(WatcherState::new()))
        .invoke_handler(builder.invoke_handler())
        .setup(move |app| {
            builder.mount_events(app);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
