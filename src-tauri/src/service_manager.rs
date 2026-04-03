use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::process::Stdio;
use tokio::process::Command;
use std::io::{BufRead, BufReader};

use crate::service_config::ServiceConfig;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServiceStatus {
    pub running: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pid: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub port: Option<bool>,
}

// ── PID file management ───────────────────────────────────────────────

pub fn load_pids(pid_file: &str) -> HashMap<String, u32> {
    fs::read_to_string(pid_file)
        .ok()
        .and_then(|data| serde_json::from_str(&data).ok())
        .unwrap_or_default()
}

pub fn save_pids(pid_file: &str, pids: &HashMap<String, u32>) {
    let _ = fs::write(pid_file, serde_json::to_string_pretty(pids).unwrap_or_default());
}

// ── Port detection ────────────────────────────────────────────────────

pub async fn is_port_in_use(port: u16) -> bool {
    if let Some(result) = check_port_by_system_command(port).await {
        return result;
    }
    // Fallback: try to bind
    match std::net::TcpListener::bind(format!("127.0.0.1:{}", port)) {
        Ok(_) => false,
        Err(_) => true,
    }
}

#[cfg(target_os = "windows")]
async fn check_port_by_system_command(port: u16) -> Option<bool> {
    let output = Command::new("netstat")
        .args(["-ano"])
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .output()
        .await
        .ok()?;
    let text = String::from_utf8_lossy(&output.stdout);
    let pattern = format!(":{}", port);
    for line in text.lines() {
        if line.contains(&pattern) && line.contains("LISTENING") {
            return Some(true);
        }
    }
    Some(false)
}

#[cfg(not(target_os = "windows"))]
async fn check_port_by_system_command(port: u16) -> Option<bool> {
    let output = Command::new("lsof")
        .args(["-i", &format!(":{}", port), "-t"])
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .output()
        .await
        .ok()?;
    let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if !text.is_empty() {
        return Some(true);
    }
    // Try ss
    let output = Command::new("ss")
        .args(["-ln"])
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .output()
        .await
        .ok()?;
    let text = String::from_utf8_lossy(&output.stdout);
    let pattern = format!(":{}", port);
    for line in text.lines() {
        if line.contains(&pattern) && (line.contains("LISTEN") || line.contains("LISTENING")) {
            return Some(true);
        }
    }
    Some(false)
}

// ── PID by port ───────────────────────────────────────────────────────

#[cfg(target_os = "windows")]
pub async fn get_pid_by_port(port: u16) -> Option<u32> {
    let output = Command::new("netstat")
        .args(["-ano"])
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .output()
        .await
        .ok()?;
    let text = String::from_utf8_lossy(&output.stdout);
    let pattern = format!(":{}", port);
    for line in text.lines() {
        if line.contains(&pattern) && line.contains("LISTENING") {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if let Some(pid_str) = parts.last() {
                if let Ok(pid) = pid_str.parse::<u32>() {
                    return Some(pid);
                }
            }
        }
    }
    None
}

#[cfg(not(target_os = "windows"))]
pub async fn get_pid_by_port(port: u16) -> Option<u32> {
    let output = Command::new("lsof")
        .args(["-i", &format!(":{}", port), "-t"])
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .output()
        .await
        .ok()?;
    let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
    text.lines().next()?.parse::<u32>().ok()
}

// ── Process status ────────────────────────────────────────────────────

#[cfg(target_os = "windows")]
pub async fn is_process_running(pid: u32) -> bool {
    let output = Command::new("tasklist")
        .args(["/FI", &format!("PID eq {}", pid)])
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .output()
        .await;
    match output {
        Ok(o) => {
            let text = String::from_utf8_lossy(&o.stdout);
            let re = format!(r"\b{}\b", pid);
            regex_lite_match(&text, &re)
        }
        Err(_) => false,
    }
}

#[cfg(not(target_os = "windows"))]
pub async fn is_process_running(pid: u32) -> bool {
    unsafe { libc::kill(pid as i32, 0) == 0 }
}

fn regex_lite_match(text: &str, pattern: &str) -> bool {
    // Simple word-boundary PID match without regex crate
    let pid_str = pattern.trim_start_matches(r"\b").trim_end_matches(r"\b");
    for word in text.split_whitespace() {
        if word == pid_str {
            return true;
        }
    }
    false
}

