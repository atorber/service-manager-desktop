use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::process::Stdio;
use tokio::process::Command;

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

// ── Parse command ─────────────────────────────────────────────────────

fn parse_command(cmd_str: &str) -> (String, Vec<String>) {
    let parts: Vec<&str> = cmd_str.trim().split_whitespace().collect();
    if parts.is_empty() {
        return (String::new(), vec![]);
    }
    let cmd = parts[0].to_string();
    let args = parts[1..].iter().map(|s| s.to_string()).collect();
    (cmd, args)
}

// ── Start service ─────────────────────────────────────────────────────

pub async fn start_service(
    root_dir: &str,
    config: &ServiceConfig,
    working_dir: &str,
) -> Result<(bool, Option<u32>, String), String> {
    // Check port if > 0
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

    let (cmd, args) = parse_command(&config.command);
    if cmd.is_empty() {
        return Ok((false, None, "启动命令为空".to_string()));
    }

    let is_script_task = config.port == 0;

    // Windows script tasks: use PowerShell Start-Process to get real PID
    #[cfg(target_os = "windows")]
    if is_script_task {
        return start_script_task_windows(root_dir, config, working_dir, &cmd, &args).await;
    }

    let env_vars = vec![
        ("ROOT_PATH".to_string(), root_dir.to_string()),
        (
            "PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION".to_string(),
            "python".to_string(),
        ),
    ];

    let mut command = std::process::Command::new(&cmd);
    command.args(&args).current_dir(working_dir);
    for (k, v) in &env_vars {
        command.env(k, v);
    }

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NEW_PROCESS_GROUP: u32 = 0x00000200;
        command.creation_flags(CREATE_NEW_PROCESS_GROUP);
        if !is_script_task {
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            command.creation_flags(CREATE_NEW_PROCESS_GROUP | CREATE_NO_WINDOW);
        }
    }

    #[cfg(unix)]
    {
        use std::os::unix::process::CommandExt;
        unsafe {
            command.pre_exec(|| {
                libc::setsid();
                Ok(())
            });
        }
    }

    // For services with port > 0, we use shell mode
    #[cfg(target_os = "windows")]
    {
        let mut shell_cmd = std::process::Command::new("cmd");
        shell_cmd
            .args(["/C", &config.command])
            .current_dir(working_dir);
        for (k, v) in &env_vars {
            shell_cmd.env(k, v);
        }
        use std::os::windows::process::CommandExt;
        const CREATE_NEW_PROCESS_GROUP: u32 = 0x00000200;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        shell_cmd.creation_flags(CREATE_NEW_PROCESS_GROUP | CREATE_NO_WINDOW);
        shell_cmd.stdin(Stdio::null()).stdout(Stdio::null()).stderr(Stdio::null());

        match shell_cmd.spawn() {
            Ok(child) => {
                let pid = child.id();
                tokio::time::sleep(std::time::Duration::from_millis(500)).await;
                if is_process_running(pid).await {
                    return Ok((true, Some(pid), format!("{} 启动成功 (PID: {})", config.name, pid)));
                } else {
                    return Ok((false, None, "启动失败，进程已退出".to_string()));
                }
            }
            Err(e) => return Ok((false, None, format!("启动失败: {}", e))),
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        command
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null());

        match command.spawn() {
            Ok(child) => {
                let pid = child.id();
                tokio::time::sleep(std::time::Duration::from_millis(500)).await;
                if is_process_running(pid).await {
                    Ok((true, Some(pid), format!("{} 启动成功 (PID: {})", config.name, pid)))
                } else {
                    Ok((false, None, "启动失败，进程已退出".to_string()))
                }
            }
            Err(e) => Ok((false, None, format!("启动失败: {}", e))),
        }
    }
}

