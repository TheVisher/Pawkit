mod server;
mod plugins;

use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{Emitter, Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

// =============================================================================
// WINDOW STATE PERSISTENCE
// =============================================================================

#[derive(Clone, serde::Serialize, serde::Deserialize, Debug)]
struct WindowState {
    x: i32,
    y: i32,
    width: u32,
    height: u32,
    maximized: bool,
}

impl Default for WindowState {
    fn default() -> Self {
        Self {
            x: 100,
            y: 100,
            width: 1200,
            height: 800,
            maximized: false,
        }
    }
}

// Portal-specific defaults
fn default_portal_state() -> WindowState {
    WindowState {
        x: 100,
        y: 100,
        width: 500,
        height: 600,
        maximized: false,
    }
}

fn get_window_state_path(app: &tauri::AppHandle, window_name: &str) -> Option<PathBuf> {
    app.path().app_data_dir().ok().map(|dir| dir.join(format!("{}-window-state.json", window_name)))
}

fn load_window_state(app: &tauri::AppHandle, window_name: &str, default: WindowState) -> WindowState {
    if let Some(path) = get_window_state_path(app, window_name) {
        if let Ok(content) = fs::read_to_string(&path) {
            if let Ok(state) = serde_json::from_str::<WindowState>(&content) {
                log::info!("Loaded {} window state: {:?}", window_name, state);
                return state;
            }
        }
    }
    default
}

fn save_window_state(app: &tauri::AppHandle, window_name: &str, state: &WindowState) {
    if let Some(path) = get_window_state_path(app, window_name) {
        // Ensure directory exists
        if let Some(parent) = path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        if let Ok(content) = serde_json::to_string_pretty(state) {
            let _ = fs::write(&path, content);
            log::debug!("Saved {} window state: {:?}", window_name, state);
        }
    }
}

// Legacy compatibility aliases
fn get_portal_state_path(app: &tauri::AppHandle) -> Option<PathBuf> {
    get_window_state_path(app, "portal")
}

fn load_portal_state(app: &tauri::AppHandle) -> WindowState {
    load_window_state(app, "portal", default_portal_state())
}

fn save_portal_state(app: &tauri::AppHandle, state: &WindowState) {
    save_window_state(app, "portal", state)
}

// State holder for debouncing saves
struct PortalStateHolder {
    state: Mutex<WindowState>,
}

#[cfg(target_os = "macos")]
mod macos_pasteboard {
    use cocoa::base::{id, nil};
    use cocoa::foundation::NSString;
    use objc::{class, msg_send, sel, sel_impl};

    pub fn get_drag_url() -> Option<String> {
        unsafe {
            // Get the drag pasteboard
            let pasteboard: id = msg_send![class!(NSPasteboard), pasteboardWithName: NSString::alloc(nil).init_str("Apple CFPasteboard drag")];

            if pasteboard == nil {
                // Try general pasteboard as fallback
                let pasteboard: id = msg_send![class!(NSPasteboard), generalPasteboard];
                return read_url_from_pasteboard(pasteboard);
            }

            read_url_from_pasteboard(pasteboard)
        }
    }

    unsafe fn read_url_from_pasteboard(pasteboard: id) -> Option<String> {
        if pasteboard == nil {
            return None;
        }

        // Try to read URL type
        let url_type = NSString::alloc(nil).init_str("public.url");
        let _url_string_type = NSString::alloc(nil).init_str("public.url-name");
        let string_type = NSString::alloc(nil).init_str("public.utf8-plain-text");

        // Try URL first
        let content: id = msg_send![pasteboard, stringForType: url_type];
        if content != nil {
            let rust_string = nsstring_to_rust(content);
            if rust_string.starts_with("http://") || rust_string.starts_with("https://") {
                return Some(rust_string);
            }
        }

        // Try plain text (URLs are often stored as text)
        let content: id = msg_send![pasteboard, stringForType: string_type];
        if content != nil {
            let rust_string = nsstring_to_rust(content);
            if rust_string.starts_with("http://") || rust_string.starts_with("https://") {
                return Some(rust_string);
            }
        }

        None
    }

    unsafe fn nsstring_to_rust(nsstring: id) -> String {
        let cstr: *const i8 = msg_send![nsstring, UTF8String];
        if cstr.is_null() {
            return String::new();
        }
        std::ffi::CStr::from_ptr(cstr)
            .to_string_lossy()
            .into_owned()
    }
}

#[cfg(not(target_os = "macos"))]
mod macos_pasteboard {
    pub fn get_drag_url() -> Option<String> {
        None
    }
}

#[tauri::command]
fn get_server_port(state: tauri::State<server::ServerState>) -> u16 {
    state.port()
}

#[derive(Clone, serde::Serialize)]
struct PortalDropPayload {
    url: String,
    collection_slug: Option<String>,
}

/// Notify the portal window that data has changed (called from main app)
#[tauri::command]
async fn notify_portal_data_changed(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(portal) = app.get_webview_window("portal") {
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or(0);
        portal
            .emit("portal-data-changed", serde_json::json!({ "timestamp": timestamp }))
            .map_err(|e| e.to_string())?;
        log::info!("Emitted portal-data-changed to portal window");
    }
    Ok(())
}

#[tauri::command]
async fn add_url_from_portal(
    app: tauri::AppHandle,
    url: String,
    collection_slug: Option<String>,
) -> Result<(), String> {
    log::info!(
        "URL dropped in portal: {} -> {:?}",
        url,
        collection_slug.as_deref().unwrap_or("Library")
    );

    // Emit event to main window to add the URL
    if let Some(main_window) = app.get_webview_window("main") {
        main_window
            .emit(
                "add-url-from-portal",
                PortalDropPayload {
                    url,
                    collection_slug,
                },
            )
            .map_err(|e| e.to_string())?;
        log::info!("Emitted add-url-from-portal event to main window");
    } else {
        return Err("Main window not found".to_string());
    }

    Ok(())
}

// =============================================================================
// DRAG FILE CREATION - For dragging cards as files to Discord/iMessage/Slack
// =============================================================================

/// Sanitize filename for filesystem safety
fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| match c {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            _ => c,
        })
        .take(100) // Limit length
        .collect::<String>()
        .trim()
        .to_string()
}

