# Pawkit

<p align="center">
  <img src="public/images/logo.png" alt="Pawkit Logo" width="120" />
</p>

<p align="center">
  <strong>Your local-first bookmark and knowledge management system</strong>
</p>

<p align="center">
  <a href="#features">Features</a> ·
  <a href="#getting-started">Getting Started</a> ·
  <a href="#browser-extensions">Extensions</a> ·
  <a href="#mobile-app">Mobile</a> ·
  <a href="#security">Security</a> ·
  <a href="#documentation">Docs</a>
</p>

---

## About

Pawkit is a privacy-focused bookmark manager that keeps your data on YOUR device, with optional encrypted cloud sync. Think Notion meets Pinterest meets Obsidian.

Built with a **local-first architecture**, your data lives in IndexedDB on your device and syncs in the background when online. This means instant load times, full offline functionality, and you always own your data.

### Why Pawkit?

- 🔐 **Local-first** - Data stored on your device, instant access
- 🔒 **Privacy-focused** - No tracking, no analytics, your data stays yours
- 📱 **Cross-platform** - Web app, browser extensions (Chrome/Firefox), iOS app
- 🔄 **Smart sync** - Bidirectional sync with conflict resolution
- 📝 **Rich notes** - Markdown editor with wiki-links and backlinks
- 🎨 **Beautiful** - Clean glassmorphism interface with dark mode
- 🔍 **Powerful search** - Full-text search with operators
- 📎 **File attachments** - Connect your own cloud storage (Filen, Google Drive, Dropbox, OneDrive)

---

## Features

### Content Management
- 📑 **Visual bookmarks** - Auto-fetch metadata (title, description, favicon, images)
- ✍️ **Markdown notes** - Full editor with GFM support, wiki-links `[[like this]]`
- 📎 **File uploads** - Images, PDFs, audio, video, documents
- 📄 **PDF viewer** - Built-in reader with zoom and navigation
- 🎥 **YouTube embeds** - Video playback with transcript extraction
- 📅 **Daily notes** - Template-based notes attached to calendar days
- 📖 **Reader mode** - Distraction-free article reading

### Organization
- 📁 **Nested collections (Pawkits)** - Hierarchical folders with drag-and-drop
- 🔒 **Private collections** - Hidden from searches and main views
- 📌 **Pinned favorites** - Quick access to frequently used items
- 🏷️ **Tags** - Multi-tag support with filtering
- 🗑️ **Trash & recovery** - 30-day soft delete with restore

### Views & Discovery
- 📚 **Library view** - Grid, list, masonry, and timeline layouts
- 📅 **Calendar view** - Month/week views with scheduled items
- 🏠 **Home dashboard** - Recent items, quick access, weekly overview
- 🔍 **Smart search** - Fuzzy matching with operators (`is:note`, `tag:work`)
- 🎯 **Rediscover mode** - Tinder-style card review for forgotten bookmarks
- 🕸️ **Knowledge graph** - Visual connections between notes

### Sync & Storage
- ⚡ **Local-first** - IndexedDB for instant offline access
- 🔄 **Bidirectional sync** - Automatic background sync with Supabase
- ⏱️ **Offline queue** - Changes sync automatically when back online
- 🖥️ **Multi-tab aware** - Cross-tab sync via BroadcastChannel
- ☁️ **Cloud storage** - Bring your own (Filen, Google Drive, Dropbox, OneDrive)

### AI Assistant (Kit)
- 💬 **Chat with Kit** - Ask questions about your bookmarks and notes
- 📝 **Summarize** - Get summaries of articles and web pages
- 🏷️ **Auto-tagging** - Smart tag suggestions based on content
- 🔍 **Context-aware** - Responses use your actual saved content

---

## Getting Started

### Prerequisites

- Node.js 20+ (LTS recommended)
- pnpm (recommended) or npm/yarn
- Supabase account (for sync - optional for local-only use)

### Installation