// ── Kill process ──────────────────────────────────────────────────────

#[cfg(target_os = "windows")]
pub async fn kill_process(pid: u32) -> bool {
    if !is_process_running(pid).await {
        return true;
    }
    let result = Command::new("taskkill")
        .args(["/PID", &pid.to_string(), "/T", "/F"])
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .await;
    matches!(result, Ok(s) if s.success())
}

#[cfg(not(target_os = "windows"))]
pub async fn kill_process(pid: u32) -> bool {
    if !is_process_running(pid).await {
        return true;
    }
    unsafe {
        libc::kill(pid as i32, libc::SIGTERM);
    }
    for _ in 0..50 {
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
        if !is_process_running(pid).await {
            return true;
        }
    }
    unsafe {
        libc::kill(pid as i32, libc::SIGKILL);
    }
    true
}

// ── Start service ─────────────────────────────────────────────────────

pub async fn start_service(
    app: AppHandle,
    service_id: &str,
    config: &ServiceConfig,
    working_dir: &str,
) -> Result<(bool, Option<u32>, String), String> {
    if config.port > 0 {
        let in_use = is_port_in_use(config.port).await;
        if in_use {
            return Ok((
                false,
                None,
                format!("端口 {} 已被占用，服务可能已在运行", config.port),
            ));
        }
    }

    if !PathBuf::from(working_dir).exists() {
        return Ok((false, None, format!("工作目录不存在: {}", working_dir)));
    }

    let cmd_str = config.command.trim();
    if cmd_str.is_empty() {
        return Ok((false, None, "启动命令为空".to_string()));
    }

    #[cfg(target_os = "windows")]
    {
        return start_service_windows(&app, service_id, config, working_dir).await;
    }

    #[cfg(not(target_os = "windows"))]
    {
        start_service_unix(&app, service_id, config, working_dir).await
    }
}

#[cfg(not(target_os = "windows"))]
async fn start_service_unix(
    app: &AppHandle,
    service_id: &str,
    config: &ServiceConfig,
    working_dir: &str,
) -> Result<(bool, Option<u32>, String), String> {
    let _ = app.emit(
        "service-log",
        serde_json::json!({
            "serviceId": service_id,
            "type": "info",
            "message": format!("$ {}", config.command)
        }),
    );

    let user_shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
    let mut command = std::process::Command::new(&user_shell);
    command
        .args(["-l", "-c", &config.command])
        .current_dir(working_dir)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    unsafe {
        use std::os::unix::process::CommandExt;
        command.pre_exec(|| {
            libc::setsid();
            Ok(())
        });
    }

    match command.spawn() {
        Ok(mut child) => {
            let pid = child.id();
            tokio::time::sleep(std::time::Duration::from_millis(500)).await;
            if !is_process_running(pid).await {
                let mut err_msg = String::new();
                if let Some(mut stderr) = child.stderr.take() {
                    use std::io::Read;
                    let _ = stderr.read_to_string(&mut err_msg);
                }
                let detail = if err_msg.trim().is_empty() {
                    "进程启动后立即退出".to_string()
                } else {
                    err_msg.trim().to_string()
                };
                return Ok((false, None, format!("启动失败: {}", detail)));
            }

            let stdout = child.stdout.take();
            let stderr = child.stderr.take();
            let app_out = app.clone();
            let app_err = app.clone();
            let sid_out = service_id.to_string();
            let sid_err = service_id.to_string();

            if let Some(out) = stdout {
                std::thread::spawn(move || {
                    let reader = BufReader::new(out);
                    for line in reader.lines().flatten() {
                        let _ = app_out.emit(
                            "service-log",
                            serde_json::json!({
                                "serviceId": sid_out,
                                "type": "info",
                                "message": line
                            }),
                        );
                    }
                });
            }

            if let Some(err) = stderr {
                std::thread::spawn(move || {
                    let reader = BufReader::new(err);
                    for line in reader.lines().flatten() {
                        let _ = app_err.emit(
                            "service-log",
                            serde_json::json!({
                                "serviceId": sid_err,
                                "type": "error",
                                "message": line
                            }),
                        );
                    }
                });
            }

            Ok((true, Some(pid), format!("{} 启动成功 (PID: {})", config.name, pid)))
        }
        Err(e) => Ok((false, None, format!("启动失败: {}", e))),
    }
}

