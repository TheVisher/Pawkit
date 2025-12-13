# Changelog

All notable changes to Pawkit will be documented in this file.

## December 8, 2025

### Added
- **Dynamic Accent Colors**: Accent colors now fully dynamic across the entire app

### Fixed
- **Rediscover Animation**: Smooth card transitions using requestAnimationFrame for proper browser paint sync
- **Orbiting Cards**: Fixed bunching issues, varied speeds, proper file image loading

---

## December 7, 2025

### Added
- **Serendipity Mode**: MyMind-inspired Rediscover experience with orbiting background cards
- **Glass UI Effect**: Classic Purple theme with glass/transparency styling
- **Drag-and-Drop to Pawkits**: Drag cards directly into Pawkits from masonry view
- **Trash Popover**: Quick access to deleted items from sidebar
- **Custom Card Order**: Persist drag order in masonry view
- **Batch System for Rediscover**: Review 25 cards at a time with Start Over button

### Changed
- Simplified Rediscover to Keep/Forget actions with kept cards panel
- Separated Glass UI and Surface Tint into independent settings
- Cards show at natural aspect ratio in Rediscover

### Fixed
- Ghost card behavior during drag-and-drop (z-index, coordinates, drift)
- Light mode support for Glass UI and Purple tint
- Pinned notes limit and stale ID cleanup

---

## December 6, 2025

### Added
- **Muuri Masonry Layout**: Professional masonry grid with drag-and-drop support
- **Responsive Card Widths**: Cards adapt to screen size with consistent edge padding

### Changed
- Dark mode colors updated to neutral grays
- Card modal redesigned with segmented pill control instead of tabs

### Fixed
- Muuri initialization timing and layout stability
- Card flash prevention when adding new cards
- Grid reflow during sidebar animations

---

## December 5, 2025

### Added
- **Settings Page Redesign**: Dedicated Settings page with two-column layout
- **Neumorphic-Lite UI**: Fresh design system across the app
- **Per-Pawkit Settings**: Individual view settings for each Pawkit
- **Tags Expansion**: Expandable tags section in Library sidebar

### Changed
- Theme toggle moved to right sidebar
- Help Center redesigned with neumorphic-lite styling

### Fixed
- Holiday filter respects user selection and enabled countries
- Light mode contrast improvements

---

## December 4, 2025

### Security
- Updated Next.js to 15.5.7 for CVE-2025-29927 and CVE-2025-55182 fixes

### Fixed
- PDF reader zoom no longer causes page overlap
- Blob URLs allowed in CSP for PDF preview

---

## December 3, 2025

### Security
- **Rate Limiting**: Added to all API endpoints
- **Cloudflare Turnstile**: CAPTCHA protection on auth forms
- **Zod Validation**: Input validation on API routes
- **File Upload Hardening**: Stricter validation for uploads
- **Token Revocation**: Improved session security

---

## December 2, 2025

### Added
- **Storage Strategy Settings**: Configure cloud sync routing preferences
- **Backup Behavior Settings**: Smart delete flow with configurable behavior

### Fixed
- Mobile responsiveness improvements
- Storage strategy applied to file uploads

---

## December 1, 2025

### Added
- **Dropbox Integration**: Full cloud storage provider support
- **OneDrive Integration**: Full cloud storage provider support
- **Cloud Drives UI**: Browse and manage cloud storage with tree view
- **Drive Explorer Split View**: Side-by-side file browsing

### Changed
- Consolidated settings into Profile Modal

### Fixed
- Custom thumbnails sync to devices without images
- Cloud provider connection UI improvements

---

## November 30, 2025

### Added
- **Google Drive Sync**: Full folder structure sync with deletion support
- **Dual-Pane Markdown Editor**: Live preview side-by-side editing
- **Save Shortcut**: Cmd+S keyboard shortcut for notes

### Fixed
- Cursor jump prevention during auto-save
- Save on close behavior (not during typing)

---

## November 29, 2025

### Added
- **Direct Filen Uploads**: Browser-to-Filen using Web Crypto API for unlimited file sizes
- **Note Import**: Import .txt and .md files as native notes
- **Manual Sync Button**: Trigger Filen sync with dirty notes indicator
- **Orphan File Cleanup**: Utility to clean up orphaned cloud files
- **Show Metadata Toggle**: Control metadata visibility in Notes view

### Changed
- Cloud folder structure refactored for multi-provider support
- Grid cards no longer stretch to match tallest in row

### Fixed
- Filen deletion sync for cards and notes
- Uniform card sizes in Grid view
- Notes metadata moved to separate section below card

---

## November 28, 2025

### Added
- **Onboarding Tour**: Guided tour for new users with welcome banner
- **Landing Page Ticker**: Animated feature showcase

