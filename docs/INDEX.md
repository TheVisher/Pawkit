# Pawkit Documentation

> **Your Internet in Your Pawkit**

Welcome to Pawkit - a local-first bookmarking and note-taking app with cloud backup.

---

## Quick Navigation

| Document | Purpose |
|----------|---------|
| [**IMPLEMENTED.md**](./IMPLEMENTED.md) | What's working in V2 right now |
| [**ROADMAP.md**](./ROADMAP.md) | Prioritized implementation plan |
| [**IDEAS.md**](./IDEAS.md) | Feature ideas bank (unfiltered) |
| [**MARKETING.md**](./MARKETING.md) | Launch strategy & community building |
| [**PLAYBOOK.md**](./PLAYBOOK.md) | Comprehensive build guide (78KB reference) |
| [**LOCAL_FIRST_ARCHITECTURE.md**](./LOCAL_FIRST_ARCHITECTURE.md) | Deep-dive on sync architecture |

---

## Core Philosophy

- **Local-first** - IndexedDB is source of truth, Supabase for auth + sync
- **BYOS** (Bring Your Own Storage) - Users connect Filen, Google Drive, Dropbox
- **BYOAI** (Bring Your Own AI) - Claude MCP integration, zero API costs
- **Anti-lock-in** - No proprietary formats, easy export

---

## Deployment Status

| Platform | Status |
|----------|--------|
| Web App (Vercel) | ✅ Production |
| Chrome Extension | ⚠️ Needs resubmit (v1.1.1) |
| Firefox Extension | ✅ Published (v1.1.0) |
| iOS App | 🧪 TestFlight Beta |
| Android App | 🔄 In Development |

---

## For Claude Code

### Skill Files (How to Build)

Located in `.claude/skills/`:

| Skill | Purpose |
|-------|---------|
| `pawkit-v2-sync` | Sync architecture patterns |
| `pawkit-v2-data-model` | Dexie.js + Prisma schemas |
| `pawkit-v2-layout` | 3-panel layout system |
| `pawkit-v2-components` | Component patterns |
| `pawkit-v2-ui` | Design system (Modern/Glass) |
| `pawkit-v2-safety` | Security patterns |
| `pawkit-ai-integration` | Kit AI assistant |
| `pawkit-v2-masonry` | Custom masonry layout |
| `pawkit-v2-view-settings` | Per-view preferences |

### Component Documentation

Located in `docs/components/`:
- `INDEX.md` - Component overview
- `calendar.md` - Calendar system
- `cards.md` - Card components
- `editor.md` - Tiptap editor
- `layout.md` - Layout system
- `modals.md` - Modal patterns

---

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| IndexedDB (Dexie.js) | Local-first, instant UI |
| Zustand | Simple state, no boilerplate |
| Supabase | Auth + Postgres + RLS |
| Tiptap | Extensible markdown editor |
| dnd-kit | Modern drag-drop |
| CSS Variables | Theme-agnostic components |

---

## Document Maintenance

| File | Updated By | When |
|------|------------|------|
| IMPLEMENTED.md | Claude Code | After feature completion |
| ROADMAP.md | Erik + Claude | When priorities change |
| IDEAS.md | Anyone | When ideas arise |

---

*Last Updated: December 29, 2025*
