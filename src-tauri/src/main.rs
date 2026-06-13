#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use plugin_studio_lib::PluginDesignJson;
use tauri_plugin_dialog::DialogExt;

/// Save a plugin design to disk as .plugindesign JSON.
#[tauri::command]
fn save_design(path: String, design: PluginDesignJson) -> Result<(), String> {
    let json = serde_json::to_string_pretty(&design).map_err(|e| e.to_string())?;
    std::fs::write(&path, &json).map_err(|e| e.to_string())?;
    Ok(())
}

/// Load a plugin design from a .plugindesign JSON file.
#[tauri::command]
fn load_design(path: String) -> Result<PluginDesignJson, String> {
    let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let design: PluginDesignJson =
        serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(design)
}

/// Serialise the current design to a formatted JSON string (in-memory export).
#[tauri::command]
fn export_json(design: PluginDesignJson) -> Result<String, String> {
    serde_json::to_string_pretty(&design).map_err(|e| e.to_string())
}

/// Open a native file dialog and return the selected file path.
/// - kind "open": pick an existing .plugindesign file
/// - kind "save": choose a location to save a .plugindesign file
#[tauri::command]
fn open_file_dialog(
    app: tauri::AppHandle,
    kind: String,
) -> Result<Option<String>, String> {
    match kind.as_str() {
        "open" => {
            let file = app
                .dialog()
                .file()
                .add_filter("PluginDesign", &["plugindesign"])
                .blocking_pick_file();
            Ok(file.map(|f| f.to_string()))
        }
        "save" => {
            let file = app
                .dialog()
                .file()
                .add_filter("PluginDesign", &["plugindesign"])
                .set_file_name("design.plugindesign")
                .blocking_save_file();
            Ok(file.map(|f| f.to_string()))
        }
        _ => Err("Invalid dialog kind — use 'open' or 'save'.".to_string()),
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            save_design,
            load_design,
            export_json,
            open_file_dialog,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