```bash
# Clone the repository
git clone https://github.com/TheVisher/Pawkit.git
cd Pawkit

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run migrations
pnpm prisma:migrate
pnpm prisma:generate

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Configuration

See [`.env.example`](.env.example) for all available environment variables.

Required:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `DATABASE_URL` - PostgreSQL connection string

Optional:
- `ANTHROPIC_API_KEY` - For AI features (Kit assistant)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - For Google Drive integration
- OAuth credentials for Dropbox, OneDrive, etc.

---

## Browser Extensions

Browser extensions are **live** on Chrome and Firefox stores.

| Browser | Version | Status | Link |
|---------|---------|--------|------|
| Chrome  | v1.1.0  | ✅ Published | [Chrome Web Store](#) |
| Firefox | v1.1.0  | ✅ Published | [Firefox Add-ons](#) |
| Safari  | —       | Not planned | — |

### Features
- One-click save from any page
- Right-click context menu for images and links
- Popup UI for quick saves with collection selector
- Secure OAuth-style authentication
- Offline queue (saves sync when online)

Extension source: [`packages/extension/`](packages/extension/)

---

## Mobile App

iOS app is currently in TestFlight beta.

| Platform | Status | Link |
|----------|--------|------|
| iOS      | 🟡 TestFlight | [Join Beta](#) |
| Android  | 🔵 Planned | — |

### Features
- Full bookmark and note access
- Share extension - save from any app
- Camera capture for receipts/documents
- Offline-capable with automatic sync
- Native iOS design

Mobile source: [`mobile/`](mobile/)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16 (App Router) |
| **UI** | React 19, TypeScript |
| **Styling** | Tailwind CSS 4, CSS Variables (theme-aware) |
| **Components** | Radix UI + shadcn/ui |
| **Icons** | Lucide React |
| **Database** | PostgreSQL via Supabase |
| **ORM** | Prisma |
| **State** | Zustand |
| **Local Storage** | IndexedDB (via Dexie.js) |
| **Auth** | Supabase Auth |
| **File Storage** | Filen SDK / Google Drive / Dropbox / OneDrive |
| **AI** | Anthropic Claude API |
| **Testing** | Vitest + Testing Library |
| **Deployment** | Vercel |

---

## Project Structure

```
pawkit/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Authentication routes
│   │   ├── (dashboard)/       # Main app routes
│   │   └── api/               # API endpoints
│   ├── components/            # React components
│   ├── lib/                   # Business logic
│   │   ├── services/         # API and sync services
│   │   ├── stores/           # Zustand state stores
│   │   └── utils/            # Helper functions
│   └── styles/               # Global styles
├── packages/
│   └── extension/            # Browser extensions
├── mobile/                   # React Native iOS app
├── prisma/                   # Database schema & migrations
├── public/                   # Static assets
└── docs/                     # Documentation
```

---

## Architecture

Pawkit follows a **local-first architecture**:

1. **Data lives in IndexedDB** - Your device is the source of truth
2. **Instant operations** - No waiting for server responses
3. **Background sync** - Changes sync automatically when online
4. **Offline-capable** - Full functionality without internet
5. **Conflict resolution** - Automatic merge with last-write-wins

### Data Flow

```
User Action → IndexedDB (instant) → UI Update → Sync Queue → Server (background)
                  ↓
            Source of Truth
```

See [LOCAL_FIRST_ARCHITECTURE.md](./docs/LOCAL_FIRST_ARCHITECTURE.md) for details.

---

## Security

Security is a top priority. Pawkit implements:

- 🔒 **Authentication** - Session-based with Supabase Auth
- 🛡️ **Authorization** - Row Level Security (RLS) at database level
- 🔐 **Encryption** - TLS 1.3 for all data in transit
- 🚫 **SSRF Protection** - Blocks private IPs and localhost
- ⏱️ **Rate Limiting** - Prevents API abuse
- 🔑 **Strong Passwords** - 12+ characters with complexity requirements
- 🛡️ **Security Headers** - CSP, X-Frame-Options, and more
- 🔒 **Private Collections** - Server-side filtering via RLS

**For full security details, see [SECURITY.md](./SECURITY.md)**

---

## Development

### Available Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm type-check` | Run TypeScript compiler check |
| `pnpm test` | Run tests with Vitest |
| `pnpm test:ui` | Run tests with UI |
| `pnpm prisma:migrate` | Run database migrations |
| `pnpm prisma:generate` | Generate Prisma client |
| `pnpm prisma:studio` | Open Prisma Studio |

### Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run specific test file
pnpm test src/lib/services/sync-service.test.ts
```

**Current coverage:** 24 tests covering sync logic, conflict resolution, and queue management.

---

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect repository to Vercel
3. Add environment variables
4. Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/TheVisher/Pawkit)

### Docker

```bash
# Build image
docker build -t pawkit .

# Run container
docker run -p 3000:3000 --env-file .env.local pawkit
```

### Self-Hosting

See [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for detailed self-hosting instructions.

---

## Roadmap

### In Progress
- [ ] Note folders with nested hierarchy
- [ ] Kit AI improvements and public rollout
- [ ] iOS App Store release

### Planned (Q1 2026)
- [ ] BYOAI - Bring your own AI via MCP support
- [ ] Connected Platforms - Import from Reddit, YouTube, Twitter
- [ ] Google Calendar integration
- [ ] Quick Notes with auto-consolidation
- [ ] Weekly email digest
- [ ] Android app

### Future Ideas
- [ ] Browser history integration
- [ ] Reading mode with highlights
- [ ] Collaborative collections (share with others)
- [ ] Subscription tracking for recurring services

See [TODO.md](./.claude/tasks/PRIORITY_TASKS.md) for the full development roadmap.

---

## Privacy

Pawkit is designed with privacy as a core principle:

- ✅ **Local-first** - Your data stays on your device
- ✅ **No tracking** - Zero analytics or usage tracking
- ✅ **No ads** - Will never show ads or sell data
- ✅ **No content scanning** - We don't read your files
- ✅ **User control** - Export/delete your data anytime
- ✅ **Open source** - Audit the code yourself

**What we collect:**
- Email address (for authentication)
- Bookmarks and notes (optional sync to our servers)
- File attachments (stored in YOUR cloud provider)

**What we DON'T collect:**
- Browsing history (unless you explicitly save bookmarks)
- Usage analytics
- Device information
- Location data

See our full [Privacy Policy](./PRIVACY.md) for details.

---

## Contributing

Contributions are welcome! Here's how to get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Add tests if applicable
5. Run the test suite: `pnpm test`
6. Commit your changes: `git commit -m 'Add feature'`
7. Push to your fork: `git push origin feature/your-feature`
8. Open a Pull Request

### Development Guidelines

- Follow the existing code style (ESLint + Prettier)
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Keep components under 300 lines (see [PLAYBOOK.md](./docs/PLAYBOOK.md))

---

## Support

### Get Help

- 📧 **Email:** support@pawkit.app
- 💬 **Discord:** [discord.gg/pawkit](#)
- 🐛 **Issues:** [GitHub Issues](https://github.com/TheVisher/Pawkit/issues)
- 📚 **Docs:** [Documentation](./docs/)

### Report Security Issues

Please report security vulnerabilities to **security@pawkit.app**  
See [SECURITY.md](./SECURITY.md) for our responsible disclosure policy.

---

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

## Acknowledgments

Built with:
- [Next.js](https://nextjs.org/) by Vercel
- [Supabase](https://supabase.com/) for backend
- [Radix UI](https://www.radix-ui.com/) for accessible components
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Anthropic Claude](https://www.anthropic.com/) for AI features

Special thanks to all contributors and early adopters! 🙏

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/TheVisher">Erik</a>
</p>

<p align="center">
  <a href="https://github.com/TheVisher/Pawkit/stargazers">⭐ Star on GitHub</a>
</p>
