mod common;

#[test]
fn common_module_links() {
    let (dir, root) = common::setup_temp_workspace();
    common::create_fixture_tree(dir.path());
    assert!(std::path::Path::new(&common::child_path(&root, "readme.txt")).exists());
}
