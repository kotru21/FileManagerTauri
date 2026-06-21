mod common;

use common::{child_path, create_fixture_tree, setup_temp_workspace};
use file_manager_lib::commands::file_ops::get_file_content_sync;
use file_manager_lib::commands::preview::{get_file_preview_sync, get_thumbnail_sync};
use file_manager_lib::models::FilePreview;

#[test]
fn get_file_preview_returns_text_metadata() {
    let (dir, root) = setup_temp_workspace();
    create_fixture_tree(dir.path());
    let file = child_path(&root, "readme.txt");
    let preview = get_file_preview_sync(&file).expect("preview");
    match preview {
        FilePreview::Text { content, truncated } => {
            assert!(content.contains("hello fixture"));
            assert!(!truncated);
        }
        FilePreview::Unsupported { .. } => {}
        other => panic!("unexpected preview variant: {other:?}"),
    }
}

#[test]
fn get_thumbnail_gracefully_skips_non_image() {
    let (dir, root) = setup_temp_workspace();
    create_fixture_tree(dir.path());
    let file = child_path(&root, "readme.txt");
    let result = get_thumbnail_sync(&file, 128);
    assert!(result.is_err());
    let err = result.unwrap_err();
    assert!(err.contains("Unsupported image extension") || err.contains("thumbnail"));
}

#[test]
fn get_file_content_rejects_oversized_file() {
    use std::io::Write;

    let (_dir, root) = setup_temp_workspace();
    let file = child_path(&root, "large.txt");
    let mut f = std::fs::File::create(&file).unwrap();
    let chunk = vec![b'a'; 1024];
    for _ in 0..(4 * 1024 + 1) {
        f.write_all(&chunk).unwrap();
    }
    drop(f);
    assert!(get_file_content_sync(&file).is_err());
}