/// Create a .webloc file (macOS URL bookmark) for dragging
#[tauri::command]
async fn create_webloc_file(url: String, title: String) -> Result<String, String> {
    let temp_dir = std::env::temp_dir().join("pawkit-drag");
    std::fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;

    let filename = format!("{}.webloc", sanitize_filename(&title));
    let filepath = temp_dir.join(&filename);

    let webloc_content = format!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>URL</key>
    <string>{}</string>
</dict>
</plist>"#,
        url.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;")
    );

    std::fs::write(&filepath, webloc_content).map_err(|e| e.to_string())?;
    log::info!("Created webloc file: {:?}", filepath);

    Ok(filepath.to_string_lossy().to_string())
}

/// Create a rich HTML card file with styling and metadata
#[tauri::command]
async fn create_rich_card_file(
    url: String,
    title: String,
    description: Option<String>,
    image: Option<String>,
    content: Option<String>,
    notes: Option<String>,
) -> Result<String, String> {
    let temp_dir = std::env::temp_dir().join("pawkit-drag");
    std::fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;

    let filename = format!("{}.html", sanitize_filename(&title));
    let filepath = temp_dir.join(&filename);

    let desc_html = description
        .map(|d| format!(r#"<p class="description">{}</p>"#, html_escape(&d)))
        .unwrap_or_default();

    let image_html = image
        .map(|i| format!(r#"<img src="{}" alt="Preview" class="preview-image">"#, html_escape(&i)))
        .unwrap_or_default();

    let content_html = content
        .map(|c| format!(r#"<div class="content">{}</div>"#, c)) // Content is already HTML
        .unwrap_or_default();

    let notes_html = notes
        .map(|n| format!(r#"<div class="notes"><h3>Notes</h3><p>{}</p></div>"#, html_escape(&n)))
        .unwrap_or_default();

    let html_content = format!(
        r#"<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="0; url={url}">
    <title>{title}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #e8e8e8;
            min-height: 100vh;
            padding: 24px;
        }}
        .card {{
            max-width: 600px;
            margin: 0 auto;
            background: rgba(255,255,255,0.05);
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }}
        .preview-image {{
            width: 100%;
            max-height: 300px;
            object-fit: cover;
        }}
        .card-body {{
            padding: 20px;
        }}
        h1 {{
            font-size: 1.5rem;
            margin-bottom: 8px;
            color: #fff;
        }}
        h1 a {{
            color: inherit;
            text-decoration: none;
        }}
        h1 a:hover {{
            color: #7c3aed;
        }}
        .description {{
            color: #a0a0a0;
            margin-bottom: 16px;
            line-height: 1.5;
        }}
        .url {{
            font-size: 0.85rem;
            color: #7c3aed;
            word-break: break-all;
        }}
        .content {{
            margin-top: 24px;
            padding-top: 24px;
            border-top: 1px solid rgba(255,255,255,0.1);
            line-height: 1.7;
        }}
        .notes {{
            margin-top: 24px;
            padding: 16px;
            background: rgba(124, 58, 237, 0.1);
            border-radius: 8px;
            border-left: 3px solid #7c3aed;
        }}
        .notes h3 {{
            font-size: 0.9rem;
            color: #7c3aed;
            margin-bottom: 8px;
        }}
        .redirect-notice {{
            text-align: center;
            padding: 12px;
            background: rgba(124, 58, 237, 0.2);
            font-size: 0.85rem;
        }}
        .redirect-notice a {{
            color: #7c3aed;
        }}
    </style>
</head>
<body>
    <div class="redirect-notice">
        Redirecting to <a href="{url}">{url}</a>...
    </div>
    <div class="card">
        {image_html}
        <div class="card-body">
            <h1><a href="{url}">{title}</a></h1>
            {desc_html}
            <p class="url">{url}</p>
            {content_html}
            {notes_html}
        </div>
    </div>
</body>
</html>"#,
        url = html_escape(&url),
        title = html_escape(&title),
        image_html = image_html,
        desc_html = desc_html,
        content_html = content_html,
        notes_html = notes_html,
    );

    std::fs::write(&filepath, html_content).map_err(|e| e.to_string())?;
    log::info!("Created rich card file: {:?}", filepath);

    Ok(filepath.to_string_lossy().to_string())
}

/// Create a markdown file for note cards
#[tauri::command]
async fn create_note_file(title: String, content: String) -> Result<String, String> {
    let temp_dir = std::env::temp_dir().join("pawkit-drag");
    std::fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;

    let filename = format!("{}.md", sanitize_filename(&title));
    let filepath = temp_dir.join(&filename);

    // Detect if content is Plate JSON or HTML and convert appropriately
    let clean_content = if is_plate_json(&content) {
        plate_json_to_markdown(&content)
    } else {
        strip_html_to_markdown(&content)
    };
    let md_content = format!("# {}\n\n{}", title, clean_content);

    std::fs::write(&filepath, md_content).map_err(|e| e.to_string())?;
    log::info!("Created note file: {:?}", filepath);

    Ok(filepath.to_string_lossy().to_string())
}

/// Check if content is Plate JSON format (starts with '[')
fn is_plate_json(content: &str) -> bool {
    let trimmed = content.trim();
    trimmed.starts_with('[') && trimmed.ends_with(']')
}

/// Convert Plate JSON to markdown
fn plate_json_to_markdown(content: &str) -> String {
    let parsed: Result<Vec<serde_json::Value>, _> = serde_json::from_str(content);
    match parsed {
        Ok(nodes) => {
            let mut result = String::new();
            for node in nodes {
                let md = plate_node_to_markdown(&node, 0);
                if !md.is_empty() {
                    result.push_str(&md);
                    result.push('\n');
                }
            }
            result.trim().to_string()
        }
        Err(_) => {
            // Fallback to HTML stripping if JSON parse fails
            strip_html_to_markdown(content)
        }
    }
}

/// Convert a single Plate node to markdown
fn plate_node_to_markdown(node: &serde_json::Value, depth: usize) -> String {
    // Handle text nodes (leaf nodes with "text" property)
    if let Some(text) = node.get("text").and_then(|v| v.as_str()) {
        let mut result = text.to_string();
        // Apply formatting marks
        if node.get("bold").and_then(|v| v.as_bool()).unwrap_or(false) {
            result = format!("**{}**", result);
        }
        if node.get("italic").and_then(|v| v.as_bool()).unwrap_or(false) {
            result = format!("*{}*", result);
        }
        if node.get("code").and_then(|v| v.as_bool()).unwrap_or(false) {
            result = format!("`{}`", result);
        }
        if node.get("strikethrough").and_then(|v| v.as_bool()).unwrap_or(false) {
            result = format!("~~{}~~", result);
        }
        if node.get("highlight").and_then(|v| v.as_bool()).unwrap_or(false) {
            result = format!("=={result}==");
        }
        return result;
    }

    // Handle element nodes with "type" property
    let node_type = node.get("type").and_then(|v| v.as_str()).unwrap_or("");
    let children = node.get("children").and_then(|v| v.as_array());

    // Recursively process children
    let children_md: String = children
        .map(|arr| arr.iter().map(|c| plate_node_to_markdown(c, depth + 1)).collect::<Vec<_>>().join(""))
        .unwrap_or_default();

    match node_type {
        "p" => format!("{}\n", children_md),
        "h1" => format!("# {}\n", children_md),
        "h2" => format!("## {}\n", children_md),
        "h3" => format!("### {}\n", children_md),
        "h4" => format!("#### {}\n", children_md),
        "h5" => format!("##### {}\n", children_md),
        "h6" => format!("###### {}\n", children_md),
        "blockquote" => {
            // Prefix each line with >
            children_md.lines().map(|line| format!("> {}", line)).collect::<Vec<_>>().join("\n") + "\n"
        }
        "ul" | "ol" => children_md,
        "li" | "lic" => {
            let prefix = "- ";
            format!("{}{}\n", prefix, children_md.trim())
        }
        "action_item" => {
            let checked = node.get("checked").and_then(|v| v.as_bool()).unwrap_or(false);
            let checkbox = if checked { "[x]" } else { "[ ]" };
            format!("- {} {}\n", checkbox, children_md.trim())
        }
        "code_block" => {
            let lang = node.get("lang").and_then(|v| v.as_str()).unwrap_or("");
            format!("```{}\n{}\n```\n", lang, children_md.trim())
        }
        "code_line" => children_md,
        "link" | "a" => {
            let url = node.get("url").and_then(|v| v.as_str()).unwrap_or("");
            format!("[{}]({})", children_md, url)
        }
        "hr" => "---\n".to_string(),
        "img" | "image" => {
            let url = node.get("url").and_then(|v| v.as_str()).unwrap_or("");
            let alt = node.get("alt").and_then(|v| v.as_str()).unwrap_or("");
            format!("![{}]({})\n", alt, url)
        }
        "mention" => {
            let value = node.get("value").and_then(|v| v.as_str()).unwrap_or("");
            format!("[[{}]]", value)
        }
        "callout" => {
            let variant = node.get("variant").and_then(|v| v.as_str()).unwrap_or("note");
            let callout_content = children_md.lines().map(|line| format!("> {}", line)).collect::<Vec<_>>().join("\n");
            format!("> [!{}]\n{}\n", variant, callout_content)
        }
        _ => children_md,
    }
}

/// Strip HTML tags and convert to basic markdown
fn strip_html_to_markdown(html: &str) -> String {
    let mut result = html.to_string();

    // Convert common HTML to markdown
    result = result.replace("<br>", "\n");
    result = result.replace("<br/>", "\n");
    result = result.replace("<br />", "\n");
    result = result.replace("</p>", "\n\n");
    result = result.replace("<p>", "");
    result = result.replace("</div>", "\n");
    result = result.replace("<div>", "");
    result = result.replace("<strong>", "**");
    result = result.replace("</strong>", "**");
    result = result.replace("<b>", "**");
    result = result.replace("</b>", "**");
    result = result.replace("<em>", "_");
    result = result.replace("</em>", "_");
    result = result.replace("<i>", "_");
    result = result.replace("</i>", "_");
    result = result.replace("&nbsp;", " ");
    result = result.replace("&amp;", "&");
    result = result.replace("&lt;", "<");
    result = result.replace("&gt;", ">");
    result = result.replace("&quot;", "\"");

    // Remove any remaining HTML tags
    let tag_regex = regex::Regex::new(r"<[^>]+>").unwrap_or_else(|_| regex::Regex::new(r"$^").unwrap());
    result = tag_regex.replace_all(&result, "").to_string();

    // Clean up multiple newlines
    let newline_regex = regex::Regex::new(r"\n{3,}").unwrap_or_else(|_| regex::Regex::new(r"$^").unwrap());
    result = newline_regex.replace_all(&result, "\n\n").to_string();

    result.trim().to_string()
}

/// Clean up a temporary drag file
#[tauri::command]
async fn cleanup_drag_file(path: String) -> Result<(), String> {
    if path.contains("pawkit-drag") {
        std::fs::remove_file(&path).map_err(|e| e.to_string())?;
        log::debug!("Cleaned up drag file: {}", path);
    }
    Ok(())
}

/// Create a simple drag icon (32x32 purple square PNG)
#[tauri::command]
async fn create_drag_icon() -> Result<String, String> {
    let temp_dir = std::env::temp_dir().join("pawkit-drag");
    std::fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;

    let filepath = temp_dir.join("drag-icon.png");

    // Only create if doesn't exist
    if !filepath.exists() {
        // Minimal 1x1 transparent PNG
        let png_data: [u8; 67] = [
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk length + type
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1
            0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, // RGBA, CRC
            0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, 0x54, // IDAT chunk length + type
            0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, // compressed data
            0x0D, 0x0A, 0x2D, 0xB4, // CRC
            0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, // IEND chunk
            0xAE, 0x42, 0x60, 0x82, // CRC
        ];

        std::fs::write(&filepath, &png_data).map_err(|e| e.to_string())?;
        log::info!("Created drag icon: {:?}", filepath);
    }

    Ok(filepath.to_string_lossy().to_string())
}

/// Helper to escape HTML entities
fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}

fn create_portal_window(app: &tauri::AppHandle, port: u16) -> tauri::Result<()> {
    // Load saved window state
    let state = load_portal_state(app);

    // Validate position is on a visible monitor, otherwise use default
    let (x, y) = validate_portal_position(app, state.x, state.y, state.width, state.height);

    // Portal loads from the same Next.js server as the main app
    // This means same origin, shared stores, shared API routes - no complexity!
    let portal_url = format!("http://localhost:{}/portal", port);
    let url = url::Url::parse(&portal_url).expect("Failed to parse portal URL");

    let builder = WebviewWindowBuilder::new(
        app,
        "portal",
        WebviewUrl::External(url),
    )
    .title("Pawkit Portal")
    .inner_size(state.width as f64, state.height as f64)
    .position(x as f64, y as f64)
    .min_inner_size(320.0, 400.0)  // Minimum: single column cards with floating sidebar
    .resizable(true)
    .always_on_top(true)
    .visible(false)
    .decorations(false)            // Frameless - no native title bar
    .skip_taskbar(true);

    let _portal = builder.build()?;

    log::info!("Portal window created at ({}, {}) size {}x{} -> {}", x, y, state.width, state.height, portal_url);
    Ok(())
}

/// Validate that the portal position is visible on some monitor
/// Returns the position if valid, or a default position near center of primary monitor
fn validate_portal_position(app: &tauri::AppHandle, x: i32, y: i32, width: u32, height: u32) -> (i32, i32) {
    // Try to get available monitors
    if let Some(main_window) = app.get_webview_window("main") {
        if let Ok(monitors) = main_window.available_monitors() {
            // Check if position is visible on any monitor
            for monitor in &monitors {
                let pos = monitor.position();
                let size = monitor.size();
                let mon_x = pos.x;
                let mon_y = pos.y;
                let mon_w = size.width as i32;
                let mon_h = size.height as i32;

                // Check if at least part of the window is visible on this monitor
                if x + (width as i32) > mon_x && x < mon_x + mon_w &&
                   y + (height as i32) > mon_y && y < mon_y + mon_h {
                    log::info!("Portal position valid on monitor");
                    return (x, y);
                }
            }

            // Position not visible, use primary monitor
            if let Some(monitor) = monitors.first() {
                let pos = monitor.position();
                let size = monitor.size();
                let new_x = pos.x + (size.width as i32 - width as i32) / 2;
                let new_y = pos.y + (size.height as i32 - height as i32) / 2;
                log::info!("Portal position invalid, centering on primary monitor");
                return (new_x, new_y);
            }
        }
    }

    // Fallback to saved position
    (x, y)
}

fn toggle_portal(app: &tauri::AppHandle) {
    match app.get_webview_window("portal") {
        Some(portal) => {
            if portal.is_visible().unwrap_or(false) {
                let _ = portal.hide();
            } else {
                // Show the portal without activating the main application
                // This keeps the main window minimized if it was minimized
                show_portal_without_activating_app(&portal);
            }
        }
        None => {
            // Window was destroyed (e.g., red X clicked), recreate it
            log::info!("Portal window not found, recreating...");

            // Get the server port - dev mode uses 3000, release uses ServerState
            let port: u16 = if cfg!(debug_assertions) {
                3000
            } else {
                app.state::<server::ServerState>().port()
            };

            if let Err(e) = create_portal_window(app, port) {
                log::error!("Failed to recreate portal: {}", e);
                return;
            }
            // Show the newly created window
            if let Some(portal) = app.get_webview_window("portal") {
                show_portal_without_activating_app(&portal);
            }
        }
    }
}

/// Show the portal window without activating the main application.
/// On macOS, this uses NSWindow.orderFrontRegardless to bring the window forward
/// without making the app active (which would unminimize other windows).
#[cfg(target_os = "macos")]
fn show_portal_without_activating_app(portal: &tauri::WebviewWindow) {
    use cocoa::base::id;
    use objc::{msg_send, sel, sel_impl};

    // Show the window first
    let _ = portal.show();

    // Get the NSWindow and use orderFrontRegardless to bring it forward
    // without activating the entire application
    unsafe {
        if let Ok(raw_handle) = portal.ns_window() {
            let ns_window: id = raw_handle as id;
            // orderFrontRegardless brings window to front without activating app
            // This keeps minimized windows minimized
            let _: () = msg_send![ns_window, orderFrontRegardless];
        }
    }
}

#[cfg(not(target_os = "macos"))]
fn show_portal_without_activating_app(portal: &tauri::WebviewWindow) {
    let _ = portal.show();
    let _ = portal.set_focus();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_drag::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state() == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                        toggle_portal(app);
                    }
                })
                .build(),
        )
        .on_window_event(|window, event| {
            if window.label() == "portal" {
                // Intercept close to hide instead of destroy
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window.hide();
                    log::info!("Portal close requested - hiding instead");
                    return;
                }

                // Save position/size on move or resize
                match event {
                    tauri::WindowEvent::Moved(position) => {
                        if let Ok(size) = window.inner_size() {
                            let state = WindowState {
                                x: position.x,
                                y: position.y,
                                width: size.width,
                                height: size.height,
                                maximized: false,
                            };
                            save_portal_state(window.app_handle(), &state);
                        }
                    }
                    tauri::WindowEvent::Resized(size) => {
                        if let Ok(position) = window.outer_position() {
                            let state = WindowState {
                                x: position.x,
                                y: position.y,
                                width: size.width,
                                height: size.height,
                                maximized: false,
                            };
                            save_portal_state(window.app_handle(), &state);
                        }
                    }
                    _ => {}
                }

                if let tauri::WindowEvent::DragDrop(drag_event) = event {
                    match drag_event {
                        tauri::DragDropEvent::Drop { paths, position } => {
                            log::info!("Portal drop at {:?}, paths: {:?}", position, paths);

                            // If paths is empty, try to get URL from drag pasteboard
                            let url = if paths.is_empty() {
                                macos_pasteboard::get_drag_url()
                            } else {
                                // Check if any path is a URL
                                paths.iter()
                                    .map(|p| p.to_string_lossy().to_string())
                                    .find(|s| s.starts_with("http://") || s.starts_with("https://"))
                            };

                            if let Some(url) = url {
                                log::info!("Portal drop URL: {}", url);
                                // Emit with position so frontend knows where drop occurred
                                let _ = window.emit("tauri-drop-url", serde_json::json!({
                                    "url": url,
                                    "x": position.x,
                                    "y": position.y
                                }));
                            } else {
                                log::info!("No URL found in drop");
                                let _ = window.emit("tauri-drop", &paths);
                            }
                        }
                        tauri::DragDropEvent::Enter { paths, position } => {
                            log::info!("Portal drag enter at {:?}: {:?}", position, paths);
                            let _ = window.emit("tauri-drag-enter", serde_json::json!({
                                "x": position.x,
                                "y": position.y
                            }));
                        }
                        tauri::DragDropEvent::Over { position } => {
                            // Emit position continuously during drag for hover detection
                            let _ = window.emit("tauri-drag-over", serde_json::json!({
                                "x": position.x,
                                "y": position.y
                            }));
                        }
                        tauri::DragDropEvent::Leave => {
                            log::info!("Portal drag leave");
                            let _ = window.emit("tauri-drag-leave", ());
                        }
                        _ => {}
                    }
                }
            }

            // Main window state persistence
            if window.label() == "main" {
                match event {
                    tauri::WindowEvent::Moved(position) => {
                        // Don't save if maximized (position is managed by OS)
                        if !window.is_maximized().unwrap_or(false) {
                            if let Ok(size) = window.inner_size() {
                                let state = WindowState {
                                    x: position.x,
                                    y: position.y,
                                    width: size.width,
                                    height: size.height,
                                    maximized: false,
                                };
                                save_window_state(window.app_handle(), "main", &state);
                            }
                        }
                    }
                    tauri::WindowEvent::Resized(size) => {
                        // Don't save if maximized (size is managed by OS)
                        let is_maximized = window.is_maximized().unwrap_or(false);
                        if let Ok(position) = window.outer_position() {
                            let state = WindowState {
                                x: position.x,
                                y: position.y,
                                width: size.width,
                                height: size.height,
                                maximized: is_maximized,
                            };
                            save_window_state(window.app_handle(), "main", &state);
                        }
                    }
                    _ => {}
                }
            }
        })
        .setup(|app| {
            let handle = app.handle().clone();

            // In dev mode, use the external Next.js dev server on port 3000
            // In release mode, start the bundled standalone server
            let port: u16 = if cfg!(debug_assertions) {
                log::info!("Dev mode: using external Next.js dev server on port 3000");
                3000
            } else {
                // Start the Next.js server
                let server_state = server::start_server(&handle)?;
                let p = server_state.port();
                // Store server state for later access
                app.manage(server_state);
                p
            };

            // Navigate to the local server once ready
            let main_window = app.get_webview_window("main")
                .expect("main window not found");

            // Restore main window state (position, size)
            let main_state = load_window_state(app.handle(), "main", WindowState::default());
            log::info!("Restoring main window state: {:?}", main_state);

            // Apply saved state
            let _ = main_window.set_position(tauri::Position::Physical(
                tauri::PhysicalPosition::new(main_state.x, main_state.y)
            ));
            let _ = main_window.set_size(tauri::Size::Physical(
                tauri::PhysicalSize::new(main_state.width, main_state.height)
            ));
            if main_state.maximized {
                let _ = main_window.maximize();
            }

            let url = format!("http://localhost:{}", port);
            log::info!("Navigating to {}", url);

            // Create the portal window (hidden by default) - needs port for Next.js URL
            let app_handle = app.handle().clone();
            let portal_port = port;

            // Navigate once server is ready
            tauri::async_runtime::spawn(async move {
                // Wait for server to be ready (skip in dev mode - assume it's running)
                if !cfg!(debug_assertions) {
                    server::wait_for_server(port).await;
                }

                // Use Tauri's navigate API for main window
                if let Ok(url) = url::Url::parse(&url) {
                    let _ = main_window.navigate(url);
                }

                // Create portal window after server is ready (so it can load the page)
                if let Err(e) = create_portal_window(&app_handle, portal_port) {
                    log::error!("Failed to create portal window: {}", e);
                }
            });

            // Register global shortcut: Cmd+Shift+P (macOS)
            let shortcut = Shortcut::new(Some(Modifiers::SUPER | Modifiers::SHIFT), Code::KeyP);
            app.global_shortcut().register(shortcut)?;
            log::info!("Registered global shortcut: Cmd+Shift+P");

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_server_port,
            add_url_from_portal,
            notify_portal_data_changed,
            create_webloc_file,
            create_rich_card_file,
            create_note_file,
            cleanup_drag_file,
            create_drag_icon,
            // macOS rounded corners plugin
            plugins::mac_rounded_corners::enable_rounded_corners,
            plugins::mac_rounded_corners::enable_modern_window_style,
            plugins::mac_rounded_corners::reposition_traffic_lights
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
