# Pawkit Web Clipper

Browser extension (Manifest V3) for saving web pages to Pawkit. Supports Firefox and Chrome/Edge.

## Features

- **Cross-browser** - Firefox and Chrome/Edge support
- **Shadcn UI** - Components matching Pawkit's dark theme
- **Quick save** - Via popup or context menu
- **Token-based auth** - Secure API access via extension tokens
- **One-click connect** - Connect extension directly from Pawkit website
- **Fast** - Built with React, TypeScript, and Vite

## Build System

The extension uses a multi-target Vite build system. Understanding this is important to avoid breaking the build.

### Build Targets

The build process runs **4 separate Vite builds**:

1. **UI build** (default) - Popup and options pages (ES modules)
2. **Service worker** (`BUILD_TARGET=service-worker`) - Background script (IIFE)
3. **Content script** (`BUILD_TARGET=content-script`) - Page interaction script (IIFE)
4. **Extension connect** (`BUILD_TARGET=extension-connect`) - One-click auth script (IIFE)

Each target has its own entry point in `vite.config.ts`. The `emptyOutDir` flag is set to only clear `dist/` on the first build.

### Build Commands

```bash
# Development build (includes localhost URLs for testing)
pnpm build:all          # Build for both Firefox and Chrome

# Production build (strips localhost URLs for store submission)
pnpm build:prod         # Build + strip localhost from manifests

# Package for store submission
pnpm package:prod       # Production build + create ZIP files
```

### Dev vs Prod Builds

**Development builds** (`build:all`) include localhost URLs in content script matches:
- `http://localhost:5173/extension/connect*`
- `http://localhost:3000/extension/connect*`

**Production builds** (`build:prod`) run `scripts/strip-localhost.mjs` which removes these localhost entries from the dist manifests. This is required for store submission as reviewers may flag localhost patterns.

> **Important**: Always use `pnpm package:prod` when preparing for store submission. Never manually edit files in `dist-chrome/` or `dist-firefox/` - they get overwritten on each build.

### Output Directories

```
extension/
├── dist/              # Intermediate build output (don't use directly)
├── dist-chrome/       # Chrome build (use this for Chrome/Edge)
├── dist-firefox/      # Firefox build (use this for Firefox)
```

## Development

### Prerequisites

- Node.js 18+
- pnpm

### Setup

```bash
cd extension
pnpm install
```

### Watch Mode

```bash
pnpm dev              # Rebuilds on file changes
```

### Load in Browser

**Firefox:**
1. Run `pnpm build:firefox`
2. Open `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select `dist-firefox/manifest.json`

Or use web-ext for auto-reload:
```bash
pnpm dev:firefox
```

**Chrome:**
1. Run `pnpm build:chrome`
2. Open `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `dist-chrome/` directory

## Authentication Flow

The extension uses **extension tokens** for authentication:

1. User clicks "Connect via Pawkit" in popup
2. Opens `/extension/connect` page on getpawkit.com
3. User clicks "Connect Extension" (must be logged in)
4. Page generates token via `generateExtensionToken` mutation
5. Token sent to `extension-connect.js` content script via `postMessage`
6. Content script validates token via background service worker
7. Token stored in `browser.storage.local`

**Fallback**: Users can also manually copy/paste a token from Settings → Account → Extension Token.

> **Note**: Each user can only have one active extension token. Connecting a new browser invalidates the previous token.

## Project Structure

```
extension/
├── manifest.json              # Firefox manifest
├── manifest-chrome.json       # Chrome manifest
├── package.json
├── vite.config.ts             # Multi-target build config
├── scripts/
│   └── strip-localhost.mjs    # Production build post-processor
├── src/
│   ├── popup/                 # Extension popup UI
│   ├── options/               # Options/settings page
│   ├── service-worker.ts      # Background service worker
│   ├── background/
│   │   └── api.ts             # API client (Convex HTTP endpoints)
│   ├── content/
│   │   ├── content-script.ts  # Page interaction (image picker, TikTok)
│   │   └── extension-connect.ts # One-click auth handler
│   ├── components/ui/         # Shadcn UI components
│   └── shared/
│       └── types.ts           # Shared TypeScript types
├── dist-chrome/               # Chrome build output
└── dist-firefox/              # Firefox build output
```

## API Integration

The extension communicates with Convex HTTP endpoints at `https://beloved-spaniel-215.convex.site/api`.

### Endpoints Used

- `POST /api/auth/extension` - Validate extension token
- `GET /api/workspaces` - Get user's workspaces
- `GET /api/collections?workspaceId=...` - Get collections
- `POST /api/cards` - Save a new card
- `POST /api/metadata` - Fetch URL metadata

### CORS

All API calls are made from the background service worker to avoid CORS issues.

## Publishing

### Firefox Add-ons (AMO)

```bash
pnpm package:prod
# Upload dist-firefox/pawkit-firefox.zip to addons.mozilla.org
```

### Chrome Web Store

```bash
pnpm package:prod
# Upload dist-chrome/pawkit-chrome.zip to chrome.google.com/webstore
```

## Troubleshooting

### Build fails

- Check that all 4 build targets complete (UI, service-worker, content-script, extension-connect)
- Verify `vite.config.ts` has all build targets configured
- Run `pnpm build` to see specific errors

### Extension won't load

- Ensure you've run `pnpm build:chrome` or `pnpm build:firefox`
- Check the browser console for manifest errors
- Verify icons exist in `dist-*/icons/`

### Auth not working

- Check browser console for errors from content scripts
- Verify the extension-connect content script loaded on `/extension/connect`
- Check that `beloved-spaniel-215.convex.site` is in `host_permissions`

### One-click connect not working

- Make sure you're on `getpawkit.com/extension/connect` (not localhost in prod build)
- Check that `extension-connect.js` is in the dist folder
- Verify content script matches in manifest include the correct URLs

## License

Part of the Pawkit project.