#[cfg(target_os = "windows")]
async fn start_script_task_windows(
    root_dir: &str,
    config: &ServiceConfig,
    working_dir: &str,
    cmd: &str,
    args: &[String],
) -> Result<(bool, Option<u32>, String), String> {
    let arg_list_str = args
        .iter()
        .map(|a| format!("'{}'", a.replace('\'', "''")))
        .collect::<Vec<_>>()
        .join(",");

    let ps_script = format!(
        "$env:ROOT_PATH='{}'; \
         $env:PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION='python'; \
         $wd='{}'; $exe='{}'; \
         $argList=@({}); \
         $p=Start-Process -FilePath $exe -ArgumentList $argList -WorkingDirectory $wd -PassThru; \
         Write-Output $p.Id",
        root_dir.replace('\'', "''"),
        working_dir.replace('\'', "''"),
        cmd.replace('\'', "''"),
        arg_list_str,
    );

    let output = Command::new("powershell")
        .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", &ps_script])
        .current_dir(working_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if let Ok(pid) = stdout.parse::<u32>() {
        if pid > 0 {
            return Ok((true, Some(pid), format!("{} 已启动 (PID: {})", config.name, pid)));
        }
    }
    Ok((true, None, format!("{} 已在独立窗口中启动", config.name)))
}

// ── Stop service ──────────────────────────────────────────────────────

pub async fn stop_service(
    service_id: &str,
    config: Option<&ServiceConfig>,
    pids: &mut HashMap<String, u32>,
    pid_file: &str,
) -> (bool, String) {
    let port = config.map(|c| c.port).unwrap_or(0);
    let mut pid = pids.get(service_id).copied();

    if port > 0 {
        let port_in_use = is_port_in_use(port).await;
        if port_in_use {
            if let Some(port_pid) = get_pid_by_port(port).await {
                pid = Some(port_pid);
                pids.insert(service_id.to_string(), port_pid);
                save_pids(pid_file, pids);
            }
        }
    }

    let pid = match pid {
        Some(p) => p,
        None => {
            if port > 0 && is_port_in_use(port).await {
                return (false, "端口被占用但无法找到进程PID".to_string());
            }
            return (true, "服务未运行".to_string());
        }
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

    // Collect port-based services and script-based separately
    let mut port_checks = Vec::new();
    let mut script_services = Vec::new();

    for config in configs {
        if config.id == "backend" || config.id == "frontend" || config.id == "wechat" {
            port_checks.push(config);
        } else if config.port > 0 {
            port_checks.push(config);
        } else {
            script_services.push(config);
        }
    }

    // Check port-based services
    for config in &port_checks {
        let port_in_use = is_port_in_use(config.port).await;

        if port_in_use {
            if let Some(port_pid) = get_pid_by_port(config.port).await {
                let old_pid = pids.get(&config.id).copied();
                if old_pid != Some(port_pid) {
                    pids.insert(config.id.clone(), port_pid);
                    save_pids(pid_file, pids);
                }
                result.insert(
                    config.id.clone(),
                    ServiceStatus {
                        running: true,
                        pid: Some(port_pid),
                        port: Some(true),
                    },
                );
            } else {
                let pid = pids.get(&config.id).copied();
                result.insert(
                    config.id.clone(),
                    ServiceStatus {
                        running: true,
                        pid,
                        port: Some(true),
                    },
                );
            }
        } else {
            if pids.contains_key(&config.id) {
                pids.remove(&config.id);
                save_pids(pid_file, pids);
            }
            result.insert(
                config.id.clone(),
                ServiceStatus {
                    running: false,
                    pid: None,
                    port: Some(false),
                },
            );
        }
    }

    // Check script-based services (port == 0, check PID only)
    for config in &script_services {
        let pid = pids.get(&config.id).copied();
        let running = if let Some(p) = pid {
            let r = is_process_running(p).await;
            if !r {
                pids.remove(&config.id);
                save_pids(pid_file, pids);
            }
            r
        } else {
            false
        };
        result.insert(
            config.id.clone(),
            ServiceStatus {
                running,
                pid: if running { pid } else { None },
                port: None,
            },
        );
    }

    result
}
