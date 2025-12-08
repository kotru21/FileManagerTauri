mod commands;

use commands::{
    copy_entries, create_directory, create_file, delete_entries, get_drives,
    get_file_content, get_parent_path, move_entries, path_exists, read_directory,
    rename_entry, search_by_name, search_content, search_files,
};
use tauri_specta::{collect_commands, Builder};

pub fn run() {
    let builder = Builder::<tauri::Wry>::new()
        .commands(collect_commands![
            read_directory,
            get_drives,
            create_directory,
            create_file,
            delete_entries,
            rename_entry,
            copy_entries,
            move_entries,
            get_file_content,
            get_parent_path,
            path_exists,
            search_files,
            search_by_name,
            search_content,
        ]);

    #[cfg(debug_assertions)]
    builder
        .export(
            specta_typescript::Typescript::default()
                .bigint(specta_typescript::BigIntExportBehavior::Number),
            "../src/shared/api/tauri/bindings.ts",
        )
        .expect("Failed to export typescript bindings");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(builder.invoke_handler())
        .setup(move |app| {
            builder.mount_events(app);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

