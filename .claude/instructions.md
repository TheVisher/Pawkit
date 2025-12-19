# Claude Code Instructions for Pawkit V2

> **This file auto-loads every Claude Code session. These are the safety rails and context for building V2.**
>
> **Last Updated**: December 19, 2025
> **Status**: V2 Rewrite - Fresh start from V1

---

## 1. CRITICAL: DATABASE SAFETY RULES

**THIS PROJECT HAS EXPERIENCED CATASTROPHIC DATA LOSS IN THE PAST.**

All users lost their data when the production database was accidentally reset. These rules are **NON-NEGOTIABLE**.

### ABSOLUTELY FORBIDDEN - NEVER DO THESE:

```bash
# NEVER run these commands:
npx prisma migrate reset
npx prisma db push --force-reset
npx prisma migrate reset --force
pnpm prisma:reset
pnpm prisma:push:force
DROP TABLE
TRUNCATE
DELETE FROM [table] -- (without WHERE clause)
```

### NEVER:
- Use any command containing `--force-reset`
- Use any command containing `--force` with database operations
- Run direct SQL commands like `DROP TABLE`, `TRUNCATE`, `DELETE FROM` without WHERE
- Delete files from `prisma/migrations/` directory
- Set `ALLOW_PRODUCTION_RESET=true` or similar bypass flags
- Modify protection scripts (`protect-production-db.js`, `pre-migration-check.js`)

### REQUIRED BEFORE ANY DATABASE OPERATION:

1. **Check if production**: `grep DATABASE_URL .env.local`
   - If contains `supabase.co`, `aws.rds`, `render.com`, `railway.app`, `planetscale.com`, `neon.tech` → **IT'S PRODUCTION. STOP.**

2. **Ask user permission**: "I need to modify the database schema. Should I proceed?"

3. **Recommend backup**: `pnpm prisma:backup`

4. **Use protected scripts only**:
   ```bash
   pnpm prisma:generate    # Always safe
   pnpm prisma:backup      # Always safe
   pnpm prisma:studio      # Safe, read-only
   pnpm prisma:migrate     # Protected by pre-migration-check.js
   pnpm prisma:push        # Protected (no --force-reset)
   ```

### IF USER REPORTS DATA LOSS:

1. **STOP immediately** - don't run any more commands
2. Check for backups: `ls -lht backups/ | head -10`
3. For Supabase: Dashboard → Database → Backups → Restore
4. Guide user through recovery - don't try to fix it yourself

---

## 2. FILE SIZE LIMITS (ENFORCED)

V1 had massive files that became unmaintainable:
- `card-gallery.tsx` - 1,848 lines (77KB)
- `card-detail-modal.tsx` - 2,756 lines (112KB)
- `left-navigation-panel.tsx` - 2,112 lines
- `data-store.ts` - 1,200+ lines (50KB+)

**V2 LIMITS - DO NOT EXCEED:**

| File Type | Max Lines | Action if Approaching |
|-----------|-----------|----------------------|
| Components | 300 lines | Split into subcomponents |
| Stores | 500 lines | Split by domain (cards-store.ts, collections-store.ts) |
| Services | 400 lines | Extract helpers, split by concern |
| API routes | 200 lines | Extract to lib/server/ functions |

**If you're at 80% of limit, propose splitting BEFORE continuing.**

---

## 3. KEY DESIGN DECISIONS (DO NOT CONTRADICT)

These decisions were made during V2 planning. Do not suggest alternatives:

### UI Architecture
| Decision | Rationale |
|----------|-----------|
| **No separate Notes view** | Notes are cards filtered via Library → Content Type. Same grid/list/masonry layouts. |
| **Tasks = Home widget + modal** | No dedicated Tasks nav item. Click Tasks widget on Home → opens Tasks modal. |
| **No Den feature** | Replaced by `isPrivate` flag on any Pawkit. Simpler, more flexible. |
| **No Notes section in left sidebar** | Note Folders appear in RIGHT sidebar when Content Type = Notes. |
| **Per-content-type view memory** | `library:notes` saves separately from `library:bookmarks`. |

### Tech Stack (Non-Negotiable)
| Layer | Technology | DO NOT USE |
|-------|------------|------------|
| Local DB | Dexie.js | NOT raw idb, NOT localForage |
| Drag & Drop | dnd-kit (unified) | NOT Muuri, NOT react-beautiful-dnd |
| UI Components | shadcn/ui | NOT custom components, NOT MUI, NOT Chakra |
| Masonry | Custom implementation | NOT Muuri (wrong ordering) |
| State | Zustand | NOT Redux, NOT Jotai |
| Forms | React Hook Form + Zod | NOT Formik |

### Masonry Ordering
V1 uses Muuri which orders **top-to-bottom per column** (WRONG).
V2 MUST order **left-to-right** (reading order).

```
V1 (WRONG):           V2 (CORRECT):
1  4  7               1  2  3
2  5  8               4     5
3  6  9               6  7  8
```

### View Settings Split
```typescript
// SYNCED across devices (UserViewSettings table):
layout, sortBy, sortOrder, showTitles, showUrls, showTags, cardPadding

// LOCAL only (localStorage - device-specific):
cardSize, leftSidebarCollapsed, rightSidebarCollapsed, leftSidebarAnchored, rightSidebarAnchored
```

---

## 4. ARCHITECTURE RULES

### Local-First Principles
1. **IndexedDB (Dexie) is the source of truth**, server is backup
2. **Load from local immediately** on app open - render UI before any network calls
3. **Optimistic updates**: Update local → Update Zustand → Queue sync
4. **2-second debounce** on sync queue
5. **App works fully offline**

### Workspace Isolation
- **ALL queries filter by `workspaceId`** - no exceptions
- Switching workspace = clear Zustand + reload from Dexie
- Each workspace has completely isolated data

