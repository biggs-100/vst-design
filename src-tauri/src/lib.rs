use serde::{Deserialize, Serialize};

/// Top-level JSON structure for .plugindesign files.
#[derive(Debug, Serialize, Deserialize)]
pub struct PluginDesignJson {
    pub plugin_meta: PluginMeta,
    pub ui_components: Vec<ComponentData>,
    /// Schema version for forward/backward compatibility.
    /// Defaults to 0 for files created before this field was added.
    #[serde(default)]
    pub schema_version: u32,
}

/// Metadata describing the plugin project.
#[derive(Debug, Serialize, Deserialize)]
pub struct PluginMeta {
    pub name: String,
    pub base_width: u32,
    pub base_height: u32,
}

/// Serialisable representation of a single UI component on the canvas.
#[derive(Debug, Serialize, Deserialize)]
pub struct ComponentData {
    pub component_type: String,
    pub id: String,
    pub parameter_id: Option<String>,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub asset_path: Option<String>,
    pub frames: Option<u32>,
    pub config: Option<serde_json::Value>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_round_trip() {
        let design = PluginDesignJson {
            plugin_meta: PluginMeta {
                name: "Test".to_string(),
                base_width: 800,
                base_height: 600,
            },
            ui_components: vec![ComponentData {
                component_type: "Knob".to_string(),
                id: "test_knob".to_string(),
                parameter_id: Some("param1".to_string()),
                x: 100.0,
                y: 200.0,
                width: 80.0,
                height: 80.0,
                asset_path: Some("assets/knob.png".to_string()),
                frames: Some(100),
                config: None,
            }],
            schema_version: 1,
        };
        let json = serde_json::to_string_pretty(&design).unwrap();
        let parsed: PluginDesignJson = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.plugin_meta.name, "Test");
        assert_eq!(parsed.ui_components.len(), 1);
        assert_eq!(parsed.ui_components[0].id, "test_knob");
        assert_eq!(parsed.schema_version, 1);
    }

    #[test]
    fn test_empty_components() {
        let design = PluginDesignJson {
            plugin_meta: PluginMeta {
                name: "Empty".to_string(),
                base_width: 800,
                base_height: 600,
            },
            ui_components: vec![],
            schema_version: 1,
        };
        let json = serde_json::to_string_pretty(&design).unwrap();
        let parsed: PluginDesignJson = serde_json::from_str(&json).unwrap();
        assert!(parsed.ui_components.is_empty());
        assert_eq!(parsed.schema_version, 1);
    }

    #[test]
    fn test_schema_version_defaults_to_zero() {
        // Files created before schema_version existed should parse with default 0
        let json = r#"{
            "plugin_meta": {
                "name": "Legacy",
                "base_width": 800,
                "base_height": 600
            },
            "ui_components": []
        }"#;
        let parsed: PluginDesignJson = serde_json::from_str(json).unwrap();
        assert_eq!(parsed.schema_version, 0);
    }

    #[test]
    fn test_parameter_id_optional() {
        let design = PluginDesignJson {
            plugin_meta: PluginMeta {
                name: "OptionalTest".to_string(),
                base_width: 800,
                base_height: 600,
            },
            ui_components: vec![ComponentData {
                component_type: "LED".to_string(),
                id: "led1".to_string(),
                parameter_id: None,
                x: 10.0,
                y: 20.0,
                width: 30.0,
                height: 30.0,
                asset_path: None,
                frames: None,
                config: None,
            }],
            schema_version: 1,
        };
        let json = serde_json::to_string_pretty(&design).unwrap();
        let parsed: PluginDesignJson = serde_json::from_str(&json).unwrap();
        assert!(parsed.ui_components[0].parameter_id.is_none());
    }
}