#[cfg(target_os = "windows")]
async fn start_service_windows(
    app: &AppHandle,
    service_id: &str,
    config: &ServiceConfig,
    working_dir: &str,
) -> Result<(bool, Option<u32>, String), String> {
    use std::os::windows::process::CommandExt;
    const CREATE_NEW_PROCESS_GROUP: u32 = 0x00000200;

    let _ = app.emit(
        "service-log",
        serde_json::json!({
            "serviceId": service_id,
            "type": "info",
            "message": format!("$ {}", config.command)
        }),
    );

    let mut command = std::process::Command::new("cmd");
    command
        .args(["/C", &config.command])
        .current_dir(working_dir)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    command.creation_flags(CREATE_NEW_PROCESS_GROUP);

    match command.spawn() {
        Ok(mut child) => {
            let pid = child.id();
            tokio::time::sleep(std::time::Duration::from_millis(500)).await;
            if !is_process_running(pid).await {
                return Ok((false, None, "启动失败，进程已退出".to_string()));
            }

            let stdout = child.stdout.take();
            let stderr = child.stderr.take();
            let app_out = app.clone();
            let app_err = app.clone();
            let sid_out = service_id.to_string();
            let sid_err = service_id.to_string();

            if let Some(out) = stdout {
                std::thread::spawn(move || {
                    let reader = BufReader::new(out);
                    for line in reader.lines().flatten() {
                        let _ = app_out.emit(
                            "service-log",
                            serde_json::json!({
                                "serviceId": sid_out,
                                "type": "info",
                                "message": line
                            }),
                        );
                    }
                });
            }

            if let Some(err) = stderr {
                std::thread::spawn(move || {
                    let reader = BufReader::new(err);
                    for line in reader.lines().flatten() {
                        let _ = app_err.emit(
                            "service-log",
                            serde_json::json!({
                                "serviceId": sid_err,
                                "type": "error",
                                "message": line
                            }),
                        );
                    }
                });
            }

            Ok((true, Some(pid), format!("{} 启动成功 (PID: {})", config.name, pid)))
        }
        Err(e) => Ok((false, None, format!("启动失败: {}", e))),
    }
}

// ── Stop service ──────────────────────────────────────────────────────

pub async fn stop_service(
    service_id: &str,
    config: Option<&ServiceConfig>,
    pids: &mut HashMap<String, u32>,
    pid_file: &str,
) -> (bool, String) {
    let _ = config;
    let pid = match pids.get(service_id).copied() {
        Some(p) => p,
        None => return (true, "服务未运行".to_string()),
    };

    if !is_process_running(pid).await {
        pids.remove(service_id);
        save_pids(pid_file, pids);
        return (true, format!("进程 {} 已不存在", pid));
    }

    let killed = kill_process(pid).await;
    if killed {
        pids.remove(service_id);
        save_pids(pid_file, pids);
        (true, format!("服务已停止 (PID: {})", pid))
    } else {
        (false, format!("停止失败 (PID: {})", pid))
    }
}

// ── Get status ────────────────────────────────────────────────────────

pub async fn get_all_status(
    configs: &[ServiceConfig],
    pids: &mut HashMap<String, u32>,
    pid_file: &str,
) -> HashMap<String, ServiceStatus> {
    let mut result = HashMap::new();

    // Only monitor PID existence (no port probing).
    // PID source is `pids` loaded from pid_file when the app starts, and updated when start/stop succeeds.
    for config in configs {
        let pid = pids.get(&config.id).copied();
        let running = match pid {
            Some(p) => {
                let r = is_process_running(p).await;
                if !r {
                    pids.remove(&config.id);
                    save_pids(pid_file, pids);
                }
                r
            }
            None => false,
        };

        result.insert(
            config.id.clone(),
            ServiceStatus {
                running,
                pid: if running { pid } else { None },
                // We intentionally do not probe ports anymore.
                port: None,
            },
        );
    }

    result
}
