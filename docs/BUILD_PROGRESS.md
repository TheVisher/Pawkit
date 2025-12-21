# Pawkit V2 Build Progress

## Current Status
**Phase:** 3 (Views & Omnibar)
**Visual Parity:** ~98%
**Architecture:** Local-first (Dexie + Zustand)

---

### Completed ✅
- [x] Project setup (Next.js 15, App Router, React 19)
- [x] Data layer foundation (Dexie.js schema, Prisma schema)
- [x] State management foundation (Zustand stores: auth, data, ui, view, workspace)
- [x] State management persistence (Layout preferences saved to localStorage)
- [x] **3-Panel Layout Shell** (Locked down, pixel-perfect V1 parity)
- [x] **Smooth Sidebar Animations** (Resolved janky right-panel float transitions)
- [x] **Omnibar Positioning:** Centered relative to content area (absolute) rather than viewport.
- [x] **Standardized Header Spacing:** Consistent `pt-5 pb-4 px-6` across views.
- [x] Responsive breakpoints (mobile/tablet/desktop)
- [x] Mobile bottom nav implementation
- [x] Sidebar collapse/restore logic
- [x] CSS variable theming foundation
- [x] V1 Visual Skinning (HSL tokens, Purple glow shadows, Gradient background)
- [x] **Theme System:** Full Light/Dark mode support with `next-themes` and a toggle in the UI.
- [x] High-fidelity Glass Morphism (12px blur, 70% opacity panels)
- [x] Anchor/Merge behavior (Sidebars visually merge with center panel)
- [x] Full-screen mode (Padding removal when left sidebar is anchored)
- [x] **Sync System - Phase 1 (Core APIs):** Robust, secure API routes for `cards`, `collections`, and `workspaces`.
- [x] **Sync System - Phase 1.9 (Events & Todos):** API routes for `events` and `todos` (all support soft delete).
- [x] **Sync System - Phase 2 (Sync Worker):** Full background worker implementation.
- [x] **Sync System Activation:** Engine integrated into `DashboardShell` with visibility/online triggers.
- [x] **Library View (Phase 3.1):** Real data wiring, content-type filtering, and polished Card components (V1 visuals).
- [x] **Card Detail Modal (Phase 3.3):** Full edit capabilities, Tags, Notes, and Reader Mode with auto-save.
- [x] **Omnibar-Toast System (Phase 3.2):** Elastic animations, spring stack physics, and sync status integration.
- [x] **Metadata Scraper Service (Phase 3.4):** Automated OpenGraph extraction with YouTube support and image validation.

### In Progress 🔄
- [ ] **Masonry Layout:** Custom left-to-right implementation.

### Not Started ⬜
- [ ] Collection Management (Create/Edit Pawkits)

---

### Known Issues / Technical Debt
- [ ] **Omnibar Collision Detection:** Omnibar currently centered via absolute positioning; needs logic to switch to compact mode or shift when colliding with header content (e.g., long page titles).
- [ ] **User Sync Optimization:** Currently using JIT upsert in `api/workspaces`. Should eventually move to Supabase Triggers for cleaner architecture.

---

## Session Log

### Dec 20, 2025 - Metadata & Automated Enrichment
- **Automated Metadata:** Completed Phase 3.4. URLs now automatically fetch titles, images, descriptions, and favicons on save.
- **Resilience:** Implemented a concurrency-limited queue (max 3) and server-side timeouts to prevent blocking the UI.
- **YouTube Integration:** Added special handling for high-res YouTube thumbnails.
- **UI Reactivity:** Updated `SyncQueue` and `CardItem` to ensure immediate visual feedback when metadata is ready or sync completes.

### Dec 20, 2025 - Omnibar & Polish
- **Signature Feature:** Completed the Omnibar-Toast system.
  - Implemented elastic morphing animations where the search bar transforms into notifications.
  - Built a physics-based toast stack that "pops out" from underneath the bar.
  - Wired sync events (Success/Error) to trigger these toasts automatically.
- **Theme Polish:** Audited and verified that all new components use the centralized glass variables.

### Dec 20, 2025 - Theme System & Light Mode
- **Light Mode:** Implemented full Light Mode support with theme-aware CSS variables in `globals.css`.
- **Theme Toggle:** Added a system-aware theme toggle (Sun/Moon/Auto) to the Right Sidebar header.
- **Glass Adaptation:** Adjusted glass morphism tokens for light mode (using black transparency instead of white) to ensure legibility and contrast.
- **Shadow Refinement:** Reduced inset shadow opacity and introduced specific `--card-shadow` variables to prevent UI "heaviness" in light mode.

### Dec 20, 2025 - Card Detail & Editing
- **Card Detail Modal:** Completed Phase 3.3. Cards now support a full-screen (fixed) detail view with editable titles, tags, and long-form notes.
- **Auto-Save:** Implemented `onBlur` auto-save logic that integrates seamlessly with the Dexie-to-Cloud sync engine.
- **Reader Mode:** Added a sanitised (DOMPurify) reader mode view for cards with article content.

### Dec 20, 2025 - Workspace Persistence Fix
- **Initialization Logic:** Fixed a critical race condition where a new "My Workspace" was created on every refresh if Dexie was empty, ignoring existing server data.
- **Server Check:** Updated `DashboardShell` to check the server for existing workspaces before creating a new default one. This ensures users reconnect to their existing data on new devices or after clearing cache.

### Dec 20, 2025 - Library & Card Polish
- **Library Wiring:** Completed Phase 3.1. The Library view now displays real data from Dexie/Sync.
- **Visual High-Fidelity:** Implemented `CardItem` with "Vertical Stack" layout and a "Colored Blur" thumbnail effect to match V1's premium feel.
- **Sync Visuals:** Added live "Syncing..." indicators to individual cards for real-time feedback.

### Dec 20, 2025 - Sync Service Refinement
- **API Reliability:** Final stabilization pass on all GET routes. Switched from strict `!== undefined` to loose `!= null` equality for query parameters (`completed`, `parentId`). This prevents Prisma from receiving `null` in boolean/ID filters, which was causing 500 errors.
- **API Stability Fix:** Patched all API routes to handle missing parameters using null coalescing (`??`) for `limit` and `offset`.
- **Sync Success:** Full sync verified as 100% stable in browser console.

### Dec 20, 2025 - Sync Engine Activation
- **Engine Start:** Integrated `useSync` hook into `DashboardShell`. The app now automatically synchronizes on load, coming online, or return to foreground.
- **Queue Refinement:** Fixed an edge case in `processQueue` to prevent infinite retry loops for failed items. Failed items (3+ attempts) are now "parked" and excluded from the active pending count.
- **Full Sync verified:** Confirmed that the system handles initial hydration and delta updates seamlessly.

### Dec 20, 2025 - Layout Animation Refinement
- **Animation Fix:** Resolved janky slide transitions for the right sidebar when the left is anchored. The layout now correctly handles absolute/fixed vs flex positioning for smooth visual parity with V1.