# Pawkit Documentation

Pawkit is a bookmark and note platform built on Convex with real-time sync.

Note: Some documents still describe the pre-Convex local-first architecture. Those are marked as legacy below.

---

## Quick Navigation

| Document | Purpose |
|----------|---------|
| [IMPLEMENTED.md](./IMPLEMENTED.md) | What is working in V2 |
| [ROADMAP.md](./ROADMAP.md) | Prioritized implementation plan |
| [IDEAS.md](./IDEAS.md) | Feature ideas bank |
| [MARKETING.md](./MARKETING.md) | Launch strategy and community building |
| [PLAYBOOK.md](./PLAYBOOK.md) | Comprehensive build guide (legacy sections may exist) |
| [CONVEX_MIGRATION_PLAYBOOK.md](./CONVEX_MIGRATION_PLAYBOOK.md) | Migration notes to Convex |

---

## Core Philosophy

- Real-time collaboration and sync via Convex
- BYOS (Bring Your Own Storage) for optional file providers
- BYOAI (Bring Your Own AI) for Kit integrations
- Portability and exportability by default

---

## Deployment Status

| Platform | Status |
|----------|--------|
| Web App | Production |
| Chrome Extension | Published |
| Firefox Extension | Published |
| iOS App | TestFlight |
| Android App | In development |

---

## For Claude Code

Skill files live in `.claude/skills/` if present in your environment. Some skills are legacy and reference the old local-first stack.

---

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Convex | Database, auth, functions, realtime |
| React 19 | Modern UI runtime |
| TanStack Start | App framework |
| Zustand | Lightweight state management |
| Tailwind CSS | Styling and design tokens |

---

## Legacy Docs

These documents describe the pre-Convex local-first architecture and are retained for historical context:

- [LOCAL_FIRST_ARCHITECTURE.md](./LOCAL_FIRST_ARCHITECTURE.md)
- Portions of [PLAYBOOK.md](./PLAYBOOK.md)
- Portions of [IMPLEMENTED.md](./IMPLEMENTED.md)

---

Last Updated: January 22, 2026
