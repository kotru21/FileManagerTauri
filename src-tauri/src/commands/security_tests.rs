#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

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
}
