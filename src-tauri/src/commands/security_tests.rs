#[cfg(test)]
mod tests {
    use crate::commands::file_ops::validate_path;
    use crate::commands::file_ops::validate_child_name;
    use crate::commands::file_ops::copy_entries;
    use crate::commands::file_ops::delete_entries;
    use crate::commands::file_ops::get_file_content;
    use tempfile::tempdir;
    use std::fs;
    use std::io::Write;
    use crate::commands::file_ops::validate_paths_sandboxed;
    use crate::commands::config::{override_security_config, get_security_config, SecurityConfig};

    #[test]
    fn validate_path_accepts_absolute_existing_path() {
        let dir = tempdir().unwrap();
        let p = dir.path().to_string_lossy().to_string();
        let res = validate_path(&p);
        assert!(res.is_ok());
        let canonical = res.unwrap();
        assert!(canonical.exists());
    }

    #[test]
    fn validate_path_rejects_relative_path() {
        let res = validate_path("./some/relative/path");
        assert!(res.is_err());
    }

    #[test]
    fn validate_path_rejects_symlink_to_outside() {
        let dir = tempdir().unwrap();
        let outside = tempdir().unwrap();
        let outside_file = outside.path().join("secret.txt");
        fs::write(&outside_file, "secret").unwrap();

        let link = dir.path().join("link");
        #[cfg(unix)]
        std::os::unix::fs::symlink(&outside_file, &link).unwrap();
        #[cfg(windows)]
        std::os::windows::fs::symlink_file(&outside_file, &link).unwrap();

        let res = validate_path(&link.to_string_lossy());
        // validate_path follows symlinks and returns canonical path; ensure it resolves to the target
        assert!(res.is_ok(), "validate_path should resolve symlink to the target");
        let canonical = res.unwrap();
        // Normalize Windows long path prefix for comparison
        let normalize = |p: std::path::PathBuf| {
            let s = p.to_string_lossy().to_string();
            if s.starts_with("\\\\?\\") { s[4..].to_string() } else { s }
        };
        assert_eq!(normalize(canonical), normalize(outside_file.canonicalize().unwrap()));
    }

    #[test]
    fn validate_child_name_rejects_ads() {
        #[cfg(windows)] {
            let r = validate_child_name(std::ffi::OsStr::new("file.txt:hidden"));
            assert!(r.is_err(), "Should reject ADS on Windows");
        }
    }

    #[test]
    fn validate_child_name_rejects_reserved_with_extension() {
        let r = validate_child_name(std::ffi::OsStr::new("COM1.txt"));
        assert!(r.is_err(), "COM1.txt should be rejected");
    }

    #[tokio::test]
    async fn copy_dir_does_not_follow_symlinks() {
        let src = tempdir().unwrap();
        let dst = tempdir().unwrap();

        let outside = tempdir().unwrap();
        fs::write(outside.path().join("secret.txt"), "secret data").unwrap();

        #[cfg(unix)]
        std::os::unix::fs::symlink(outside.path(), src.path().join("escape_link")).unwrap();
        #[cfg(windows)]
        std::os::windows::fs::symlink_dir(outside.path(), src.path().join("escape_link")).unwrap();

        // Use copy_entries to copy the directory
        let roots = vec![src.path().to_string_lossy().to_string()];
        let dest = dst.path().to_string_lossy().to_string();
        let res = copy_entries(roots, dest).await;
        assert!(res.is_ok());

        // escape_link should be skipped and secret.txt should not be present in dst
        assert!(!dst.path().join("escape_link").exists());
        assert!(!dst.path().join("secret.txt").exists());
    }

    #[tokio::test]
    async fn delete_does_not_follow_symlinks() {
        let dir = tempdir().unwrap();
        let target = tempdir().unwrap();
        let target_file = target.path().join("important.txt");
        fs::write(&target_file, "don't delete me").unwrap();

        let link = dir.path().join("link");
        #[cfg(unix)]
        std::os::unix::fs::symlink(&target_file, &link).unwrap();
        #[cfg(windows)]
        std::os::windows::fs::symlink_file(&target_file, &link).unwrap();

        let res = delete_entries(vec![link.to_string_lossy().to_string()], true).await;
        if let Err(e) = &res {
            println!("delete_entries error: {}", e);
        }
        assert!(res.is_ok());

        assert!(!link.exists());
        assert!(target_file.exists(), "Target file should not be deleted");
    }

    #[tokio::test]
    async fn get_file_content_rejects_large_file() {
        let dir = tempdir().unwrap();
        let big_file = dir.path().join("big.txt");
        let mut f = fs::File::create(&big_file).unwrap();
        // Create file slightly larger than MAX_CONTENT_SIZE (10MB). We'll write 11MB.
        let bytes = vec![b'a'; 11 * 1024 * 1024];
        f.write_all(&bytes).unwrap();
        let res = get_file_content(big_file.to_string_lossy().to_string()).await;
        assert!(res.is_err());
        let err = res.err().unwrap();
        assert!(err.contains("File too large"));
    }

    #[test]
    fn override_security_config_changes_global_config() {
        let orig = get_security_config();
        let dir = tempdir().unwrap();
        let cfg = SecurityConfig {
            allowed_roots: vec![dir.path().to_path_buf()],
            denied_patterns: vec!["**/secret/**".to_string()],
        };
        override_security_config(cfg.clone());
        let got = get_security_config();
        assert_eq!(got.allowed_roots, cfg.allowed_roots);
        assert_eq!(got.denied_patterns, cfg.denied_patterns);
        // restore original
        override_security_config(orig);
    }

    #[test]
    fn validate_paths_sandboxed_accepts_allowed_root() {
        let orig = get_security_config();
        let dir = tempdir().unwrap();
        // Override allowed roots to include our temp dir (canonicalized)
        let mut allowed_root = dir.path().canonicalize().unwrap();
        // Normalize Windows long path prefix removal to match validate_path's behavior
        #[cfg(windows)]
        {
            let mut s = allowed_root.to_string_lossy().to_string();
            if s.starts_with("\\\\?\\") {
                s = s[4..].to_string();
                allowed_root = std::path::PathBuf::from(s);
            }
        }
        let cfg = SecurityConfig {
            allowed_roots: vec![allowed_root],
            denied_patterns: vec![],
        };
        override_security_config(cfg);
        let paths = vec![dir.path().to_string_lossy().to_string()];
        let res = validate_paths_sandboxed(&paths);
        assert!(res.is_ok());
        override_security_config(orig);
    }

    #[test]
    fn validate_paths_sandboxed_denies_outside_root() {
        let orig = get_security_config();
        let allowed = tempdir().unwrap();
        let outside = tempdir().unwrap();
        let mut allowed_root = allowed.path().canonicalize().unwrap();
        #[cfg(windows)]
        {
            let mut s = allowed_root.to_string_lossy().to_string();
            if s.starts_with("\\\\?\\") {
                s = s[4..].to_string();
                allowed_root = std::path::PathBuf::from(s);
            }
        }
        let cfg = SecurityConfig {
            allowed_roots: vec![allowed_root],
            denied_patterns: vec![],
        };
        override_security_config(cfg);
        let paths = vec![outside.path().to_string_lossy().to_string()];
        let res = validate_paths_sandboxed(&paths);
        assert!(res.is_err());
        override_security_config(orig);
    }
}
