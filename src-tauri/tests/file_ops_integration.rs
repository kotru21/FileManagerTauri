mod common;

use std::path::Path;

use file_manager_lib::commands::file_ops::{
    create_directory_sync, create_file_sync, read_directory_batched_sync, read_directory_sync,
};

use common::{child_path, create_fixture_tree, setup_temp_workspace};

#[test]
fn read_directory_lists_fixture_tree() {
    let (dir, root) = setup_temp_workspace();
    create_fixture_tree(dir.path());
    let entries = read_directory_sync(&root).expect("read_directory");
    let names: Vec<_> = entries.iter().map(|e| e.name.as_str()).collect();
    assert!(names.contains(&"readme.txt"));
    assert!(names.contains(&"subdir"));
}

#[test]
fn create_directory_creates_nested_dir() {
    let (_dir, root) = setup_temp_workspace();
    let nested = child_path(&root, "a/b/c");
    create_directory_sync(&nested).expect("create_directory");
    assert!(Path::new(&nested).is_dir());
}

#[test]
fn create_file_writes_empty_file() {
    let (_dir, root) = setup_temp_workspace();
    let file = child_path(&root, "new.txt");
    create_file_sync(&file).expect("create_file");
    assert!(Path::new(&file).is_file());
}

#[test]
fn create_directory_rejects_file_parent() {
    let (_dir, root) = setup_temp_workspace();
    let file = child_path(&root, "parent.txt");
    std::fs::write(&file, "x").unwrap();
    let nested = child_path(&root, "parent.txt/child");
    let err = create_directory_sync(&nested).unwrap_err().to_string();
    assert!(
        err.contains("Not a directory")
            || err.contains("directory")
            || err.contains("CreateDir")
    );
}

#[cfg(windows)]
#[test]
fn get_drives_returns_non_empty_list() {
    let drives = tauri::async_runtime::block_on(file_manager_lib::commands::file_ops::get_drives())
        .expect("get_drives");
    assert!(!drives.is_empty());
}

#[test]
fn read_directory_batched_collects_same_entries_as_sync_read() {
    let (dir, root) = setup_temp_workspace();
    create_fixture_tree(dir.path());
    let full = read_directory_sync(&root).expect("read");
    let mut batched: Vec<_> = Vec::new();
    read_directory_batched_sync(&root, |batch| batched.extend(batch)).expect("batched");
    assert_eq!(batched.len(), full.len());
    let mut a: Vec<_> = batched.iter().map(|e| e.name.as_str()).collect();
    let mut b: Vec<_> = full.iter().map(|e| e.name.as_str()).collect();
    a.sort_unstable();
    b.sort_unstable();
    assert_eq!(a, b);
}
