mod commands;

use commands::{
    copy_entries, copy_entries_parallel, create_directory, create_file, delete_entries, get_drives,
    get_directory_stats,
    get_file_content, get_file_preview, get_parent_path, move_entries, path_exists, read_directory,
    read_directory_stream, rename_entry, search_by_name, search_content, search_files,
    search_files_stream, unwatch_directory, watch_directory, watcher::WatcherState,
    set_security_config_command,
    get_security_config_command,
};
use commands::config::SecurityConfig;
use std::sync::{Arc, RwLock};
use tauri_specta::{Builder, collect_commands};
// sysinfo is used via fully-qualified paths where needed
// tracing_subscriber prelude not needed directly; using builder APIs in run()

pub fn run() {
    // Initialize tracing subscriber (structured logs)
    let _ = tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .with_target(false)
        .try_init();

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
        set_security_config_command,
        get_security_config_command,
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

    // Initialize default security config and manage it with tauri State
    // Extend allowed_roots with currently mounted disks (so drives like C:\ are accessible)
    let mut sec_cfg = SecurityConfig::default_windows();
    {
        let disks = sysinfo::Disks::new_with_refreshed_list();
        for d in &disks {
            let mount_point = d.mount_point().to_path_buf();
            if !sec_cfg.allowed_roots.contains(&mount_point) {
                sec_cfg.allowed_roots.push(mount_point);
            }
        }
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(Arc::new(WatcherState::new()))
        .manage(Arc::new(RwLock::new(sec_cfg)))
        .invoke_handler(builder.invoke_handler())
        .setup(move |app| {
            builder.mount_events(app);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