### Fixed
- Tour positioning and z-index issues
- Auth timing for onboarding check

---

## November 27, 2025

### Added
- **Calendar Events in Home**: This Week widget shows calendar events and holidays
- **PDF Filter**: Dedicated filter for PDF content type

---

## November 26, 2025

### Added
- **File Attachments System**: Local-first file storage with cloud sync
- **PDF Viewer**: Inline PDF preview with zoom controls and Reader mode
- **Filen Cloud Integration**: Full authentication and file sync
- **Release Date Extraction**: Auto-extract dates from bookmarks with calendar integration
- **Connectors Tab**: Manage cloud providers in Profile Settings

### Fixed
- PDF thumbnail generation
- File card persistence across refreshes
- 2FA detection for Filen authentication

---

## November 25, 2025

### Added
- **Recurring Events**: Full recurring event management with multi-day support
- **US Federal Holidays**: Calendar toggle for federal holidays
- **Date Extraction**: Automatic date extraction from bookmarks
- **Supabase Sync for Events**: Calendar events sync across devices

### Changed
- Rediscover moved to left sidebar for better discoverability
- Keep action now persists (cards don't reappear in queue)

### Fixed
- Calendar recurring events and 12-hour time format
- Card modal image sizing

---

## November 24, 2025

### Added
- **Manual Thumbnail Override**: Set custom thumbnails in card detail modal
- **JSON-LD Extraction**: Better thumbnail detection from structured data
- **Browser Extension OAuth**: Secure auth flow for extension

### Fixed
- Chrome extension CORS handling
- Ultrawide monitor card rendering
- Compact card display when metadata is off

---

## November 23, 2025

### Added
- **Reader Mode**: Distraction-free reading experience
- **Pinned Notes**: Pin important notes to sidebar
- **Omnibar Search**: Universal search across all content
- Mobile UI refinements

---

## November 17, 2025

### Technical
- Comprehensive TypeScript type safety improvements
- Removed explicit JSX return types causing build errors

---

## November 15, 2025

### Added
- **Global Toast System**: Standardized toast notifications across entire app
- Comprehensive feedback for all user operations

### Fixed
- Toast positioning for ultra-wide monitors
- Duplicate URL detection with user feedback

---

## November 14, 2025

### Security
- Comprehensive security audit fixes

### Performance
- Removed unused AppSidebar component
- Optimized sidebar re-renders with selective Zustand subscription
- Gallery callbacks optimized with useCallback
- IndexedDB indexes on 'deleted' field for 10x query speedup

### Fixed
- Duplicate URL detection with proper user feedback
- ProfileModal re-rendering when closed

---

## November 13, 2025

### Added
- **Universal Todo List**: Todo section in right sidebar
- **Hierarchical Tag Inheritance**: Sub-pawkits inherit parent tags
- **Home View Control Panel**: Sidebar switching controls

### Changed
- Standardized sidebar configuration between Pawkits and Notes
- List view columns standardized across all views
- Folder emoji icons replaced with Lucide Folder icons

### Fixed
- Duplicate note creation prevention
- Recently Viewed cards open modal instead of filtering

---

## November 12, 2025

### Fixed
- **Deletion Sync**: Fixed items resurrecting during sync
- Sub-pawkit deletion now persists to IndexedDB
- Active device priority and lightweight sync check
- Deleted collections now properly filtered from UI

---

## November 6, 2025

### Added
- **React Native Mobile App**: Initial Expo-based mobile app

---

## November 3, 2025

### Fixed
- Various React component fixes
- Sign Out flow improvements

---

## October 22-31, 2025

### Added
- **PKM Features (Personal Knowledge Management)**
  - Enhanced Markdown Editor with toolbar, syntax highlighting, and keyboard shortcuts
  - Wiki-Style Note Linking using `[[Note Title]]` syntax
  - Note-to-Bookmark Linking using `[[card:Title]]` or `[[URL]]` syntax
  - Bidirectional Backlinks in References tab
  - Tag System with auto-extract hashtags (`#tag` syntax)
  - Tag Filtering for notes

### Fixed
- **Critical: Local-First Architecture Violations** - Fixed components bypassing IndexedDB
- **Critical: Sidebar Crash** - Fixed null reference errors after PostgreSQL migration
- YouTube video embedding in card modals
- Notes modal scrolling behavior

### Changed
- YouTube videos embed directly in main modal content area
- Modal width auto-adjusts for YouTube content
- Enhanced note editing with @uiw/react-md-editor

### Technical
- Data Store enhancements for Den Pawkits with `inDen` parameter
- New Prisma models: NoteLink, NoteCardLink, NoteTag
- New utilities: wiki-link-parser.ts, tag-extractor.ts
