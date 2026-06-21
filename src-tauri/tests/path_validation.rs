use file_manager_lib::utils::{validate_absolute_path, validate_deletable_path};

#[test]
fn rejects_empty_path() {
    assert!(validate_absolute_path("").is_err());
    let err = validate_absolute_path("").unwrap_err().to_string();
    assert!(err.contains("Empty"));
}

#[test]
fn rejects_relative_path() {
    assert!(validate_absolute_path("relative/path").is_err());
    let err = validate_absolute_path("relative/path").unwrap_err().to_string();
    assert!(err.contains("absolute"));
}

#[test]
fn rejects_traversal_outside_workspace() {
    #[cfg(windows)]
    let path = "..\\..\\Windows";
    #[cfg(unix)]
    let path = "../../etc/passwd";

    let err = validate_absolute_path(path).unwrap_err().to_string();
    assert!(err.contains("absolute"));
    assert!(validate_deletable_path(path).is_err());
}

#[cfg(windows)]
#[test]
fn validate_deletable_rejects_drive_root() {
    let err = validate_deletable_path("C:\\").unwrap_err().to_string();
    assert!(err.contains("root") || err.contains("Root") || err.contains("Refusing"));
}

#[cfg(unix)]
#[test]
fn validate_deletable_rejects_unix_root() {
    let err = validate_deletable_path("/").unwrap_err().to_string();
    assert!(err.contains("root") || err.contains("Root") || err.contains("Refusing"));
}

#[test]
fn accepts_normal_absolute_path() {
    #[cfg(windows)]
    let path = "C:\\Users\\test\\file.txt";
    #[cfg(unix)]
    let path = "/home/test/file.txt";

    assert!(validate_absolute_path(path).is_ok());
    assert!(validate_deletable_path(path).is_ok());
}
