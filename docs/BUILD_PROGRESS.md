# Pawkit V2 Build Progress

## Current Status
**Phase:** 6 (Rediscover View)
**Visual Parity:** ~98%
**Architecture:** Local-first (Dexie + Zustand)

---

### Completed ✅
- [x] Project setup (Next.js 16.1.0, App Router, React 19)
- [x] Data layer foundation (Dexie.js schema, Prisma schema)
- [x] State management foundation (Zustand stores: auth, data, ui, view, workspace)
- [x] State management persistence (Layout preferences saved to localStorage)
- [x] **3-Panel Layout Shell** (Locked down, pixel-perfect V1 parity)
- [x] **Smooth Sidebar Animations** (Resolved janky right-panel float transitions)
- [x] **Omnibar Positioning:** Centered relative to content area (absolute) rather than viewport.
- [x] **Omnibar Scroll-Awareness:** Collapses to compact mode on scroll; expands for toasts.
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
- [x] **Masonry Layout (Phase 3.5):** Custom left-to-right dense packing algorithm with `dnd-kit` integration and responsive resizing.
- [x] **QuickNote Compact Cards (Phase 3.7):** Lightweight "sticky note" visual treatment, inline editing, and smart todo detection.
- [x] **Drag-and-Drop Persistence (Phase 3.6):** Persistent manual sorting in Dexie, portal-based overlays, and conflict-free absolute positioning.
- [x] **Collections & Organization (Phase 4):** Recursive Pawkits tree, drag-to-categorize logic, and nested navigation.
- [x] **Calendar View (Phase 5):** Month/Week/Day/Agenda grids, event rendering.
- [x] **Context Menu System:** Comprehensive context menus for cards, sidebar items, and content areas.
- [x] **Selection System:** Multi-select state management foundations.
- [x] **Cover Image Customization:** Background layers, position/height sliders, and gradient fades.
- [x] **Expandable Panels:** Dynamic UI for action buttons and Kit chat interface.

### In Progress 🔄
- [ ] **Rediscover View (Phase 6):** Card stack interface and review workflow.
- [ ] **Contextual Note Editor (Phase 7.2+):** Wiki-links, backlinks panel, image uploads, block drag handles.

### Not Started ⬜
- [ ] **Read-it-Later System:** Progress tracking, reading time, and status filters.
- [ ] **Raw Markdown View:** Toggle to view/edit raw markdown source.
- [ ] **Note Export:** Export notes to Markdown (.md) or Plain Text (.txt) formats.

### Recently Completed ✅
- [x] **Contextual Note Editor Foundation (Phase 7.1):** Tiptap integration, floating toolbar, slash commands, task lists.

---

### Known Issues / Technical Debt
- [ ] **Orphaned TopBar:** The `TopBar` component containing view toggles (Masonry/Grid/List) is implemented but not mounted in the `DashboardShell`. Needs integration into `LibraryPage` or the shell header.
- [ ] **Omnibar Collision Detection:** Omnibar currently centered via absolute positioning; needs logic to switch to compact mode or shift when colliding with header content (e.g., long page titles).
- [ ] **User Sync Optimization:** Currently using JIT upsert in `api/workspaces`. Should eventually move to Supabase Triggers for cleaner architecture.

---

## Session Log

### Dec 26, 2025 - UI Refinements & Cover System
- **Cover Image Evolution:**
  - **Background Layering:** Refactored cover images to sit as a background layer, ensuring content doesn't jump when covers are added/removed.
  - **Fine-Grained Control:** Added sliders for cover height and vertical positioning.
  - **Title Positioning:** Implemented a slider to adjust the vertical position of the title/header content relative to the cover.
  - **Visuals:** Added smooth gradient fades for better text legibility against cover images.
- **Expandable Panels:**
  - Implemented expandable panels for the "Add" (+) button and "Kit" chat interface, improving screen real estate usage.
- **Architectural Cleanup:**
  - **Context Menus:** Verified mature context menu system for Cards, Sidebar, and Content Areas.
  - **Selection Store:** Confirmed implementation of `selection-store.ts` for multi-select capabilities.

### Dec 25, 2025 - Pawkit UI Customization (Cover Images & Polish)
- **Cover Image System:**
  - Implemented background-layer cover images that don't shift content layout.
  - Added smooth gradient fades for professional visual blending.
  - Built a cover image picker modal for easy personalization.
- **Dynamic Adjustments:**
  - Added live-updating sliders for cover image height and vertical position.
  - Implemented a title position slider to move UI elements up/down relative to the cover.
- **Organization & Navigation:**
  - Promoted Pawkits to a root navigation item with its own dedicated view.
  - Added collapsible sub-pawkit sections to the detail view for better hierarchy management.
- **UI UX Polish:** Moved "Add cover" options to a clean dropdown menu to reduce header clutter.

### Dec 25, 2025 - Security, Documentation & Refactoring
- **Critical Security Hardening (Phase 8):**
  - **Open Redirect Fix:** Implemented allowlist validation in OAuth callback to prevent phishing redirects.
  - **Admin Auth:** Moved cleanup endpoint to `/api/user/` scope, enforcing owner-only access.
  - **SSRF Protection:** Added strict private IP blocking and protocol validation to the Metadata API.
  - **Rate Limiting:** Implemented a custom, dependency-free in-memory rate limiter for API routes.
  - **Password Policy:** Enforced strong password requirements (12+ chars, mixed case, numbers) on the client side.
  - **CSP Headers:** Configured strict Content Security Policy in `next.config.ts`.
- **Documentation Overhaul:**
  - **README:** Rewrote `README.md` with project-specific features, tech stack, and setup guide.
  - **Environment:** Created `.env.example` template.
  - **Playbook:** Updated status markers to reflect "V2 Built" status.
