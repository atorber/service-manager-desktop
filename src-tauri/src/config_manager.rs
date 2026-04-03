use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

use crate::service_config::{
    get_default_services_config, preset_service_configs, ServiceConfig, ServicesConfig,
};

pub struct ConfigManager {
    config_file_path: PathBuf,
    root_dir: String,
    config: ServicesConfig,
}

impl ConfigManager {
    pub fn new(root_dir: &str) -> Self {
        let config_file_path = PathBuf::from(root_dir).join(".service_config.json");
        let mut mgr = ConfigManager {
            config_file_path,
            root_dir: root_dir.to_string(),
            config: ServicesConfig {
                services: HashMap::new(),
            },
        };
        mgr.config = mgr.load_config();
        mgr
    }

    fn generate_id(&self) -> String {
        let ts = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis();
        let rand_part: u64 = rand_simple();
        format!("task_{}_{:x}", ts, rand_part)
    }

    fn load_config(&self) -> ServicesConfig {
        if let Ok(data) = fs::read_to_string(&self.config_file_path) {
            if let Ok(loaded) = serde_json::from_str::<serde_json::Value>(&data) {
                // New format: has "services" field
                if loaded.get("services").is_some() {
                    if let Ok(mut cfg) = serde_json::from_str::<ServicesConfig>(&data) {
                        let script_preset_ids = ["weibo_update", "qwen_voice_to_text"];
                        let mut has_new = false;
                        for preset in preset_service_configs() {
                            if !cfg.services.contains_key(&preset.id) {
                                cfg.services.insert(preset.id.clone(), preset);
                                has_new = true;
                            } else if script_preset_ids.contains(&preset.id.as_str()) {
                                if let Some(existing) = cfg.services.get(&preset.id) {
                                    if existing.working_dir != preset.working_dir
                                        || existing.command != preset.command
                                    {
                                        let mut updated = existing.clone();
                                        updated.working_dir = preset.working_dir.clone();
                                        updated.command = preset.command.clone();
                                        cfg.services.insert(preset.id.clone(), updated);
                                        has_new = true;
                                    }
                                }
                            }
                        }
                        if has_new {
                            let _ = Self::write_config(&self.config_file_path, &cfg);
                        }
                        return cfg;
                    }
                }

                // Old format: has backend/frontend/wechat at top level
                if loaded.get("backend").is_some()
                    || loaded.get("frontend").is_some()
                    || loaded.get("wechat").is_some()
                {
                    let mut services = HashMap::new();
                    let now = chrono::Utc::now().to_rfc3339();
                    for key in ["backend", "frontend", "wechat"] {
                        if let Some(val) = loaded.get(key) {
                            if let Ok(mut svc) =
                                serde_json::from_value::<ServiceConfig>(val.clone())
                            {
                                svc.is_preset = Some(true);
                                if svc.created_at.is_none() {
                                    svc.created_at = Some(now.clone());
                                }
                                services.insert(key.to_string(), svc);
                            }
                        }
                    }
                    let migrated = ServicesConfig { services };
                    let _ = Self::write_config(&self.config_file_path, &migrated);
                    return migrated;
                }
            }
        }

        get_default_services_config()
    }

    fn write_config(path: &Path, config: &ServicesConfig) -> bool {
        match serde_json::to_string_pretty(config) {
            Ok(data) => fs::write(path, data).is_ok(),
            Err(_) => false,
        }
    }

    pub fn save_config(&self) -> bool {
        Self::write_config(&self.config_file_path, &self.config)
    }

    pub fn get_all_config(&self) -> ServicesConfig {
        self.config.clone()
    }

    pub fn get_all_services(&self) -> Vec<ServiceConfig> {
        self.config.services.values().cloned().collect()
    }

    pub fn get_service_config(&self, service_id: &str) -> Option<ServiceConfig> {
        self.config.services.get(service_id).cloned()
    }

    pub fn create_service(&mut self, data: serde_json::Value) -> Option<ServiceConfig> {
        let id = self.generate_id();
        let now = chrono::Utc::now().to_rfc3339();
        let svc = ServiceConfig {
            id: id.clone(),
            name: data["name"].as_str().unwrap_or("").to_string(),
            working_dir: data["workingDir"].as_str().unwrap_or("").to_string(),
            command: data["command"].as_str().unwrap_or("").to_string(),
            port: data["port"].as_u64().unwrap_or(0) as u16,
            url_template: data["urlTemplate"].as_str().map(|s| s.to_string()),
            enabled: data["enabled"].as_bool().unwrap_or(true),
            is_preset: Some(false),
            created_at: Some(now.clone()),
            updated_at: Some(now),
        };
        self.config.services.insert(id, svc.clone());
        if self.save_config() {
            Some(svc)
        } else {
            None
        }
    }

    pub fn update_service_config(
        &mut self,
        service_id: &str,
        updates: serde_json::Value,
    ) -> bool {
        let existing = match self.config.services.get(service_id) {
            Some(s) => s.clone(),
            None => return false,
        };

        let mut updated = existing.clone();
        if let Some(v) = updates.get("workingDir").and_then(|v| v.as_str()) {
            updated.working_dir = v.to_string();
        }
        if let Some(v) = updates.get("command").and_then(|v| v.as_str()) {
            updated.command = v.to_string();
        }
        if let Some(v) = updates.get("port").and_then(|v| v.as_u64()) {
            updated.port = v as u16;
        }
        if let Some(v) = updates.get("urlTemplate") {
            updated.url_template = v.as_str().map(|s| s.to_string());
        }
        if let Some(v) = updates.get("name").and_then(|v| v.as_str()) {
            updated.name = v.to_string();
        }
        if let Some(v) = updates.get("enabled").and_then(|v| v.as_bool()) {
            updated.enabled = v;
        }
        updated.updated_at = Some(chrono::Utc::now().to_rfc3339());
        // Preserve immutable fields
        updated.id = existing.id;
        updated.created_at = existing.created_at;
        updated.is_preset = existing.is_preset;

        self.config.services.insert(service_id.to_string(), updated);
        self.save_config()
    }

    pub fn delete_service(&mut self, service_id: &str) -> bool {
        if let Some(svc) = self.config.services.get(service_id) {
            if svc.is_preset == Some(true) {
                return false;
            }
            self.config.services.remove(service_id);
            self.save_config()
        } else {
            false
        }
    }

    pub fn resolve_working_dir(&self, service_id: &str) -> Option<String> {
        self.config.services.get(service_id).map(|svc| {
            let resolved = svc.working_dir.replace("{rootDir}", &self.root_dir);
            PathBuf::from(&resolved)
                .canonicalize()
                .unwrap_or_else(|_| PathBuf::from(&resolved))
                .to_string_lossy()
                .to_string()
        })
    }

    pub fn resolve_url_template(&self, service_id: &str) -> Option<String> {
        self.config.services.get(service_id).and_then(|svc| {
            svc.url_template
                .as_ref()
                .map(|t| t.replace("{port}", &svc.port.to_string()))
        })
    }

    pub fn reset_to_defaults(&mut self) -> bool {
        self.config = get_default_services_config();
        self.save_config()
    }

    pub fn root_dir(&self) -> &str {
        &self.root_dir
    }
}

fn rand_simple() -> u64 {
    use std::time::SystemTime;
    let t = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or_default();
    t.as_nanos() as u64 ^ (t.as_secs() << 16)
}
