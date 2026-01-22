# Pawkit

<p align="center">
  <img src="public/PawkitFavicon.png" alt="Pawkit Logo" width="120" />
</p>

<p align="center">
  <strong>Bookmark and knowledge management with real-time sync</strong>
</p>

<p align="center">
  <a href="#features">Features</a> ·
  <a href="#getting-started">Getting Started</a> ·
  <a href="#extensions">Extensions</a> ·
  <a href="#mobile">Mobile</a> ·
  <a href="#security">Security</a> ·
  <a href="#docs">Docs</a>
</p>

---

## About

Pawkit is a bookmark manager and knowledge base built for fast capture, clean organization, and instant retrieval. The app uses Convex for data, auth, and real-time sync.

## Features

### Content management
- Visual bookmarks with automatic metadata
- Notes with rich editing and full-text search
- File uploads and previews
- Reader mode for saved articles
- Daily log entries

### Organization
- Nested collections (Pawkits)
- Tags and filters
- Pinned items and quick access
- Trash with recovery

### Views and discovery
- Library layouts (grid, list, masonry, timeline)
- Calendar view with scheduled items
- Home dashboard with recent activity
- Search with snippets and operators

### AI assistant (Kit)
- Ask questions about your saved content
- Summaries and structured notes
- Tag suggestions

---

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm (recommended)
- Convex account

### Installation

```bash
# Clone the repository
git clone https://github.com/TheVisher/Pawkit.git
cd Pawkit

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local

# Start Convex (creates or links a deployment)
npx convex dev

# Start the app
pnpm dev
```

Open http://localhost:3000 in your browser.

### Configuration

See `.env.example` for all available environment variables.

Required:
- `NEXT_PUBLIC_CONVEX_URL`
- `NEXT_PUBLIC_CONVEX_SITE_URL`

Optional:
- OAuth credentials (Google, Dropbox)
- `ANTHROPIC_API_KEY` for Kit
- `TRUSTED_EXTENSION_IDS` for extension auth

---

## Extensions

Browser extensions are available for Chrome and Firefox.

| Browser | Status | Link |
|---------|--------|------|
| Chrome  | Published | (add link) |
| Firefox | Published | (add link) |

Extension source: `packages/extension/`

---

## Mobile

iOS is in TestFlight. Android is planned.

| Platform | Status | Link |
|----------|--------|------|
| iOS | TestFlight | (add link) |
| Android | Planned | - |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | TanStack Start (React) |
| UI | React 19, TypeScript |
| Styling | Tailwind CSS, CSS variables |
| Components | Radix UI + shadcn/ui |
| Backend | Convex (database, auth, functions) |
| Storage | Convex storage + optional cloud providers |
| State | Zustand |
| AI | Anthropic Claude API (optional) |
| Testing | Vitest + Testing Library |

---

## Project Structure

```
Pawkit/
├── src/             # App UI and routes
├── convex/          # Convex schema and functions
├── packages/        # Extension, desktop, shared packages
├── docs/            # Internal documentation
└── public/          # Static assets
```

---

## Security

See `SECURITY.md` for a full overview of auth, data handling, and reporting.

---

## Docs

See `docs/INDEX.md` for internal documentation and playbooks.
