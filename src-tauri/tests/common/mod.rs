use std::fs;
use std::path::{Path, PathBuf};
use tempfile::TempDir;

/// Returns an absolute path string for the temp workspace root.
pub fn setup_temp_workspace() -> (TempDir, String) {
    let dir = tempfile::tempdir().expect("tempdir");
    let root = dir.path().to_string_lossy().to_string();
    (dir, root)
}

/// Creates a small fixture tree under `root`:
/// - readme.txt
/// - nested.txt
/// - subdir/nested.txt
/// - empty-dir/
pub fn create_fixture_tree(root: &Path) {
    fs::create_dir_all(root.join("subdir")).expect("mkdir subdir");
    fs::create_dir_all(root.join("empty-dir")).expect("mkdir empty-dir");
    fs::write(root.join("readme.txt"), "hello fixture").expect("write readme");
    fs::write(root.join("nested.txt"), "root nested").expect("write nested root");
    fs::write(root.join("subdir").join("nested.txt"), "nested content").expect("write nested");
}

/// Joins `name` under the workspace `root` and returns an absolute path string.
pub fn child_path(root: &str, name: &str) -> String {
    PathBuf::from(root).join(name).to_string_lossy().to_string()
}

#[cfg(test)]
mod smoke {
    use super::*;
    #[test]
    fn fixture_tree_creates_expected_files() {
        let (dir, root) = setup_temp_workspace();
        create_fixture_tree(dir.path());
        assert!(Path::new(&child_path(&root, "readme.txt")).exists());
        assert!(Path::new(&child_path(&root, "subdir/nested.txt")).exists());
    }
}
