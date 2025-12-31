use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Manager};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandChild;

/// Holds the server state including the spawned process and port
pub struct ServerState {
    port: u16,
    #[allow(dead_code)]
    child: Arc<CommandChild>,
}

impl ServerState {
    pub fn port(&self) -> u16 {
        self.port
    }
}

/// Find an available port for the Next.js server
fn find_available_port() -> Result<u16, Box<dyn std::error::Error>> {
    portpicker::pick_unused_port().ok_or_else(|| "No available port found".into())
}

/// Start the Next.js standalone server as a sidecar process
pub fn start_server(app: &AppHandle) -> Result<ServerState, Box<dyn std::error::Error>> {
    let port = find_available_port()?;
    log::info!("Starting Next.js server on port {}", port);

    // Get the path to the standalone server
    let resource_path = app
        .path()
        .resource_dir()
        .map_err(|e| format!("Failed to get resource dir: {}", e))?;

    let server_path = resource_path.join("standalone").join("server.js");
    log::info!("Server path: {:?}", server_path);

    // Spawn the Node.js sidecar with the server script
    let shell = app.shell();
    let command = shell
        .sidecar("node")
        .map_err(|e| format!("Failed to create sidecar command: {}", e))?
        .args([
            server_path.to_string_lossy().to_string(),
        ])
        .env("PORT", port.to_string())
        .env("HOSTNAME", "localhost".to_string());

    let (_, child) = command
        .spawn()
        .map_err(|e| format!("Failed to spawn server: {}", e))?;

    log::info!("Next.js server process spawned");

    Ok(ServerState {
        port,
        child: Arc::new(child),
    })
}

/// Wait for the server to be ready by polling the health endpoint
pub async fn wait_for_server(port: u16) {
    let url = format!("http://localhost:{}", port);
    let client = reqwest::Client::new();
    let max_attempts = 30;
    let delay = Duration::from_millis(500);

    log::info!("Waiting for server at {}", url);

    for attempt in 1..=max_attempts {
        match client.get(&url).send().await {
            Ok(response) if response.status().is_success() || response.status().is_redirection() => {
                log::info!("Server ready after {} attempts", attempt);
                return;
            }
            Ok(_) => {
                log::debug!("Server responded but not ready (attempt {})", attempt);
            }
            Err(_) => {
                log::debug!("Server not ready (attempt {})", attempt);
            }
        }
        tokio::time::sleep(delay).await;
    }

    log::warn!("Server may not be fully ready after {} attempts", max_attempts);
}
