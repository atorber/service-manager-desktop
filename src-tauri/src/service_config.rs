use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServiceConfig {
    pub id: String,
    pub name: String,
    pub working_dir: String,
    pub command: String,
    pub port: u16,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url_template: Option<String>,
    #[serde(default = "default_true")]
    pub enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_preset: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServicesConfig {
    pub services: HashMap<String, ServiceConfig>,
}

pub fn preset_service_configs() -> Vec<ServiceConfig> {
    let now = chrono::Utc::now().to_rfc3339();
    vec![
        ServiceConfig {
            id: "backend".into(),
            name: "后端服务".into(),
            working_dir: "{rootDir}/app".into(),
            command: "cd /Users/app/ && python main.py".into(),
            port: 5000,
            url_template: Some("http://localhost:{port}/docs".into()),
            enabled: true,
            is_preset: Some(true),
            created_at: Some(now.clone()),
            updated_at: None,
        },
        ServiceConfig {
            id: "frontend".into(),
            name: "前端服务".into(),
            working_dir: "{rootDir}".into(),
            command: "cd /Users/app/ && npm run dev".into(),
            port: 8000,
            url_template: Some("http://localhost:{port}".into()),
            enabled: true,
            is_preset: Some(true),
            created_at: Some(now.clone()),
            updated_at: None,
        },
        ServiceConfig {
            id: "wechat".into(),
            name: "微信机器人".into(),
            working_dir: "{rootDir}/scripts/wxagent".into(),
            command: "cd /Users/app/ && npm run start".into(),
            port: 19088,
            url_template: None,
            enabled: true,
            is_preset: Some(true),
            created_at: Some(now.clone()),
            updated_at: None,
        },
        ServiceConfig {
            id: "weibo_update".into(),
            name: "微博更新到数据库".into(),
            working_dir: "{rootDir}".into(),
            command: "cd /Users/app/ && python app/tools/update_weibo.py".into(),
            port: 0,
            url_template: None,
            enabled: true,
            is_preset: Some(true),
            created_at: Some(now.clone()),
            updated_at: None,
        },
        ServiceConfig {
            id: "qwen_voice_to_text".into(),
            name: "千问语音转文本".into(),
            working_dir: "{rootDir}".into(),
            command: "cd /Users/app/ && python app/tools/chrome_test_weibo_qwen.py".into(),
            port: 0,
            url_template: None,
            enabled: true,
            is_preset: Some(true),
            created_at: Some(now),
            updated_at: None,
        },
    ]
}

pub fn get_default_services_config() -> ServicesConfig {
    let mut services = HashMap::new();
    for config in preset_service_configs() {
        services.insert(config.id.clone(), config);
    }
    ServicesConfig { services }
}
