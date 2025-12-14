//! File Manager entry point.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    file_manager_lib::run()
}