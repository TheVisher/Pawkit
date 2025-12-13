# Pawkit

<p align="center">
  <img src="public/images/logo.png" alt="Pawkit Logo" width="120" />
</p>

<p align="center">
  <strong>Your local-first bookmark manager with privacy at its core</strong>
</p>

<p align="center">
  <a href="#features">Features</a> ·
  <a href="#getting-started">Getting Started</a> ·
  <a href="#browser-extensions">Extensions</a> ·
  <a href="#mobile-app">Mobile</a> ·
  <a href="#documentation">Docs</a>
</p>

---

## About

Pawkit is a visual bookmark manager built for speed, privacy, and control. With local-first architecture, your data lives on your device with optional encrypted sync. Organize bookmarks into nested collections (Pawkits), write connected notes with wiki-links, attach files to your cloud storage, and rediscover forgotten content through timeline and calendar views.

### Why Pawkit?

- **Instant** — No server lag. Everything loads from your device in milliseconds
- **Private** — Your data stays local. Sync is encrypted end-to-end
- **Organized** — Nested collections, tags, notes with backlinks, knowledge graphs
- **Connected** — Bring your own cloud storage (Filen, Google Drive, Dropbox)
- **Cross-platform** — Web app, browser extensions (Chrome/Firefox), iOS app
- **Beautiful** — Clean glassmorphism interface with dark mode

---

## Features

### Content Management
- Visual bookmark saving with auto-fetched metadata (title, description, favicon, images)
- Rich markdown notes with GFM support, wiki-links `[[like this]]`, and backlinks
- File uploads — images, PDFs, audio, video, documents
- PDF viewer with zoom and navigation
- YouTube video embedding with transcript extraction
- Daily notes attached to calendar days
- Reader mode with Mozilla Readability for distraction-free reading
- Article extraction for offline access

### Organization
- Nested collections (Pawkits) with drag-and-drop hierarchy
- Private collections hidden from main views
- Pinned favorites for quick access
- Tag management with filtering
- Trash with 30-day recovery

### Views
- Library — Grid, list, masonry, and timeline layouts
- Calendar — Month and week views with scheduled items and daily notes
- Home dashboard — Recent items, quick access, weekly overview
- Notes — Dedicated markdown browsing with search
- Adjustable card sizes

### Discovery
- Rediscover mode — Tinder-style card review for curating forgotten saves
- Smart search with fuzzy matching
- Command palette (⌘K) for quick navigation
- Knowledge graph visualization of note connections

### Sync & Storage
- Local-first with IndexedDB for instant access
- Bidirectional sync with Supabase backend
- Offline queue with automatic retry
- Multi-tab awareness and conflict resolution
- Cloud storage integration (Filen, Google Drive, Dropbox, OneDrive)

### Productivity
- Todo management in sidebar
- Bulk operations — multi-select and batch edit
- Keyboard shortcuts throughout
- Import from browsers and other tools
- Dynamic top bar with search and quick actions

### AI Assistant (Kit)
- Chat with Kit about your bookmarks and notes
- Summarize articles and web pages
- Auto-suggest tags based on content
- Context-aware responses using your collection data

---

## Getting Started

### Prerequisites

- Node.js 20+ (LTS recommended)
- pnpm (recommended) or npm/yarn
- Supabase account (for sync — optional for local-only use)

### Installation

```bash
# Clone the repository
git clone https://github.com/TheVisher/Pawkit.git
cd Pawkit

# Install dependencies
pnpm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run migrations
pnpm prisma:migrate
pnpm prisma:generate

# Start development server
pnpm dev
```

Open `http://localhost:3000`

---

## Browser Extensions

Browser extensions are **live** for Chrome and Firefox.

| Browser | Version | Status |
|---------|---------|--------|
| Chrome  | v1.1.0  | Available |
| Firefox | v1.1.0  | Available |
| Safari  | —       | Not planned |

### Features
- One-click save from any page
- Right-click context menu for images and links
- Popup UI for quick saves
- Secure token authentication

Extensions are in `packages/extension/`

---

## Mobile App

The iOS app is built with React Native and Expo.

| Platform | Status |
|----------|--------|
| iOS      | In TestFlight (pending external beta review) |
| Android  | Planned |

### Features
- Full bookmark and note access
- Share extension — save from any app
- Offline-capable with sync

Mobile source is in `mobile/`

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| UI | React 19, Tailwind CSS, Radix UI |
| Icons | Lucide React |
| Database | PostgreSQL via Supabase |
| ORM | Prisma |
| State | Zustand |
| Local Storage | IndexedDB (idb) |
| Auth | Supabase Auth |
| File Storage | Filen SDK |
| Testing | Playwright |
| Deployment | Vercel |

---

## Project Structure

```
pawkit/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication routes
│   ├── (dashboard)/       # Main app routes
│   └── api/               # API endpoints
├── components/            # React components
├── lib/                   # Business logic
│   ├── services/         # API and sync services
│   ├── stores/           # Zustand state stores
│   └── utils/            # Helpers
├── packages/
│   └── extension/        # Browser extensions
├── mobile/               # React Native iOS app
├── prisma/               # Database schema
└── public/               # Static assets
```

---

## Architecture

Pawkit follows a local-first design:

1. All data stored locally in IndexedDB for instant access
2. Operations work offline — no internet required
3. Changes sync in background when online
4. Conflicts resolved automatically with timestamps
5. Private collections encrypted client-side

See [LOCAL_FIRST_ARCHITECTURE.md](./docs/LOCAL_FIRST_ARCHITECTURE.md) for details.

---

## Development

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server |
| `pnpm build` | Production build |
| `pnpm lint` | Run ESLint |
| `pnpm prisma:migrate` | Run migrations |
| `pnpm prisma:studio` | Open Prisma Studio |
| `pnpm test:e2e` | Run Playwright tests |

---

## Deployment

### Vercel (Recommended)

1. Connect repository to Vercel
2. Add environment variables
3. Deploy

### Docker

```bash
docker build -t pawkit .
docker run -p 3000:3000 --env-file .env.local pawkit
```

---

## Roadmap

### In Progress
- [ ] Note folders with nested hierarchy
- [ ] Kit AI improvements and public rollout

### Planned
- [ ] Connected Platforms — Import saves from Reddit, YouTube, Twitter
- [ ] Google Calendar integration
- [ ] Quick Notes with auto-consolidation
- [ ] Weekly email digest
- [ ] Android app

See `.claude/skills/pawkit-roadmap/TODO.md` for the full roadmap.

---

## Privacy

- Local-first — data lives on your device
- End-to-end encryption for private collections
- Zero-knowledge sync — we cannot read your encrypted data
- No tracking, analytics, or ads
- Bring your own storage — connect your own cloud accounts
- Open source — audit the code

---

## Contributing

Contributions welcome! Fork the repo, create a feature branch, and open a PR.

```bash
git checkout -b feature/your-feature
git commit -m 'Add feature'
git push origin feature/your-feature
```

---

## License

MIT - see [LICENSE](./LICENSE)

---

## Links

- [Documentation](./docs/)
- [Issues](https://github.com/TheVisher/Pawkit/issues)
- [Discussions](https://github.com/TheVisher/Pawkit/discussions)
- [Discord](https://discord.gg/pawkit)

---

<p align="center">Made by <a href="https://github.com/TheVisher">TheVisher</a></p>
