use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::process::Stdio;
use tokio::process::Command;
use std::io::{BufRead, BufReader};
#[cfg(target_os = "windows")]
use std::sync::{Mutex, OnceLock};
#[cfg(target_os = "windows")]
use std::time::Instant;

use crate::service_config::ServiceConfig;

fn parse_leading_cd_dir(cmd: &str) -> Option<String> {
    // Very small parser for commands like:
    // - cd C:\path\to\dir\ && npm run start
    // - cd "C:\path with spaces" && npm run start
    // - cd /Users/app && npm run dev
    let s = cmd.trim_start();
    if s.len() < 3 {
        return None;
    }
    let lower = s.to_ascii_lowercase();
    if !lower.starts_with("cd ") {
        return None;
    }
    let mut rest = s[3..].trim_start();
    if rest.is_empty() {
        return None;
    }
    let dir = if rest.starts_with('"') {
        rest = &rest[1..];
        let end = rest.find('"')?;
        rest[..end].to_string()
    } else {
        let end = rest.find("&&").unwrap_or(rest.len());
        rest[..end].trim().to_string()
    };
    if dir.is_empty() {
        None
    } else {
        Some(dir)
    }
}

fn strip_leading_cd_chain(cmd: &str) -> String {
    let s = cmd.trim_start();
    if s.len() < 3 {
        return cmd.to_string();
    }
    if !s.to_ascii_lowercase().starts_with("cd ") {
        return cmd.to_string();
    }
    if let Some(idx) = s.find("&&") {
        return s[idx + 2..].trim_start().to_string();
    }
    cmd.to_string()
}

/// 避免在 GUI 应用里反复拉起控制台子进程时出现 CMD 黑窗闪烁（状态轮询会高频调用 tasklist 等）。
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
#[cfg(target_os = "windows")]
const WIN_CREATE_NO_WINDOW: u32 = 0x0800_0000;
#[cfg(target_os = "windows")]
const WIN_CREATE_NEW_PROCESS_GROUP: u32 = 0x0000_0200;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServiceStatus {
    pub running: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pid: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub port: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cpu_percent: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub memory_bytes: Option<u64>,
}

#[derive(Debug, Clone, Copy)]
struct ProcessMetrics {
    cpu_percent: f32,
    memory_bytes: u64,
}

// ── PID file management ───────────────────────────────────────────────

pub fn load_pids(pid_file: &str) -> HashMap<String, u32> {
    fs::read_to_string(pid_file)
        .ok()
        .and_then(|data| serde_json::from_str(&data).ok())
        .unwrap_or_default()
}

