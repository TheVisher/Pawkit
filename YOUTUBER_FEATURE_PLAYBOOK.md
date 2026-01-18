# PAWKIT: Complete Feature Playbook for YouTuber Reviews

> **Purpose:** This comprehensive guide documents EVERY feature in Pawkit so reviewers don't miss any key functionality when creating content. Use this as a checklist and script reference.

---

## Table of Contents

1. [Omnibar (Top Control Panel)](#omnibar)
2. [Card System](#card-system)
3. [Card Detail Modal](#card-detail-modal)
4. [Library & File Management](#library--file-management)
5. [Tags System](#tags-system)
6. [Todo System](#todo-system)
7. [Calendar System](#calendar-system)
8. [Right Sidebar](#right-sidebar)
9. [Navigation & Routing](#navigation--routing)
10. [Settings](#settings)
11. [Drag & Drop](#drag--drop)
12. [Keyboard Shortcuts](#keyboard-shortcuts)
13. [Editor & Rich Text](#editor--rich-text)
14. [Context Menus](#context-menus)
15. [Sync & Cloud Storage](#sync--cloud-storage)
16. [Home Page Widgets](#home-page-widgets)
17. [Special Features & Hidden Gems](#special-features--hidden-gems)
18. [Top 10 Features to Highlight](#top-10-features-to-highlight)

---

## Omnibar

**Location:** Top center of the application

### Core States
- **Compact Mode**: Minimized (140px width) showing only icons
- **Expanded Mode**: Full width (400px) with search/content visible
- **Toast Mode**: Shows notifications at top
- **Bulk Actions Mode**: When multiple cards selected
- **Idle Content**: Default state with search input

### Three Operating Modes

#### 1. Search Mode (`Cmd/Ctrl+K`)
- Global command palette for cards, collections, and actions
- Debounced search (150ms) for performance
- Keyboard navigation: Arrow Up/Down to select, Enter to execute
- Escape to close
- Click outside to close (smart detection excludes menus)
- Auto-collapses on scroll if empty
- Auto-collapses after 5 seconds of inactivity

#### 2. Add Mode (+ button dropdown)
**Card Types Available:**
- Bookmark
- Note
- Contact
- Todo
- Subscription
- Recipe
- Reading
- Project
- Upload File
- Event
- New Tag
- New Pawkit

**Features:**
- Keyboard navigation: Arrow Up/Down, Enter to create
- Each type opens modal or creates with default template+tags
- Supertag templates automatically applied

#### 3. Kit Mode (Coming Soon - AI Chat Assistant)
- New Chat option
- Recent chat history shortcuts

### Quick Note Mode
- Textarea auto-expands as you type (max 160px height)
- `Cmd/Ctrl+Shift+N` shortcut activates quickly
- Supports markdown formatting
- Save with `Cmd/Ctrl+Enter` or blur
- Discard with dialog confirmation if content exists
- **Hidden Feature:** Pasting a URL/domain auto-activates quick note and pre-fills URL

### Search Result Types
- **Cards**: Full-text search on title, description, content, domain
- **Collections** (Pawkits): Fuzzy search on names
- **Actions**: Searchable commands (New Note, Toggle Theme, etc.)
- **Tags**: When on tags page, filters tags dynamically

### Prefix Commands
| Prefix | Mode | Description |
|--------|------|-------------|
| `/` | Command mode | Searchable actions |
| `#` | Tag mode | Search/create tags on tags page |
| `@` | Collection mode | Search collections/Pawkits |

---

## Card System

### Card Types

| Type | Description | Key Features |
|------|-------------|--------------|
| **Bookmark** (url) | URL with metadata | Thumbnail, favicon, dominant color, link health tracking |
| **Markdown Note** (md-note) | Rich text editor | TipTap editor, slash commands, mentions, wiki-links |
| **Text Note** (text-note) | Plain text | No formatting |
| **File Card** (file) | File with preview | Cloud sync status tracking |

### Card Metadata
- Title, description, content, notes
- Tags (Pawkit membership + user tags + system tags)
- Pinned status
- Scheduling (scheduledDate, scheduledDates array, startTime, endTime)
- Status: PENDING, READY, ERROR
- Created/Updated timestamps
- Sync status (_synced, _deleted, _lastModified, _serverVersion)

### Card Display Variants
- **Grid View**: Masonry layout with thumbnail, glass-morphism pill overlay, metadata footer
- **List View**: Table with sortable/resizable columns, inline editing

### Card Actions (Right-click Context Menu)
- Pin/unpin
- Mark as read/unread
- Delete (soft delete to trash)
- Move to collection
- Duplicate
- Copy URL to clipboard
- Add to calendar
- View in reader mode

### Card Interactions
- Click to open detail modal
- Click thumbnail to view full image
- Click tags to filter by tag
- Click system tags to apply filters
- Double-click title to edit (list view)
- Drag cards to collections
- Keyboard: Escape to close detail, arrows to navigate

---

## Card Detail Modal

### Mobile Behavior
- Drawer from bottom (96% height)
- Swipe down to close
- Smooth animations

### Desktop Behavior
- Centered modal (max 5xl width)
- Right sidebar aware (positions around it)
- Close with Escape key
- Click backdrop to close

### Tabs in Detail View
1. **Content Tab**: Editor for notes, article content, or display
2. **Metadata Tab**: Title, description, tags, scheduling
3. **Photos Tab**: Thumbnail, cover image picker (for contact cards)
4. **Notes Tab**: User annotations on the card

### Functionality
- Inline editor for notes with full toolbar
- Metadata editing (title, description)
- Tag management with autocomplete
- Schedule date/time picker
- Read progress tracking
- Manual read/unread toggle
- Reading time estimation from word count
- Export highlights to notes
- Article content extraction and editing

---

## Library & File Management

### Views
- **Grid View** (Masonry): Cards with thumbnails, responsive layout
- **List View** (Table): Columns for name, type, created, modified, scheduled, tags, collections

### Features
- Bulk selection (checkbox per card, select-all header)
- Bulk actions: Delete, Add to collection, Update tags
- Multi-select with Shift+Click
- Drag to select range
- Right-click context menus on cards

### List View Columns (Customizable)
- Name (with icon and type indicator)
- Type (url, note, file)
- Created date
- Modified date
- Scheduled date
- Tags
- Collections
- Actions (inline buttons)

### Column Features
- Drag to reorder columns
- Resize columns with drag handle
- Show/hide toggles per column
- Sort by any column (ascending/descending)
- Persist column preferences in LocalStorage

### Inline Editing (List View)
- Title - click to edit, blur to save
- Tags - inline tag input with autocomplete
- Collection - dropdown selector
- Scheduled date - date picker
- Delete - inline button

---

## Tags System

### Tag Architecture
| Type | Description |
|------|-------------|
| **User Tags** | Custom tags for organization |
| **Pawkit Tags** | Collection membership (stored as tags) |
| **System Tags** | Auto-generated from card state |
| **Supertags** | Special template tags |

### System Tags
- `read`, `unread` - Reading status
- `scheduled`, `due-today`, `overdue` - Schedule state
- `daily-note` - Daily note marker
- `todo` - Todo items (with unchecked task detection)
- `conflict` - Sync conflict marker
- Reading time buckets: `reading-1min`, `reading-5min`, `reading-15min`, `reading-30min`, `reading-1hour`

### Tag Features
- **Custom Colors**: HSL-based color picker per tag
- **Color Presets**: Quick-select preset hues
- **Custom Hex Input**: Enter any hex color
- **Reset to Auto**: Remove custom color
- **Tag Hierarchy**: Nested tags with `/` separator (parent/child)
- **Tag Stats**: Count of cards per tag
- **Autocomplete**: When typing in inputs
- **Recent Tags**: Quick access to frequently used tags

### Tags Page (/tags)
- Wall layout: Cards grouped by tag
- Sidebar tree view of tag hierarchy
- Filter by tag
- Create new tag directly
- Tag settings (color picker)
- Rename/delete tags
- Keyboard shortcut: # prefix in search to filter tags
- Similar tag warnings on creation

### Supertag Templates
| Supertag | Description |
|----------|-------------|
| `contact` | Name, email, phone, address fields |
| `todo` | Markdown checklist format |
| `recipe` | Ingredients and instructions sections |
| `subscription` | Service, cost, renewal date fields |
| `reading` | Book/article metadata sections |
| `project` | Project structure with tasks |

---

## Todo System

### Features
- Auto-detection of unchecked tasks in note content
- Checkbox detection: `[ ]` indicates unchecked task
- Checkbox format: `[x]` = checked, `[ ]` = unchecked
- Smart conversion: Can convert bookmarks with tasks to todos
- Dismiss suggestion: Hide auto-conversion suggestion permanently
- Todo tag: Cards with `todo` tag are marked as todos

### Overdue Detection
- Checks scheduled date vs current date
- Applies `overdue` system tag to past due items
- Shows visual indicator on cards
- Filters available (overdue cards)
- Can exclude from overdue (tag: `exclude-from-overdue`)

### Task Format
```markdown
- [ ] Task description (unchecked)
- [x] Completed task (checked)
```

---

## Calendar System

### Views
1. **Month View**: Grid of days with event indicators
2. **Week View**: 7 days horizontal with time slots
3. **Day View**: Single day with hourly breakdown
4. **Agenda View**: List of upcoming events

### Features
- Multi-date scheduling: Cards can be scheduled for multiple dates
- Time scheduling: scheduledStartTime and scheduledEndTime
- Calendar sidebar (right panel when toggled)
- Mini calendar for date navigation
- Event display on cards
- Click date cell to create/view events
- Color coding by card type
- Today indicator (bold, highlighted)

### System Tags for Scheduling
- `scheduled` - Has a future date
- `due-today` - Scheduled for today
- `overdue` - Scheduled in past

---

## Right Sidebar

### Modes
1. **Settings Panel** (Default)
2. **Display Settings**
3. **Filter Panel**
4. **Supertag Panel**
5. **Calendar Sidebar**

### Settings Panel
- Card display customization
- Card size slider (small to xl)
- Card padding/spacing control
- Show/hide titles, URLs, tags
- Show/hide metadata footer
- Toggle thumbnail display

### Filters
- **By Content Type**: Notes, bookmarks, files
- **By Read Status**: Read, unread, in progress
- **By Tags**: Multi-select tag filter
- **By Schedule**: Scheduled, overdue, due today
- **Advanced Filters**: Combination of above
- Quick filter presets
- Clear all filters button

### Display
- Sort options: Date (created/modified), title, reading time
- Sort direction: Ascending/descending
- Layout choice: Grid, masonry, list
- Backlinks section: Cards that reference this card
- Grouping options: By tag, by status, by date

---

## Navigation & Routing

### Main Pages

| Page | Path | Description |
|------|------|-------------|
| **Home** | /home | Dashboard with widgets |
| **Library** | /library | All cards in workspace |
| **Pawkits** | /pawkits | Collection management |
| **Pawkit Detail** | /pawkits/[slug] | Cards in specific collection |
| **Calendar** | /calendar | Multi-view calendar |
| **Tags** | /tags | Tag wall view |
| **Trash** | /trash | Soft-deleted cards |

### Home Page Widgets
- Today's scheduled cards
- Bills widget
- Continue reading widget
- Daily log widget
- Stats banner (total cards, unread, etc.)

### Mobile Navigation
- Mobile menu drawer
- Mobile view options
- Responsive modals
- Bottom sheet drawers

---

## Settings

### Appearance Section
- **Visual Style**: Glass, Flat, High Contrast
- **Theme Mode**: Light, Dark, System
- **Accent Color**: 12+ preset hues with custom picker
- **Custom Hex Input**: For exact colors
- **Saved Colors**: Save/apply custom colors
- **Background Presets**: Different visual backgrounds
- **Video Auto-Resume**: Toggle auto-resume for videos

### Account Section
- User profile
- Email management
- Authentication status
- Workspace selection
- Logout

### Data Section
- Cloud storage integration status
- Sync status indicator
- Manual sync trigger
- Data export options
- Data import
- Workspace management
- Cleanup tools

---

## Drag & Drop

### Card Dragging
- Drag card from library to pawkit sidebar
- DND Kit integration
- Drop zone highlights on valid targets
- Toast confirmation: "Added to [Collection]"

### URL Normalization for Drag
- Tracks URLs being dragged internally
- Prevents re-adding same card from external drag
- Removes tracking parameters (UTM, fbclid, etc.)
- 2-second grace period for edge cases

### Column Dragging (List View)
- Reorder columns by dragging header
- Visual feedback during drag
- Drop to position

---

## Keyboard Shortcuts

### Global
| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl+K` | Open omnibar/search |
| `Cmd/Ctrl+Shift+N` | New note |
| `Cmd/Ctrl+Shift+B` | New bookmark |
| `Escape` | Close modal, dialog, or search |

### In Search/Omnibar
| Shortcut | Action |
|----------|--------|
| `Arrow Up/Down` | Navigate results |
| `Enter` | Execute/open selected |
| `Escape` | Close search |
| `/` prefix | Command mode |
| `#` prefix | Tag mode |
| `@` prefix | Collection mode |

### In Editor
| Shortcut | Action |
|----------|--------|
| `/` | Slash commands menu |
| `Cmd/Ctrl+B` | Bold |
| `Cmd/Ctrl+I` | Italic |
| `Cmd/Ctrl+\`` | Code |
| `Cmd/Ctrl+K` | Link |
| `Cmd/Ctrl+Enter` | Save quick note |

### Slash Commands in Editor
| Command | Result |
|---------|--------|
| `#` | Heading 1 |
| `##` | Heading 2 |
| `###` | Heading 3 |
| `-` | Bullet list |
| `1.` | Numbered list |
| `[]` | Todo/task list |
| `>` | Blockquote |
| ` ``` ` | Code block |
| `/table` | Insert table |

---

## Editor & Rich Text

### TipTap Extensions
- StarterKit (paragraphs, headings, lists)
- Link detection & editing
- Task lists with checkboxes
- Tables (insert, edit cells)
- Typography (smart quotes, dashes)
- Global drag handle (reorder blocks)
- Custom phone number linking
- Mention support (@references)
- Placeholder text

### Formatting Toolbar
- Bold, Italic, Code, Link buttons
- Appears on text selection
- Smart positioning (tooltip-like)
- Table editing within modal

### Mentions System
- Type `@` to mention cards
- Autocomplete dropdown
- Recent mentions
- Search by title
- Click to open referenced card
- Reference tracking (backlinks)

---

## Context Menus

### Content Area (Right-click on empty space)
- New Bookmark
- New Note
- Paste from clipboard (auto-detects URL vs text)

### Sidebar (Right-click sidebar area)
- New Pawkit (prompts for name)
- Open Trash

### Card Context Menu (Right-click card)
- Pin/unpin
- Mark as read/unread
- Delete
- Move to collection
- Duplicate
- Copy URL
- Add to calendar
- View full size (for images)

---

## Sync & Cloud Storage

### Features
- Local-first architecture with IndexedDB
- Supabase backend sync
- Real-time updates via WebSocket
- Conflict detection (_serverVersion comparison)
- Soft delete (not permanent removal)
- Sync queue tracking
- Offline support (works without connection)
- Auto-sync on schedule
- Manual sync trigger
- Sync status indicator (in card display)

### Sync Metadata
| Field | Description |
|-------|-------------|
| `_synced` | Boolean, whether sent to server |
| `_lastModified` | Local timestamp |
| `_deleted` | Soft delete flag |
| `_serverVersion` | For conflict detection |
| `_localOnly` | Created offline flag |

### Cloud Integrations (Coming)
- Filen support
- Google Drive support
- Dropbox support
- OneDrive support

---

## Home Page Widgets

| Widget | Description |
|--------|-------------|
| **Stats Banner** | Total cards, unread count, to-read count |
| **Scheduled Today** | Cards due today |
| **Bills Widget** | Subscription cards |
| **Continue Reading** | In-progress articles |
| **Daily Log** | Today's notes/entries |
| **Todo Widget** | Unchecked tasks |

---

## Special Features & Hidden Gems

### Quick Features
1. **Link Health Checking**: Periodic checks on bookmark URLs, tracks status (ok, broken, redirect)
2. **Reading Progress Tracking**: Scroll position saved, reading time estimated
3. **Auto-Read Toggle**: Mark read after 15+ seconds in modal (unless manually marked unread)
4. **Image Optimization**: Dominant color extraction, blur data URI, aspect ratio for layout stability
5. **Word Count**: Calculated for articles, used for reading time estimation
6. **Article Extraction**: Content parsing from URLs
7. **Thumbnail Gallery**: Multiple images per card for product pages
8. **Favicon Display**: Bookmark domain icon display
9. **Daily Notes**: Special cards marked with `isDailyNote` flag, date-organized
10. **Reference/Backlinks**: Track @ mentions between cards (reciprocal linking)

### Smart Detection
- Todo detection (unchecked tasks)
- URL paste handling (auto-populate quick note)
- Metadata extraction from URLs
- Duplicate URL detection (normalized comparison)

### Performance Optimizations
- Memoized card components
- Debounced search (150ms)
- Virtual scrolling ready
- Image lazy loading
- Layout cache for masonry grid
- Web Worker for image color extraction
- Dexie IndexedDB for local persistence

### Mobile-Specific Features
- Responsive card grids
- Bottom sheet drawers
- Touch-friendly controls
- Swipe gestures
- Mobile menu drawer
- Larger tap targets
- Long-press for context menus

---

## Top 10 Features to Highlight

1. **Omnibar**: Universal search + quick actions + add menu
2. **Card Types**: Bookmarks, notes, contacts, todos, with auto-detection
3. **Tagging System**: Custom colors, hierarchy, supertags with templates
4. **Calendar**: Multi-view scheduling with smart date detection
5. **Smart Todo Detection**: Auto-converts task-heavy content to todos
6. **List View**: Customizable columns, inline editing, drag reordering
7. **Reading Tracking**: Progress saving, time estimation, auto-read toggle
8. **Keyboard Shortcuts**: Cmd+K search, Cmd+Shift+N/B creation, slash commands
9. **Customization**: Theme, accent colors, visual styles, card display settings
10. **Local-First Sync**: Offline-capable with cloud sync, conflict detection

---

## Most Powerful Hidden Features

| Feature | Description |
|---------|-------------|
| URL paste detection | Auto-opens omnibar with URL |
| Keyboard-driven workflow | Search + creation + navigation all via keyboard |
| Sidebar right-click | Quick Pawkit creation |
| Tab/column customization | Power user table customization |
| Slash commands in editor | `/` for formatting |
| @ mentions | Linking cards with backlinks |
| Multi-date scheduling | Schedule cards for multiple dates |
| Link health checking | Broken link detection |
| Custom tag colors | Per-tag HSL customization |

---

*This comprehensive documentation covers every feature, interaction, keyboard shortcut, and edge case in the Pawkit application. Perfect for YouTuber reviews!*
