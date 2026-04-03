mod config_manager;
mod service_config;
mod service_manager;
mod wechat_api;

use config_manager::ConfigManager;
use serde_json::json;
use service_manager::{load_pids, save_pids};
use std::collections::HashMap;
use std::path::PathBuf;
use tauri::Manager;
use tokio::sync::Mutex;

pub struct AppState {
    root_dir: String,
    config_manager: ConfigManager,
    pids: HashMap<String, u32>,
    pid_file: String,
}

// ── Service management commands ───────────────────────────────────────

#[tauri::command]
async fn start_service(
    app: tauri::AppHandle,
    state: tauri::State<'_, Mutex<AppState>>,
    service: String,
) -> Result<serde_json::Value, String> {
    let (config, working_dir) = {
        let s = state.lock().await;
        let cfg = s.config_manager.get_service_config(&service);
        let wd = s.config_manager.resolve_working_dir(&service);
        (cfg, wd)
    };

    let config = match config {
        Some(c) => c,
        None => {
            return Ok(json!({"success": false, "message": format!("服务配置不存在: {}", service)}))
        }
    };
    let working_dir = match working_dir {
        Some(w) => w,
        None => {
            return Ok(json!({"success": false, "message": format!("无法解析工作目录: {}", service)}))
        }
    };

    match service_manager::start_service(app, &service, &config, &working_dir).await {
        Ok((success, pid, message)) => {
            if success {
                if let Some(pid) = pid {
                    let mut s = state.lock().await;
                    s.pids.insert(service, pid);
                    save_pids(&s.pid_file, &s.pids);
                }
            }
            Ok(json!({"success": success, "message": message}))
        }
        Err(e) => Ok(json!({"success": false, "message": e})),
    }
}

async fn stop_service_inner(
    state: &Mutex<AppState>,
    service: &str,
) -> Result<serde_json::Value, String> {
    let (config, pid_file) = {
        let s = state.lock().await;
        (
            s.config_manager.get_service_config(service),
            s.pid_file.clone(),
        )
    };

    let mut pids = { state.lock().await.pids.clone() };

    let (success, message) =
        service_manager::stop_service(service, config.as_ref(), &mut pids, &pid_file).await;

    {
        let mut s = state.lock().await;
        s.pids = pids;
    }

    Ok(json!({"success": success, "message": message}))
}

#[tauri::command]
async fn stop_service(
    state: tauri::State<'_, Mutex<AppState>>,
    service: String,
) -> Result<serde_json::Value, String> {
    stop_service_inner(&*state, &service).await
}

#[tauri::command]
async fn restart_service(
    app: tauri::AppHandle,
    state: tauri::State<'_, Mutex<AppState>>,
    service: String,
) -> Result<serde_json::Value, String> {
    let _ = stop_service_inner(&*state, &service).await;
    tokio::time::sleep(std::time::Duration::from_secs(2)).await;
    start_service(app, state, service).await
}

