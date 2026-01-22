# Pawkit Web Clipper

Firefox-first browser extension (Manifest V3) for saving web pages to Pawkit.

## Features

-  **Firefox-first** with easy Chrome/Edge migration path
-  **Shadcn UI** components matching Pawkit's dark theme
-  **Quick save** via popup or context menu
-  **Token-based auth** for secure API access
-  **Fast** - Built with React, TypeScript, and Vite

## Development

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Firefox Developer Edition (recommended for testing)

### Install Dependencies

```bash
cd packages/extension
pnpm install
```

### Build Extension

```bash
# Development build (watch mode)
pnpm dev

# Production build
pnpm build
```

The built extension will be in the `dist/` directory.

### Load Extension in Firefox

1. Build the extension (`pnpm build`)
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Navigate to `packages/extension/dist/` and select `manifest.json`

**OR** use web-ext for automatic reloading:

```bash
pnpm dev:firefox
```

This will build the extension and launch Firefox with the extension loaded. Changes will require a rebuild.

### Testing

#### Manual Testing Checklist

1. **Install Extension**
   - Load extension in Firefox via `about:debugging`
   - Verify icon appears in toolbar

2. **Set Token**
   - Click extension icon → Settings (gear icon)
   - Paste your Pawkit personal access token
   - Click "Save Token"
   - Verify success message appears

3. **Save via Popup**
   - Navigate to any webpage
   - Click extension icon
   - Verify title and URL are prefilled
   - Add optional notes
   - Click "Save to Pawkit"
   - Verify success message and "View" link

4. **Save via Context Menu**
   - Right-click anywhere on a page
   - Select "Save page to Pawkit"
   - Verify browser notification appears

5. **Verify in Pawkit**
   - Open https://app.getpawkit.com
   - Check that saved pages appear in your collection

### Project Structure

```
packages/extension/
├── manifest.json              # Extension manifest (MV3)
├── package.json               # Dependencies and scripts
├── vite.config.ts             # Vite bundler config
├── tailwind.config.cjs        # Tailwind + Shadcn config
├── src/
│   ├── popup/                 # Extension popup UI
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── Popup.tsx
│   │   └── index.css          # Tailwind + CSS variables
│   ├── options/               # Options/settings page
│   │   ├── index.html
│   │   └── Options.tsx
│   ├── service-worker.ts      # Background service worker
│   ├── background/
│   │   └── api.ts             # API client helpers
│   ├── components/ui/         # Shadcn UI components
│   ├── lib/
│   │   └── utils.ts           # Utility functions
│   ├── shared/
│   │   └── types.ts           # Shared TypeScript types
│   └── assets/
│       └── icons/             # Extension icons
└── dist/                      # Built extension (git-ignored)
```

## Porting to Chrome/Edge

The extension is designed to be easily portable to Chrome and Edge:

### 1. Update Manifest

Remove or comment out the Firefox-specific section:

```json
// Remove this from manifest.json:
"browser_specific_settings": {
  "gecko": {
    "id": "pawkit@local",
    "strict_min_version": "109.0"
  }
}
```

### 2. No Code Changes Required

The extension uses `webextension-polyfill` which provides cross-browser compatibility. No code changes are needed!

### 3. Build and Package

```bash
pnpm build
cd dist
zip -r ../pawkit-extension-chrome.zip .
```

Upload the ZIP to Chrome Web Store or Edge Add-ons.

### 4. Testing in Chrome

1. Build the extension
2. Open `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `dist/` directory

## API Integration

The extension communicates with Pawkit's API at `https://app.getpawkit.com/api`.

### Authentication

Uses a personal access token stored in `browser.storage.local` under the key `pawkit_token`.

### Endpoints Used

- **POST /api/cards** - Save a new card
  ```json
  {
    "title": "Page Title",
    "url": "https://example.com",
    "notes": "Optional notes",
    "source": "webext",
    "meta": {
      "favicon": "https://..."
    }
  }
  ```

### CORS Handling

All API calls are made from the background service worker, not content scripts, to avoid CORS issues during development.

## Publishing

### Firefox Add-ons (AMO)

1. Build production version: `pnpm build`
2. Package as XPI: `pnpm package:firefox`
3. Upload to https://addons.mozilla.org/developers/
4. Include privacy policy and screenshots

### Chrome Web Store

1. Remove `browser_specific_settings` from manifest
2. Build and create ZIP (see Chrome porting section)
3. Upload to https://chrome.google.com/webstore/devconsole/
4. Include privacy policy, icons, and screenshots

## Troubleshooting

### Extension won't load

- Ensure you've run `pnpm build` first
- Check `dist/manifest.json` exists and is valid
- Check Firefox console for errors (`about:debugging`)

### API errors

- Verify token is set in extension options
- Check token is valid in Pawkit settings
- Open browser console to see detailed error messages

### Popup not opening

- Check that icons exist in `dist/icons/` (you need to add icon-48.png and icon-128.png)
- Temporary workaround: Comment out icon references in manifest.json

### Styling issues

- Ensure Tailwind is processing CSS correctly
- Check `dist/assets/` for CSS files
- Verify `dark` class is on `<html>` element in popup/index.html

## License

Part of the Pawkit project. See main repository for license details.