pub fn save_pids(pid_file: &str, pids: &HashMap<String, u32>) {
    let path = std::path::Path::new(pid_file);
    if let Some(parent) = path.parent() {
        if let Err(e) = fs::create_dir_all(parent) {
            eprintln!("[pids] create_dir_all {:?}: {}", parent, e);
            return;
        }
    }
    match fs::write(path, serde_json::to_string_pretty(pids).unwrap_or_default()) {
        Ok(()) => {}
        Err(e) => eprintln!("[pids] write {:?}: {}", path, e),
    }
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
        .creation_flags(WIN_CREATE_NO_WINDOW)
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
        .creation_flags(WIN_CREATE_NO_WINDOW)
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
        .creation_flags(WIN_CREATE_NO_WINDOW)
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

#[cfg(target_os = "windows")]
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

#[cfg(not(target_os = "windows"))]
async fn get_process_metrics(pid: u32) -> Option<ProcessMetrics> {
    let output = Command::new("ps")
        .args(["-p", &pid.to_string(), "-o", "%cpu=", "-o", "rss="])
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .output()
        .await
        .ok()?;
    let text = String::from_utf8_lossy(&output.stdout);
    let line = text.lines().find(|l| !l.trim().is_empty())?.trim().to_string();
    let mut parts = line.split_whitespace();
    let cpu_percent = parts.next()?.parse::<f32>().ok()?;
    let rss_kb = parts.next()?.parse::<u64>().ok()?;
    Some(ProcessMetrics {
        cpu_percent,
        memory_bytes: rss_kb.saturating_mul(1024),
    })
}

#[cfg(target_os = "windows")]
async fn get_process_metrics(pid: u32) -> Option<ProcessMetrics> {
    let script = format!(
        "$ErrorActionPreference='SilentlyContinue'; \
         $p=Get-Process -Id {}; \
         if ($null -eq $p) {{ exit 1 }}; \
         $cpu=[double]$p.CPU; \
         $ws=[uint64]$p.WorkingSet64; \
         Write-Output ('{0}|{1}' -f $cpu,$ws)",
        pid
    );

    let output = Command::new("powershell")
        .args(["-NoProfile", "-Command", &script])
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .creation_flags(WIN_CREATE_NO_WINDOW)
        .output()
        .await
        .ok()?;

    let text = String::from_utf8_lossy(&output.stdout);
    let line = text.lines().find(|l| !l.trim().is_empty())?.trim().to_string();
    if line.is_empty() {
        let mut cache = windows_cpu_cache().lock().ok()?;
        cache.remove(&pid);
        return None;
    }
    let mut parts = line.split('|');
    let cpu_seconds = parts.next()?.trim().parse::<f64>().ok()?;
    let memory_bytes = parts.next()?.trim().parse::<u64>().ok()?;
    if parts.next().is_some() {
        return None;
    }

    let now = Instant::now();
    let logical_cores = std::thread::available_parallelism()
        .map(|n| n.get() as f64)
        .unwrap_or(1.0)
        .max(1.0);
    let mut cpu_percent = 0.0_f64;

    if let Ok(mut cache) = windows_cpu_cache().lock() {
        if let Some((last_cpu_seconds, last_ts)) = cache.get(&pid).copied() {
            let elapsed = now.duration_since(last_ts).as_secs_f64();
            if elapsed > 0.0 {
                let cpu_delta = (cpu_seconds - last_cpu_seconds).max(0.0);
                cpu_percent = (cpu_delta / (elapsed * logical_cores)) * 100.0;
            }
        }
        cache.insert(pid, (cpu_seconds, now));
    }

    let cpu_percent = cpu_percent.clamp(0.0, 100.0) as f32;
    Some(ProcessMetrics {
        cpu_percent,
        memory_bytes,
    })
}

#[cfg(target_os = "windows")]
fn windows_cpu_cache() -> &'static Mutex<HashMap<u32, (f64, Instant)>> {
    static CACHE: OnceLock<Mutex<HashMap<u32, (f64, Instant)>>> = OnceLock::new();
    CACHE.get_or_init(|| Mutex::new(HashMap::new()))
}

/// 从子进程的 stdout/stderr 读取输出并通过 Tauri 事件推送到前端。
/// 使用 `read_until` + `from_utf8_lossy` 而非 `lines().flatten()`，
/// 以正确处理中文 Windows 下 GBK 编码的管道输出。
fn spawn_output_reader(
    output: impl std::io::Read + Send + 'static,
    app: AppHandle,
    service_id: String,
    log_type: &'static str,
) {
    std::thread::spawn(move || {
        let mut reader = BufReader::new(output);
        let mut buf = Vec::new();
        loop {
            buf.clear();
            match reader.read_until(b'\n', &mut buf) {
                Ok(0) => break,
                Ok(_) => {
                    let line = String::from_utf8_lossy(&buf).trim_end().to_string();
                    if !line.is_empty() {
                        let _ = app.emit(
                            "service-log",
                            serde_json::json!({
                                "serviceId": service_id,
                                "type": log_type,
                                "message": line
                            }),
                        );
                    }
                }
                Err(_) => break,
            }
        }
    });
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
        .creation_flags(WIN_CREATE_NO_WINDOW)
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

    let cmd_str = config.command.trim();
    if cmd_str.is_empty() {
        return Ok((false, None, "启动命令为空".to_string()));
    }

    let wd_exists = PathBuf::from(working_dir).exists();
    let cd_dir = parse_leading_cd_dir(cmd_str);
    let cd_dir_exists = cd_dir
        .as_deref()
        .is_some_and(|d| PathBuf::from(d).exists());

    // Prefer `working_dir` if it exists. If it doesn't, but the command starts with `cd <dir>`,
    // allow starting and optionally use that directory as `current_dir`.
    let effective_working_dir: Option<String> = if wd_exists {
        Some(working_dir.to_string())
    } else if cd_dir_exists {
        cd_dir
    } else {
        None
    };

    if effective_working_dir.is_none() && !wd_exists {
        return Ok((
            false,
            None,
            format!(
                "工作目录不存在: {}（且命令未提供可用的 cd 目录）",
                working_dir
            ),
        ));
    }

    #[cfg(target_os = "windows")]
    {
        return start_service_windows(&app, service_id, config, effective_working_dir.as_deref())
            .await;
    }

    #[cfg(not(target_os = "windows"))]
    {
        start_service_unix(&app, service_id, config, effective_working_dir.as_deref()).await
    }
}

