# Pawkit

<p align="center">
  <img src="public/images/logo.png" alt="Pawkit Logo" width="120" />
</p>

<p align="center">
  <strong>Your local-first bookmark manager with privacy at its core</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#documentation">Documentation</a> •
  <a href="#contributing">Contributing</a> •
  <a href="#license">License</a>
</p>

---

## About

Pawkit is a visual bookmark manager designed for speed, privacy, and control. Built with a local-first architecture, all your data lives on your device with optional encrypted sync. Organize bookmarks into nested collections (Pawkits), take connected notes, and rediscover content through timeline and calendar views.

### Why Pawkit?

- **🚀 Instant Speed** - No server lag. Everything loads instantly because it's already on your device
- **🔒 Privacy First** - Your data stays local. Sync is encrypted end-to-end with zero-knowledge architecture
- **📚 Smart Organization** - Nested collections, tags, notes with wiki-links, and knowledge graphs
- **📅 Timeline & Calendar** - Rediscover content by when you saved it or schedule items for later
- **🎨 Beautiful & Minimal** - Clean interface that gets out of your way
- **🌐 Browser Extensions** - Save from anywhere with one click (Chrome, Firefox, Safari)

---

## Features

### Core Functionality
- **Visual Bookmark Management** - Grid, list, and compact views with rich metadata
- **Nested Collections (Pawkits)** - Organize like folders, but smarter with drag-and-drop
- **Private Collections** - End-to-end encrypted collections for sensitive bookmarks
- **Reader Mode** - Distraction-free reading with automatic article extraction
- **Rich Notes** - Markdown notes with wiki-links and bidirectional linking
- **Knowledge Graph** - Visualize connections between your notes
- **Timeline View** - Browse bookmarks chronologically
- **Calendar View** - Schedule bookmarks and see daily notes
- **Tags & Search** - Powerful filtering and fuzzy search
- **Import/Export** - Bring your bookmarks from browsers or other tools

### Technical Highlights
- **Local-First Architecture** - IndexedDB for instant access, offline-capable
- **Cross-Device Sync** - Encrypted sync with Supabase backend
- **Conflict Resolution** - Automatic merge handling for concurrent edits
- **Progressive Web App** - Install on desktop or mobile
- **Dark Mode** - Easy on the eyes, day or night

---

## Getting Started

### Prerequisites

- **Node.js 20+** (LTS recommended)
- **pnpm** (recommended) or npm/yarn
- **Supabase account** (for sync, optional for local-only use)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/TheVisher/Pawkit.git
   cd Pawkit
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` with your configuration:
   ```env
   # Supabase (for sync)
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

   # Database
   DATABASE_URL=your-postgres-connection-string
   ```

4. **Run database migrations**
   ```bash
   pnpm prisma:migrate
   pnpm prisma:generate
   ```

5. **Start the development server**
   ```bash
   pnpm dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

---

## Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server with hot reload |
| `pnpm build` | Create optimized production build |
| `pnpm start` | Run production server |
| `pnpm lint` | Run ESLint checks |
| `pnpm prisma:migrate` | Run database migrations |
| `pnpm prisma:generate` | Regenerate Prisma client |
| `pnpm test:e2e` | Run Playwright end-to-end tests |

### Project Structure

```
pawkit/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication routes
│   ├── (dashboard)/       # Main app routes
│   └── api/               # API endpoints
├── components/            # React components
│   ├── cards/            # Bookmark card components
│   ├── navigation/       # Sidebar and navigation
│   ├── modals/           # Dialogs and modals
│   └── ui/               # Reusable UI components
├── lib/                   # Utilities and business logic
│   ├── services/         # API services
│   ├── stores/           # Zustand state stores
│   └── utils/            # Helper functions
├── prisma/               # Database schema and migrations
├── public/               # Static assets
└── tests/                # Playwright E2E tests
```

### Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI, Lucide Icons
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **State Management**: Zustand
- **Local Storage**: IndexedDB (via idb)
- **Authentication**: Supabase Auth
- **Testing**: Playwright
- **Deployment**: Vercel

---

## Architecture

### Local-First Design

Pawkit follows a local-first architecture where:

1. **All data is stored locally in IndexedDB** for instant access
2. **Operations work offline** - no internet required for core functionality
3. **Changes sync in the background** when online
4. **Conflicts are automatically resolved** using last-write-wins with timestamps
5. **Encryption happens client-side** for private collections

Read more in [LOCAL_FIRST_ARCHITECTURE.md](./LOCAL_FIRST_ARCHITECTURE.md)

### Data Model

Key entities:
- **Cards** - Individual bookmarks with metadata, tags, and notes
- **Collections (Pawkits)** - Hierarchical organization with drag-and-drop
- **Notes** - Markdown documents with wiki-links and backlinks
- **User Preferences** - Settings stored locally

See [DATABASE_QUICK_REFERENCE.md](./DATABASE_QUICK_REFERENCE.md) for schema details.

---

## Deployment

### Vercel (Recommended)

1. **Connect your repository** to Vercel
2. **Add environment variables** in Vercel dashboard
3. **Deploy** - Vercel will automatically build and deploy

### Docker

```bash
# Build image
docker build -t pawkit .

# Run container
docker run -p 3000:3000 --env-file .env.local pawkit
```

### Environment Variables

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment guide.

---

## Browser Extensions

Browser extensions for Chrome, Firefox, and Safari are in development.

For now, you can use bookmarklets or manually add URLs via the "Add Card" button.

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Quick Start

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## Roadmap

### Coming Soon
- [ ] Google Calendar integration
- [ ] Browser extensions (Chrome, Firefox, Safari)
- [ ] Mobile apps (iOS, Android)
- [ ] AI-powered date extraction for auto-scheduling
- [ ] Collaboration features (shared Pawkits)

See [POST_LAUNCH_ROADMAP.md](./docs/archive/POST_LAUNCH_ROADMAP.md) for the full roadmap.

---

## Privacy & Security

- **Local-first** - Your data lives on your device
- **End-to-end encryption** - Private collections are encrypted client-side
- **Zero-knowledge sync** - We can't read your encrypted data
- **No tracking** - No analytics, no telemetry, no ads
- **Open source** - Audit the code yourself

Read our [Privacy Policy](./PRIVACY.md) and [Security Practices](./SAFETY.md)

---

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

## Acknowledgments

Built with love using amazing open-source projects:
- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [Prisma](https://www.prisma.io/)
- [Radix UI](https://www.radix-ui.com/)
- [Tailwind CSS](https://tailwindcss.com/)

---

## Support

- **Documentation**: [docs/](./docs/)
- **Issues**: [GitHub Issues](https://github.com/TheVisher/Pawkit/issues)
- **Discussions**: [GitHub Discussions](https://github.com/TheVisher/Pawkit/discussions)

---

<p align="center">Made with ❤️ by <a href="https://github.com/TheVisher">TheVisher</a></p>