- **Major Refactoring (Phase 9):**
  - **Omnibar:** Split the massive 1,500-line component into a modular `src/components/layout/omnibar/` directory with separated logic (`use-omnibar.ts`) and sub-components.
  - **Card List View:** Modularized into `src/components/cards/card-list-view/`, splitting cell renderers, row logic, and hooks.
  - **Card Item:** Refactored into `src/components/cards/card-item/` with performance optimizations (memoization).
  - **Sync Service:** Restructured `sync-service.ts` into a domain-driven `src/lib/services/sync/` module.
- **Testing:**
  - **Sync Engine Tests:** Added a comprehensive test suite (24 tests) for the sync service covering queue logic, retry backoff, and conflict resolution using `vitest` and `fake-indexeddb`.
  - **Error Boundary:** Implemented a global React Error Boundary to catch and display runtime errors gracefully.

### Dec 24, 2025 - QuickNote Evolution & Sync Layer
- **QuickNote Compact Cards:** Implemented a specialized `QuickNoteCard` with a 100px min-height, accent left-border, and zero-padding aesthetic. 
- **Inline Editing:** Bypassed the detail modal for QuickNotes, allowing direct editing in the grid via textarea with auto-save on blur.
- **Smart Todo Detection:** Added a regex-based detection engine (`todo-detection.ts`) that suggests adding notes to the Tasks list based on content (e.g., "buy...", "call...").
- **Promote Workflow:** Added a "Note" button to convert lightweight QuickNotes into full Markdown notes with one click.
- **Sync Layer Update:** 
  - Updated `prisma/schema.prisma` and `docs/PLAYBOOK.md` to include `convertedToTodo` and `dismissedTodoSuggestion` fields.
  - Updated API routes (`POST`, `PATCH`) and Zod schemas to ensure todo-detection state persists across devices.
  - Updated `LocalCard` types for full frontend-to-backend consistency.

### Dec 23, 2025 - Contextual Note Editor Foundation (Phase 7.1)
- **Tiptap Integration:** Implemented a production-ready rich text editor powered by Tiptap with StarterKit, TaskList, Link, and Typography extensions.
- **Floating Toolbar:** Created a custom selection-based floating toolbar with Bold, Italic, Code, and Link buttons that appears on text selection.
- **Slash Commands:** Built a command palette that opens on `/` keystroke with support for headings, lists, checklists, code blocks, quotes, and dividers. Includes keyboard navigation and type-to-filter.
- **Card Detail Modal Integration:**
  - Note cards (`md-note`, `text-note`, `quick-note`) now use the rich editor for main content with Edit/Preview toggle.
  - Bookmark cards use the rich editor for the notes field.
  - All changes auto-save with 500ms debounce.
- **Styling:** Full CSS variable compliance with glass morphism design. Works in both light and dark modes.
- **Dependencies Added:** `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-placeholder`, `@tiptap/extension-link`, `@tiptap/extension-task-list`, `@tiptap/extension-task-item`, `@tiptap/extension-typography`.

### Dec 20, 2025 - Interactive Polish & View Settings
- **Omnibar Refinement:** Implemented scroll-aware collapse logic. The Omnibar now shrinks to a compact pill after 20px of scroll but automatically expands to show notifications.
- **View-Specific Settings:** Wired the Right Sidebar controls (Card Size, Padding, Toggles) to the View Store. Settings now persist per-view (Library has different settings than Pawkits).
- **Sidebar UX:** Added smooth fade transitions between view-specific sidebar content to reduce visual jarring during navigation.
- **Card Sizing:** Standardized card width spread (180px - 520px) for better visual hierarchy across different screen sizes.

### Dec 20, 2025 - Collections & Organization
- **Pawkits Management:** Completed Phase 4. Users can now create nested collections (Pawkits) via a glass-themed modal.
- **Cross-Component DnD:** Successfully implemented "Drag to Pawkit". Dropping a card from the Masonry grid onto a sidebar tree item adds the card to that collection.
- **DnD Architecture:** Lifted the `DndContext` to the `DashboardShell` root to allow dragging items across layout panels (Center -> Left Sidebar).

### Dec 20, 2025 - Drag-and-Drop & Layout Stability
- **DnD Persistence:** Completed Phase 3.6. Implemented a robust manual sorting system that persists to Dexie and Sync.
- **Bug Resolution:** 
  - Fixed a 100px cursor offset by isolating `dnd-kit` transforms from absolute masonry positioning.
  - Resolved clipping issues by porting the `DragOverlay` to `document.body`.
  - Switched to `pointerWithin` collision detection for better accuracy in dense masonry grids.
- **Visual Polish:** Added a 60% scale, 85% opacity, and -2 degree tilt effect to dragged items for premium feel.

### Dec 20, 2025 - Masonry & Performance Polish
- **Flicker Resolution:** Identified and resolved a major UI flickering issue caused by Zustand array reference changes triggering global re-renders. 
- **Memoization Standard:** Implemented `React.memo` with custom deep-comparison logic for `CardItem` and `SortableCard`. This ensures only the modified card re-renders during metadata updates or sync status changes.
- **Architectural win:** Decoupled layout stability from data layer updates, resulting in 60fps animations during library interaction.

### Dec 20, 2025 - Views & Masonry
- **Masonry Layout:** Implemented a custom "Shortest Column First" masonry algorithm in `lib/utils/masonry.ts` that preserves left-to-right reading order.
- **Unified DnD:** Integrated `dnd-kit` into the `MasonryGrid` component, allowing for future drag-and-drop reordering.
- **Responsive:** Added `ResizeObserver` logic to dynamically recalculate columns and card widths.

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
