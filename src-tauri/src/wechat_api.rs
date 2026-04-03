use serde_json::json;

pub async fn check_api_health(port: u16) -> bool {
    let url = format!("http://127.0.0.1:{}/api/health", port);
    match reqwest::Client::new()
        .get(&url)
        .timeout(std::time::Duration::from_secs(3))
        .send()
        .await
    {
        Ok(resp) => {
            if let Ok(val) = resp.json::<serde_json::Value>().await {
                val.get("code").and_then(|c| c.as_i64()) == Some(1)
            } else {
                false
            }
        }
        Err(_) => false,
    }
}

pub async fn get_push_config(port: u16) -> Option<serde_json::Value> {
    let url = format!("http://127.0.0.1:{}/api/push/config", port);
    let resp = reqwest::Client::new()
        .get(&url)
        .timeout(std::time::Duration::from_secs(3))
        .send()
        .await
        .ok()?;
    let val = resp.json::<serde_json::Value>().await.ok()?;
    if val.get("code").and_then(|c| c.as_i64()) == Some(1) {
        val.get("data").cloned()
    } else {
        None
    }
}

pub async fn set_push_config(
    port: u16,
    enabled: bool,
    callback_url: &str,
) -> Result<String, String> {
    if enabled && callback_url.is_empty() {
        return Err("开启推送时必须提供回调地址".into());
    }
    if !callback_url.is_empty()
        && !callback_url.starts_with("http://")
        && !callback_url.starts_with("https://")
    {
        return Err("回调地址格式不正确，应为 http:// 或 https:// 开头的完整 URL".into());
    }

    let url = format!("http://127.0.0.1:{}/api/push/config", port);
    let body = json!({
        "enabled": enabled,
        "callbackUrl": if enabled { callback_url } else { "" },
    });

    let resp = reqwest::Client::new()
        .post(&url)
        .json(&body)
        .timeout(std::time::Duration::from_secs(5))
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;

    let val = resp
        .json::<serde_json::Value>()
        .await
        .map_err(|e| format!("解析响应失败: {}", e))?;

    if val.get("code").and_then(|c| c.as_i64()) == Some(1) {
        Ok("推送配置设置成功".into())
    } else {
        Err(val
            .get("msg")
            .and_then(|m| m.as_str())
            .unwrap_or("未知错误")
            .to_string())
    }
}
