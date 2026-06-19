#[cfg(unix)]
mod unix {
    use std::fs;
    use std::os::unix::fs::symlink;
    use std::path::Path;
    use tempfile::tempdir;

    fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), String> {
        file_manager_lib::commands::file_ops::copy_dir_recursive_for_test(src, dst)
            .map_err(|e| e.to_string())
    }

    #[test]
    fn copy_dir_does_not_follow_symlink_to_directory() {
        let dir = tempdir().expect("tempdir");
        let src = dir.path().join("src");
        let nested = src.join("nested");
        let dst = dir.path().join("dst");
        fs::create_dir_all(&nested).expect("mkdir");
        let target_outside = dir.path().join("outside");
        fs::create_dir_all(&target_outside).expect("mkdir outside");
        let link = src.join("link_to_outside");
        symlink(&target_outside, &link).expect("symlink");

        copy_dir_recursive(&src, &dst).expect("copy");

        let copied_link = dst.join("link_to_outside");
        assert!(
            copied_link.is_symlink(),
            "symlink must be copied as symlink"
        );
        assert!(!copied_link.join("..").exists() || copied_link.is_symlink());
    }
}
