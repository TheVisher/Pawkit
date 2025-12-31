mod server;

use tauri::{Emitter, Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

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
        let url_string_type = NSString::alloc(nil).init_str("public.url-name");
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

fn create_portal_window(app: &tauri::AppHandle) -> tauri::Result<()> {
    // Get main window position to spawn portal nearby
    let position = if let Some(main_window) = app.get_webview_window("main") {
        main_window.outer_position().ok()
    } else {
        None
    };

    // TODO: Load saved position from store (multi-monitor aware)
    // For now, use default size and position near main window
    let default_width = 500.0;
    let default_height = 600.0;

    let mut builder = WebviewWindowBuilder::new(
        app,
        "portal",
        // Load the new React portal app
        WebviewUrl::App("portal/index.html".into()),
    )
    .title("Pawkit Portal")
    .inner_size(default_width, default_height)
    .min_inner_size(300.0, 350.0)  // Minimum for compact mode
    .resizable(true)               // Now resizable!
    .always_on_top(true)
    .visible(false)
    .decorations(false)            // Frameless - no native title bar
    .skip_taskbar(true);

    // Position near main window if available
    if let Some(pos) = position {
        builder = builder.position((pos.x + 50) as f64, (pos.y + 50) as f64);
    }

    let portal = builder.build()?;

    log::info!("Portal window created: {:?}", portal.label());
    Ok(())
}

fn toggle_portal(app: &tauri::AppHandle) {
    match app.get_webview_window("portal") {
        Some(portal) => {
            if portal.is_visible().unwrap_or(false) {
                let _ = portal.hide();
            } else {
                let _ = portal.show();
                let _ = portal.set_focus();
            }
        }
        None => {
            // Window was destroyed (e.g., red X clicked), recreate it
            log::info!("Portal window not found, recreating...");
            if let Err(e) = create_portal_window(app) {
                log::error!("Failed to recreate portal: {}", e);
                return;
            }
            // Show the newly created window
            if let Some(portal) = app.get_webview_window("portal") {
                let _ = portal.show();
                let _ = portal.set_focus();
            }
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
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

                if let tauri::WindowEvent::DragDrop(drag_event) = event {
                    match drag_event {
                        tauri::DragDropEvent::Drop { paths, position: _ } => {
                            log::info!("Portal drop paths: {:?}", paths);

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
                                let _ = window.emit("tauri-drop-url", &url);
                            } else {
                                log::info!("No URL found in drop");
                                let _ = window.emit("tauri-drop", &paths);
                            }
                        }
                        tauri::DragDropEvent::Enter { paths, position: _ } => {
                            log::info!("Portal drag enter: {:?}", paths);
                            let _ = window.emit("tauri-drag-enter", &paths);
                        }
                        tauri::DragDropEvent::Leave => {
                            log::info!("Portal drag leave");
                            let _ = window.emit("tauri-drag-leave", ());
                        }
                        _ => {}
                    }
                }
            }
        })
        .setup(|app| {
            let handle = app.handle().clone();

            // Start the Next.js server
            let server_state = server::start_server(&handle)?;
            let port = server_state.port();

            // Store server state for later access
            app.manage(server_state);

            // Navigate to the local server once ready
            let main_window = app.get_webview_window("main")
                .expect("main window not found");

            let url = format!("http://localhost:{}", port);
            log::info!("Navigating to {}", url);

            // Navigate once server is ready
            tauri::async_runtime::spawn(async move {
                // Wait for server to be ready
                server::wait_for_server(port).await;

                // Use Tauri's navigate API
                if let Ok(url) = url::Url::parse(&url) {
                    let _ = main_window.navigate(url);
                }
            });

            // Create the portal window (hidden by default)
            create_portal_window(app.handle())?;

            // Register global shortcut: Cmd+Shift+P (macOS)
            let shortcut = Shortcut::new(Some(Modifiers::SUPER | Modifiers::SHIFT), Code::KeyP);
            app.global_shortcut().register(shortcut)?;
            log::info!("Registered global shortcut: Cmd+Shift+P");

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_server_port, add_url_from_portal])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