#[cfg(not(target_os = "windows"))]
async fn start_service_unix(
    app: &AppHandle,
    service_id: &str,
    config: &ServiceConfig,
    working_dir: Option<&str>,
) -> Result<(bool, Option<u32>, String), String> {
    let runtime_command = if working_dir.is_some() {
        strip_leading_cd_chain(&config.command)
    } else {
        config.command.clone()
    };
    let _ = app.emit(
        "service-log",
        serde_json::json!({
            "serviceId": service_id,
            "type": "info",
            "message": format!("$ {}", runtime_command)
        }),
    );

    let user_shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
    let mut command = std::process::Command::new(&user_shell);
    command
        .args(["-l", "-c", &runtime_command])
        .env("PYTHONUNBUFFERED", "1")
        .env("PYTHONIOENCODING", "utf-8")
        .env("PYTHONUTF8", "1")
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    if let Some(wd) = working_dir {
        command.current_dir(wd);
    }

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
                let exit_status = child.try_wait().ok().flatten();
                let exit_code = exit_status.and_then(|s| s.code());
                let exit_code_str = exit_code
                    .map(|c| format!(" (exit code: {})", c))
                    .unwrap_or_default();
                let mut out_msg = String::new();
                let mut err_msg = String::new();
                if let Some(mut stdout) = child.stdout.take() {
                    use std::io::Read;
                    let _ = stdout.read_to_string(&mut out_msg);
                }
                if let Some(mut stderr) = child.stderr.take() {
                    use std::io::Read;
                    let _ = stderr.read_to_string(&mut err_msg);
                }
                let out = out_msg.trim();
                let err = err_msg.trim();
                let detail = if out.is_empty() && err.is_empty() {
                    format!("进程启动后立即退出{}", exit_code_str)
                } else if !err.is_empty() && !out.is_empty() {
                    format!("{}{}\n{}", err, exit_code_str, out)
                } else if !err.is_empty() {
                    format!("{}{}", err, exit_code_str)
                } else {
                    format!("{}{}", out, exit_code_str)
                };
                return Ok((false, None, format!("启动失败: {}", detail)));
            }

            // For shell-wrapped commands (e.g. `npm run dev`), child pid may be a wrapper process.
            // Prefer tracking the actual listener PID when a service port is configured.
            let tracked_pid = if config.port > 0 {
                let mut port_pid = get_pid_by_port(config.port).await;
                if port_pid.is_none() {
                    for _ in 0..20 {
                        tokio::time::sleep(std::time::Duration::from_millis(250)).await;
                        port_pid = get_pid_by_port(config.port).await;
                        if port_pid.is_some() {
                            break;
                        }
                    }
                }
                if port_pid.is_none() {
                    let _ = kill_process(pid).await;
                    return Ok((
                        false,
                        None,
                        format!(
                            "启动失败: 命令已执行但端口 {} 未监听，请检查启动命令与工作目录",
                            config.port
                        ),
                    ));
                }
                port_pid.or(Some(pid))
            } else {
                Some(pid)
            };

            if let Some(out) = child.stdout.take() {
                spawn_output_reader(out, app.clone(), service_id.to_string(), "info");
            }
            if let Some(err) = child.stderr.take() {
                spawn_output_reader(err, app.clone(), service_id.to_string(), "error");
            }

            let shown_pid = tracked_pid.unwrap_or(pid);
            Ok((
                true,
                tracked_pid,
                format!("{} 启动成功 (PID: {})", config.name, shown_pid),
            ))
        }
        Err(e) => Ok((false, None, format!("启动失败: {}", e))),
    }
}

