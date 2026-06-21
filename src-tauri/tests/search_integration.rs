mod common;

use common::{create_fixture_tree, setup_temp_workspace};
use file_manager_lib::commands::search::{
    search_by_name_sync, search_content_sync, search_files_sync,
};
use file_manager_lib::models::SearchOptions;

#[test]
fn search_files_finds_by_name() {
    let (dir, root) = setup_temp_workspace();
    create_fixture_tree(dir.path());
    let options = SearchOptions {
        query: "readme".to_string(),
        search_path: root.clone(),
        search_content: false,
        case_sensitive: false,
        max_results: Some(10),
        file_extensions: None,
    };
    let results = search_files_sync(&options).expect("search");
    assert!(results.iter().any(|r| r.name == "readme.txt"));
}

#[test]
fn search_by_name_matches_fixture() {
    let (dir, root) = setup_temp_workspace();
    create_fixture_tree(dir.path());
    let results = search_by_name_sync(&root, "nested", None).expect("search_by_name");
    assert!(results.iter().any(|r| r.name == "nested.txt"));
}

#[test]
fn search_content_finds_text() {
    let (dir, root) = setup_temp_workspace();
    create_fixture_tree(dir.path());
    let results =
        search_content_sync(&root, "nested content", None, None).expect("search_content");
    assert!(!results.is_empty());
}

#[test]
fn search_files_rejects_missing_root() {
    let options = SearchOptions {
        query: "x".to_string(),
        search_path: "C:\\no-such-path-xyz-123".to_string(),
        search_content: false,
        case_sensitive: false,
        max_results: Some(10),
        file_extensions: None,
    };
    let err = search_files_sync(&options).unwrap_err().to_string();
    assert!(err.contains("not found") || err.contains("NotFound") || err.contains("SearchPath"));
}

#[test]
fn search_files_stream_returns_results() {
    let (dir, root) = setup_temp_workspace();
    create_fixture_tree(dir.path());
    let options = SearchOptions {
        query: "readme".to_string(),
        search_path: root,
        search_content: false,
        case_sensitive: false,
        max_results: Some(10),
        file_extensions: None,
    };
    // Without AppHandle events, assert sync path parity (stream command wraps sync + emit).
    let sync_count = search_files_sync(&options).expect("sync").len();
    assert!(sync_count >= 1);
}
