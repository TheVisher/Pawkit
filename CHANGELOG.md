# Changelog

All notable changes to Pawkit will be documented in this file.

## [Unreleased]

### Added - PKM Features (Personal Knowledge Management)
- **Enhanced Markdown Editor**: Rich editing experience with toolbar, syntax highlighting, and keyboard shortcuts
- **Wiki-Style Note Linking**: Link notes together using `[[Note Title]]` syntax
- **Note-to-Bookmark Linking**: Connect notes to bookmarks using `[[card:Title]]` or `[[URL]]` syntax
- **Bidirectional Backlinks**: See which notes link to the current note in References tab
- **Tag System**: Auto-extract hashtags from notes with `#tag` syntax
- **Tag Filtering**: Filter notes by tags
- **Metadata Display**: Real-time display of links, tags, and character count
- **Database Schema**: New tables for NoteLink, NoteCardLink, and NoteTag relationships

### Fixed
- **Critical: Local-First Architecture Violations** - Fixed multiple components bypassing IndexedDB and writing directly to server
  - Den Pawkits: Create, rename, and delete operations now use data store for local-first updates
  - Timeline: Bulk move and delete operations now update IndexedDB before syncing to server
  - Dig Up: Delete and add-to-collection operations now follow local-first pattern
  - All operations now ensure fast, responsive updates while maintaining data integrity across devices
- **Critical: Sidebar Crash** - Fixed null reference error when collections missing children property after PostgreSQL migration
  - Added null safety checks in app-sidebar.tsx and resizable-sidebar.tsx
  - Prevents "can't access property 'length', s.children is undefined" error
- Fixed YouTube video embedding in card modals - videos now display and play correctly in the main modal content area
- Added CSP (Content Security Policy) support for YouTube iframes by adding `frame-src` directive for youtube.com domains
- Fixed sidebar layout issues where tabs were cramped when viewing YouTube cards
- YouTube cards now properly display in a 16:9 aspect ratio with responsive sizing
- Fixed notes modal scrolling - content now scrollable immediately without requiring mode selection

### Changed
- YouTube videos now embed directly in the main modal content area instead of appearing in a sidebar tab
- Simplified YouTube card layout by removing redundant Reader and Summary tabs for video content
- Modal width now automatically adjusts for YouTube content (max-w-6xl) for optimal viewing experience
- Notes modal now has consistent sizing (max-w-3xl, h-80vh) for all note cards
- Enhanced note editing experience with @uiw/react-md-editor integration

### Technical
- **Data Store Enhancements**: Extended data-store.ts to support Den Pawkits with `inDen` parameter
  - `addCollection()` now routes to `/api/den/pawkits` when `inDen: true`
  - `updateCollection()` and `deleteCollection()` automatically detect Den collections and use correct API endpoint
  - All operations maintain local-first pattern: IndexedDB → Server sync
- Added npm packages: @uiw/react-md-editor, remark-wiki-link
- Created utilities: wiki-link-parser.ts, tag-extractor.ts
- Created components: enhanced-editor.tsx, backlinks-panel.tsx
- Added Prisma models: NoteLink, NoteCardLink, NoteTag
- Created server utilities: note-links.ts for managing relationships