#[tauri::command]
async fn get_service_status(
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<serde_json::Value, String> {
    let (configs, pid_file) = {
        let s = state.lock().await;
        (s.config_manager.get_all_services(), s.pid_file.clone())
    };
    let mut pids = { state.lock().await.pids.clone() };

    let status =
        service_manager::get_all_status(&configs, &mut pids, &pid_file).await;

    {
        let mut s = state.lock().await;
        s.pids = pids;
    }

    Ok(json!({"success": true, "data": status}))
}

// ── WeChat bot commands ───────────────────────────────────────────────

#[tauri::command]
async fn start_wechat(
    app: tauri::AppHandle,
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<serde_json::Value, String> {
    start_service(app, state, "wechat".to_string()).await
}

#[tauri::command]
async fn stop_wechat(
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<serde_json::Value, String> {
    stop_service(state, "wechat".to_string()).await
}

#[tauri::command]
async fn get_wechat_status(
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<serde_json::Value, String> {
    let port = {
        let s = state.lock().await;
        s.config_manager
            .get_service_config("wechat")
            .map(|c| c.port)
            .unwrap_or(19088)
    };
    let running = service_manager::is_port_in_use(port).await;
    let mut api_health = false;
    if running {
        api_health = wechat_api::check_api_health(port).await;
    }
    let pid = if running {
        service_manager::get_pid_by_port(port).await
    } else {
        None
    };
    Ok(json!({
        "success": true,
        "data": {
            "running": running,
            "pid": pid,
            "apiHealth": api_health,
        }
    }))
}

#[tauri::command]
async fn check_wechat_api_health(
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<serde_json::Value, String> {
    let port = {
        let s = state.lock().await;
        s.config_manager
            .get_service_config("wechat")
            .map(|c| c.port)
            .unwrap_or(19088)
    };
    let health = wechat_api::check_api_health(port).await;
    Ok(json!({"success": true, "health": health}))
}

#[tauri::command]
async fn get_wechat_push_config(
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<serde_json::Value, String> {
    let port = {
        let s = state.lock().await;
        s.config_manager
            .get_service_config("wechat")
            .map(|c| c.port)
            .unwrap_or(19088)
    };
    let config = wechat_api::get_push_config(port).await;
    Ok(json!({"success": true, "config": config}))
}

#[tauri::command]
async fn set_wechat_push_config(
    state: tauri::State<'_, Mutex<AppState>>,
    enabled: bool,
    callback_url: String,
) -> Result<serde_json::Value, String> {
    let port = {
        let s = state.lock().await;
        s.config_manager
            .get_service_config("wechat")
            .map(|c| c.port)
            .unwrap_or(19088)
    };
    match wechat_api::set_push_config(port, enabled, &callback_url).await {
        Ok(msg) => Ok(json!({"success": true, "message": msg})),
        Err(msg) => Ok(json!({"success": false, "message": msg})),
    }
}

// ── Config management commands ────────────────────────────────────────

#[tauri::command]
async fn get_all_config(
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<serde_json::Value, String> {
    let s = state.lock().await;
    let config = s.config_manager.get_all_config();
    Ok(json!({"success": true, "data": config}))
}

#[tauri::command]
async fn get_all_services(
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<serde_json::Value, String> {
    let s = state.lock().await;
    let services = s.config_manager.get_all_services();
    Ok(json!({"success": true, "data": services}))
}

#[tauri::command]
async fn get_service_config(
    state: tauri::State<'_, Mutex<AppState>>,
    service_id: String,
) -> Result<serde_json::Value, String> {
    let s = state.lock().await;
    match s.config_manager.get_service_config(&service_id) {
        Some(config) => Ok(json!({"success": true, "data": config})),
        None => Ok(json!({"success": false, "message": "服务不存在"})),
    }
}

#[tauri::command]
async fn create_service(
    state: tauri::State<'_, Mutex<AppState>>,
    service_data: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let mut s = state.lock().await;
    match s.config_manager.create_service(service_data) {
        Some(svc) => Ok(json!({"success": true, "data": svc, "message": "服务创建成功"})),
        None => Ok(json!({"success": false, "message": "创建服务失败"})),
    }
}

#[tauri::command]
async fn update_service(
    state: tauri::State<'_, Mutex<AppState>>,
    service_id: String,
    updates: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let mut s = state.lock().await;
    if s.config_manager.update_service_config(&service_id, updates) {
        Ok(json!({"success": true, "message": "配置已保存"}))
    } else {
        Ok(json!({"success": false, "message": "保存配置失败"}))
    }
}

#[tauri::command]
async fn delete_service(
    state: tauri::State<'_, Mutex<AppState>>,
    service_id: String,
) -> Result<serde_json::Value, String> {
    let mut s = state.lock().await;
    if s.config_manager.delete_service(&service_id) {
        Ok(json!({"success": true, "message": "服务已删除"}))
    } else {
        Ok(json!({"success": false, "message": "删除服务失败"}))
    }
}

#[tauri::command]
async fn reset_defaults(
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<serde_json::Value, String> {
    let mut s = state.lock().await;
    if s.config_manager.reset_to_defaults() {
        Ok(json!({"success": true, "message": "配置已重置为默认值"}))
    } else {
        Ok(json!({"success": false, "message": "重置配置失败"}))
    }
}

// ── Utility commands ──────────────────────────────────────────────────

#[tauri::command]
async fn open_external(url: String) -> Result<serde_json::Value, String> {
    open::that(&url).map_err(|e| e.to_string())?;
    Ok(json!({"success": true}))
}

#[tauri::command]
async fn open_logs_dir(
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<serde_json::Value, String> {
    let logs_dir = {
        let s = state.lock().await;
        PathBuf::from(&s.root_dir).join("logs")
    };
    let logs_str = logs_dir.to_string_lossy().to_string();
    if !logs_dir.exists() {
        let _ = std::fs::create_dir_all(&logs_dir);
    }
    open::that(&logs_str).map_err(|e| e.to_string())?;
    Ok(json!({"success": true}))
}

// ── Tauri app setup ───────────────────────────────────────────────────

/// 开发模式：从可执行文件路径或工作目录向上查找 easy-auto 仓库根目录（与 Electron 版一致）
fn get_root_dir_dev() -> String {
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("."));

    let mut current = exe_dir.clone();
    for _ in 0..10 {
        if current.join("app").is_dir() && current.join("web-antd").is_dir() {
            return current.to_string_lossy().to_string();
        }
        if current.join(".service_config.json").is_file() {
            return current.to_string_lossy().to_string();
        }
        match current.parent() {
            Some(p) => current = p.to_path_buf(),
            None => break,
        }
    }

    let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    let mut current = cwd.clone();
    for _ in 0..10 {
        if current.join("app").is_dir() && current.join("web-antd").is_dir() {
            return current.to_string_lossy().to_string();
        }
        match current.parent() {
            Some(p) => current = p.to_path_buf(),
            None => break,
        }
    }

    cwd.to_string_lossy().to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let root_dir = if cfg!(debug_assertions) {
                get_root_dir_dev()
            } else {
                app.path()
                    .app_data_dir()
                    .map_err(|e| e.to_string())?
                    .to_string_lossy()
                    .to_string()
            };
            println!("[Tauri] ROOT_DIR: {}", root_dir);

            let pid_file = PathBuf::from(&root_dir)
                .join(".service_pids.json")
                .to_string_lossy()
                .to_string();
            let pids = load_pids(&pid_file);
            let config_manager = ConfigManager::new(&root_dir);

            app.manage(Mutex::new(AppState {
                root_dir,
                config_manager,
                pids,
                pid_file,
            }));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            start_service,
            stop_service,
            restart_service,
            get_service_status,
            start_wechat,
            stop_wechat,
            get_wechat_status,
            check_wechat_api_health,
            get_wechat_push_config,
            set_wechat_push_config,
            get_all_config,
            get_all_services,
            get_service_config,
            create_service,
            update_service,
            delete_service,
            reset_defaults,
            open_external,
            open_logs_dir,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
