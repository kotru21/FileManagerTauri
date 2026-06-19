use file_manager_lib::utils::{validate_absolute_path, validate_deletable_path};

#[test]
fn rejects_empty_path() {
    let err = validate_absolute_path("").unwrap_err().to_string();
    assert!(err.contains("Empty") || err.contains("empty"));
}

#[test]
fn rejects_relative_path() {
    let err = validate_absolute_path("relative/path").unwrap_err().to_string();
    assert!(err.contains("absolute") || err.contains("Absolute"));
}

#[test]
fn accepts_windows_drive_root() {
    #[cfg(windows)]
    {
        assert!(validate_absolute_path("C:\\").is_ok());
        assert!(validate_absolute_path("D:\\").is_ok());
    }
}

#[test]
fn accepts_unix_root_for_reads() {
    #[cfg(not(windows))]
    {
        assert!(validate_absolute_path("/").is_ok());
    }
}

#[test]
fn rejects_root_path_on_delete() {
    #[cfg(windows)]
    {
        let err = validate_deletable_path("C:\\").unwrap_err().to_string();
        assert!(err.contains("root") || err.contains("Root") || err.contains("Refusing"));
    }

    #[cfg(not(windows))]
    {
        let err = validate_deletable_path("/").unwrap_err().to_string();
        assert!(err.contains("root") || err.contains("Root") || err.contains("Refusing"));
    }
}

#[test]
fn accepts_normal_absolute_path() {
    #[cfg(windows)]
    let path = "C:\\Users\\test\\file.txt";
    #[cfg(not(windows))]
    let path = "/home/test/file.txt";
    assert!(validate_absolute_path(path).is_ok());
    assert!(validate_deletable_path(path).is_ok());
}