#[cfg(target_os = "windows")]
async fn start_service_windows(
    app: &AppHandle,
    service_id: &str,
    config: &ServiceConfig,
    working_dir: Option<&str>,
) -> Result<(bool, Option<u32>, String), String> {
    let runtime_command = if working_dir.is_some() {
        strip_leading_cd_chain(&config.command)
    } else {
        config.command.clone()
    };
    let _ = app.emit(
        "service-log",
        serde_json::json!({
            "serviceId": service_id,
            "type": "info",
            "message": format!("$ {}", runtime_command)
        }),
    );

    let mut command = std::process::Command::new("cmd");
    command
        .args(["/C", &runtime_command])
        .env("PYTHONUNBUFFERED", "1")
        .env("PYTHONIOENCODING", "utf-8")
        .env("PYTHONUTF8", "1")
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    if let Some(wd) = working_dir {
        command.current_dir(wd);
    }
    command.creation_flags(WIN_CREATE_NEW_PROCESS_GROUP | WIN_CREATE_NO_WINDOW);

    match command.spawn() {
        Ok(mut child) => {
            let pid = child.id();
            tokio::time::sleep(std::time::Duration::from_millis(500)).await;
            if !is_process_running(pid).await {
                let mut out_msg = String::new();
                let mut err_msg = String::new();
                let exit_status = child.try_wait().ok().flatten();
                let exit_code = exit_status.and_then(|s| s.code());
                let exit_code_str = exit_code
                    .map(|c| format!(" (exit code: {})", c))
                    .unwrap_or_default();
                if let Some(mut stdout) = child.stdout.take() {
                    use std::io::Read;
                    let _ = stdout.read_to_string(&mut out_msg);
                }
                if let Some(mut stderr) = child.stderr.take() {
                    use std::io::Read;
                    let _ = stderr.read_to_string(&mut err_msg);
                }
                let out = out_msg.trim();
                let err = err_msg.trim();
                let detail = if out.is_empty() && err.is_empty() {
                    format!("进程启动后立即退出{}", exit_code_str)
                } else if !err.is_empty() && !out.is_empty() {
                    format!("{}{}\n{}", err, exit_code_str, out)
                } else if !err.is_empty() {
                    format!("{}{}", err, exit_code_str)
                } else {
                    format!("{}{}", out, exit_code_str)
                };
                return Ok((false, None, format!("启动失败: {}", detail)));
            }

            // For shell-wrapped commands (e.g. `npm run dev`), child pid may be a wrapper process.
            // Prefer tracking the actual listener PID when a service port is configured.
            let tracked_pid = if config.port > 0 {
                let mut port_pid = get_pid_by_port(config.port).await;
                if port_pid.is_none() {
                    for _ in 0..20 {
                        tokio::time::sleep(std::time::Duration::from_millis(250)).await;
                        port_pid = get_pid_by_port(config.port).await;
                        if port_pid.is_some() {
                            break;
                        }
                    }
                }
                if port_pid.is_none() {
                    let _ = kill_process(pid).await;
                    return Ok((
                        false,
                        None,
                        format!(
                            "启动失败: 命令已执行但端口 {} 未监听，请检查启动命令与工作目录",
                            config.port
                        ),
                    ));
                }
                port_pid.or(Some(pid))
            } else {
                Some(pid)
            };

            if let Some(out) = child.stdout.take() {
                spawn_output_reader(out, app.clone(), service_id.to_string(), "info");
            }
            if let Some(err) = child.stderr.take() {
                spawn_output_reader(err, app.clone(), service_id.to_string(), "error");
            }

            let shown_pid = tracked_pid.unwrap_or(pid);
            Ok((
                true,
                tracked_pid,
                format!("{} 启动成功 (PID: {})", config.name, shown_pid),
            ))
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
        let final_pid = if running { pid } else { None };
        let metrics = if running {
            match final_pid {
                Some(p) => get_process_metrics(p).await,
                None => None,
            }
        } else {
            None
        };

        result.insert(
            config.id.clone(),
            ServiceStatus {
                running,
                pid: final_pid,
                // We intentionally do not probe ports anymore.
                port: None,
                cpu_percent: metrics.map(|m| m.cpu_percent),
                memory_bytes: metrics.map(|m| m.memory_bytes),
            },
        );
    }

    result
}
