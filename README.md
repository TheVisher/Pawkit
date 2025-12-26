# Pawkit

> Your local-first bookmark and knowledge management system

## What is Pawkit?

Pawkit is a privacy-focused bookmark manager and personal knowledge base that keeps your data on YOUR device, with optional encrypted cloud sync. Think Notion meets Pinterest meets Obsidian.

### Key Features

- **Local-first** - Your data stays on your device by default
- **Privacy-focused** - No tracking, no analytics, no ads
- **Rich notes** - Markdown editor with slash commands and tables
- **Smart organization** - Nested collections (Pawkits), tags, and powerful search
- **Multiple views** - Grid, masonry, list, and timeline layouts
- **Cross-platform** - Web app with Chrome/Firefox extensions
- **AI assistant** - Kit, your optional AI helper (bring your own API key)
- **Dark mode** - Beautiful glass morphism design

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm
- Supabase account (free tier works)

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/TheVisher/Pawkit.git
   cd Pawkit
   ```

2. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```

3. Fill in your Supabase credentials from https://supabase.com/dashboard

4. Install dependencies:
   ```bash
   pnpm install
   ```

5. Generate Prisma client:
   ```bash
   pnpm db:generate
   ```

6. Start dev server:
   ```bash
   pnpm dev
   ```

7. Open http://localhost:3000

## Tech Stack

- **Framework:** Next.js 16, React 19, TypeScript
- **Database:** Supabase (PostgreSQL + Auth)
- **Local Storage:** IndexedDB via Dexie
- **Styling:** Tailwind CSS + shadcn/ui
- **Editor:** Tiptap rich text editor
- **AI:** Anthropic Claude (optional)

## Project Structure

```
src/
├── app/              # Next.js app router pages
├── components/       # React components
│   ├── cards/        # Card display components
│   ├── layout/       # Layout components (sidebar, omnibar)
│   └── ui/           # shadcn/ui components
├── lib/              # Utilities and services
│   ├── db/           # Database (Prisma, IndexedDB)
│   ├── services/     # Business logic (sync, cards)
│   └── supabase/     # Supabase client
└── hooks/            # Custom React hooks
```

## Documentation

See `docs/PLAYBOOK.md` for detailed architecture and design decisions.

## License

MIT