### Sync Flow
```
User Action → Zustand (immediate UI) → Dexie (persist) → Sync Queue (debounced) → API → Supabase
```

### User Isolation (CRITICAL)
- Each user gets their own IndexedDB database: `pawkit-{userId}-{workspaceId}-local-storage`
- `pawkit_last_user_id` localStorage marker enables user switch detection
- Sign out MUST clear session markers
- Previous user's data cleaned up on user switch

---

## 5. DOCUMENT HIERARCHY

Read in this order for context:

| Priority | Document | Purpose |
|----------|----------|---------|
| 1 | `/Users/minivish/Downloads/PAWKIT_V2_PLAYBOOK_UPDATED.md` | Master architecture - READ FIRST |
| 2 | `.claude/instructions.md` | This file - safety rails |
| 3 | `docs/CONVENTIONS.md` | Code patterns (create if missing) |
| 4 | `docs/DESIGN_SYSTEM.md` | UI specifications (create if missing) |
| 5 | `.claude/skills/SKILL_INDEX.md` | Task → skill routing |

### V1 Skills (Reference Only)
V1 skills in `.claude/skills/` document V1 patterns. V2 may differ:
- `pawkit-ui-ux` → Still relevant for theming concepts
- `pawkit-sync-patterns` → Patterns apply, implementation differs
- `pawkit-database` → Supabase patterns still apply
- `pawkit-security` → All security patterns carry forward
- `pawkit-migrations` → Migration patterns still apply

---

## 6. RECOVERY PROCEDURES

### Local IndexedDB Issues
```javascript
// Clear local database for testing (browser console)
indexedDB.deleteDatabase('pawkit-{userId}-{workspaceId}-local-storage');
```

### Supabase Backup Restore
1. Go to Supabase Dashboard → Database → Backups
2. Select most recent backup
3. Click "Restore"
4. Verify data is back

### Sync Queue Stuck
```javascript
// Clear sync queue (browser console)
const db = await indexedDB.open('pawkit-sync-queue');
// Delete syncQueue object store contents
```

### User Switch Issues
```javascript
// Force clear user context (browser console)
localStorage.removeItem('pawkit_last_user_id');
localStorage.removeItem('pawkit_active_device');
// Then sign out and back in
```

---

## 7. EXTENSION COMPATIBILITY

The browser extension auth MUST be preserved exactly:

```typescript
// Token format: 64-character hex string
const token = randomBytes(32).toString('hex');

// Hashing: bcrypt with 10 rounds
const hashedToken = await bcrypt.hash(token, 10);

// Expiry: 30 days
const TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

// Header format
Authorization: Bearer <64-char-token>
```

**Endpoints to preserve:**
- `POST /api/extension/token` - Generate token
- `POST /api/cards` - Create card (Bearer auth)
- `GET /api/pawkits` - List collections (Bearer auth)

---

## 8. PACKAGE MANAGER

**This project uses pnpm, NOT npm.**

```bash
pnpm install           # NOT npm install
pnpm add <package>     # NOT npm install <package>
pnpm run <script>      # NOT npm run <script>
```

The lockfile is `pnpm-lock.yaml`. Never create `package-lock.json`.

---

## 9. COMMON MISTAKES TO AVOID

### Database
- Using `--force-reset` with any Prisma command
- Running migrations without checking if production
- Deleting migration files

### Architecture
- Creating a separate Notes view (Notes are in Library with Content Type filter)
- Adding Tasks to left sidebar navigation (Tasks are Home widget + modal)
- Creating a Den feature (use `isPrivate` on Pawkits)
- Using Muuri for masonry (use custom dnd-kit implementation)

### Code Quality
- Creating components over 300 lines
- Hardcoding colors instead of CSS variables
- Using backdrop-blur directly (let CSS handle for Glass mode)
- Not filtering by `workspaceId` in queries
- Client-side privacy filtering (must be server-side)

### Security
- Trusting client-provided `userId`
- Returning private cards in public endpoints
- Exposing internal error details to client
- Not clearing `pawkit_last_user_id` on sign out

---

## 10. QUICK REFERENCE

### Safe Commands
```bash
pnpm dev              # Start dev server
pnpm build            # Production build
pnpm lint             # Run linter
pnpm prisma:generate  # Generate Prisma client
pnpm prisma:studio    # Open database viewer
pnpm prisma:backup    # Create backup
```

### Creating a Card (Pattern)
```typescript
// 1. Update Zustand (immediate UI)
cardsStore.getState().createCard(cardData);

// 2. Persist to Dexie
await db.cards.add(cardData);

// 3. Queue sync (debounced)
syncService.queueSync({
  entityType: 'card',
  entityId: card.id,
  operation: 'create',
  payload: cardData
});
```

### CSS Variables (Use These)
```css
/* Backgrounds */
var(--bg-surface-1)  /* Cards, modals */
var(--bg-surface-2)  /* Elevated elements */
var(--bg-surface-3)  /* Hover states */

/* Shadows */
var(--shadow-1)  /* Subtle */
var(--shadow-2)  /* Cards */
var(--shadow-3)  /* Modals */

/* Transitions */
var(--transition-fast)   /* 50ms - instant feel */
var(--transition-base)   /* 75ms - default */
```

---

## 11. BEFORE YOU START ANY TASK

1. **Check what branch you're on**: We're building V2 from scratch
2. **Read the playbook** if working on a new area
3. **Check file size** before adding code - split if approaching limits
4. **Use TodoWrite** to track multi-step tasks
5. **Ask if unsure** - it's better to ask than to cause data loss

---

**USER DATA IS IRREPLACEABLE. BE CAUTIOUS, NOT FAST.**

This project's users have already lost data once. It must never happen again.
