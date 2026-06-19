use std::fs;
use std::io::Write;
use tempfile::tempdir;

#[test]
fn get_file_content_rejects_files_over_limit() {
    let dir = tempdir().expect("tempdir");
    let file_path = dir.path().join("large.txt");
    let mut file = fs::File::create(&file_path).expect("create");
    // MAX_FILE_CONTENT_SIZE = 4MB; write 4MB + 1 byte
    let chunk = vec![b'a'; 1024];
    for _ in 0..(4 * 1024 + 1) {
        file.write_all(&chunk).expect("write");
    }
    drop(file);

    let path = file_path.to_string_lossy().to_string();
    let result = file_manager_lib::commands::file_ops::get_file_content_sync(&path);
    assert!(result.is_err());
    let err = result.unwrap_err().to_string();
    assert!(err.contains("too large") || err.contains("File too large"));
}
