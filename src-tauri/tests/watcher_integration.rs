mod common;

use common::setup_temp_workspace;
use file_manager_lib::commands::watcher::{
    unwatch_all_sync, unwatch_directory_sync, validate_watch_directory_path, WatcherState,
};

#[test]
fn watch_and_unwatch_lifecycle() {
    let (_dir, root) = setup_temp_workspace();
    let state = WatcherState::new();

    validate_watch_directory_path(&root).expect("watch_directory validation");
    state
        .register_null_watcher_for_test(&root)
        .expect("watch_directory");
    assert_eq!(state.active_watcher_count(), 1);

    unwatch_directory_sync(&root, &state).expect("unwatch_directory");
    assert_eq!(state.active_watcher_count(), 0);

    state
        .register_null_watcher_for_test(&root)
        .expect("watch_directory again");
    unwatch_all_sync(&state).expect("unwatch_all");
    assert_eq!(state.active_watcher_count(), 0);
}

#[test]
fn watch_directory_rejects_empty_path() {
    let state = WatcherState::new();
    let err = validate_watch_directory_path("").unwrap_err();
    assert!(err.contains("Empty") || err.contains("empty"));
    assert_eq!(state.active_watcher_count(), 0);
}
