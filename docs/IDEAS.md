# Pawkit Ideas Bank

> **Unfiltered collection of all feature ideas**
> **Consolidated from**: V1 roadmap (32KB), V1 SKILL.md (124KB), chat history, brainstorms
> **Status**: Ideas only - see [ROADMAP.md](./ROADMAP.md) for prioritized implementation plan

---

## Table of Contents

1. [Connected Platforms](#1-connected-platforms)
2. [Knowledge Capture & Topic Notes](#2-knowledge-capture--topic-notes)
3. [AI Features (BYOAI)](#3-ai-features-byoai)
4. [Kit AI Assistant](#4-kit-ai-assistant)
5. [Quick Notes System](#5-quick-notes-system)
6. [Note Organization](#6-note-organization)
7. [Rediscover Mode Evolution](#7-rediscover-mode-evolution)
8. [Research Mode (Split View)](#8-research-mode-split-view)
9. [Continuous Reading Queue](#9-continuous-reading-queue)
10. [Cloud Storage & Sync](#10-cloud-storage--sync)
11. [Calendar & Reminders](#11-calendar--reminders)
12. [Browser Extension](#12-browser-extension)
13. [Import & Export](#13-import--export)
14. [Knowledge Graph](#14-knowledge-graph)
15. [Performance](#15-performance)
16. [Mobile App](#16-mobile-app)
17. [Monetization](#17-monetization)
18. [Analytics & Insights](#18-analytics--insights)
19. [Card Modal Enhancements](#19-card-modal-enhancements)
20. [Onboarding & User Experience](#20-onboarding--user-experience)
21. [Accessibility Features](#21-accessibility-features)
22. [Theme & Appearance Customization](#22-theme--appearance-customization)
23. [Developer API & Webhooks](#23-developer-api--webhooks)
24. [Background Job Infrastructure](#24-background-job-infrastructure)
25. [Testing Infrastructure](#25-testing-infrastructure)
26. [Error Tracking & Observability](#26-error-tracking--observability)
27. [User Feedback System](#27-user-feedback-system)
28. [Power User Features](#28-power-user-features)
29. [Note Templates & Snippets](#29-note-templates--snippets)
30. [Canvas & Whiteboard Mode](#30-canvas--whiteboard-mode)
31. [Version History & Rollback](#31-version-history--rollback)
32. [Miscellaneous](#32-miscellaneous)

---

## 1. Connected Platforms

### The Vision

```
SAVE → ORGANIZE → CONSUME & CAPTURE → KNOWLEDGE
─────────────────────────────────────────────────
Reddit ──┐
YouTube ─┼──→ Connected ──→ Rediscover ──→ Topic Notes
Twitter ─┤    Sources       (queue +       (knowledge
Web ─────┘                   capture)       accumulates)
```

**The Problem**: People save content across platforms and never revisit it. No cross-platform search. Knowledge is lost.

### Reddit Integration

- [ ] OAuth flow - Connect Reddit account
- [ ] Import saved posts - Pull all with metadata (thumbnails, scores, comments)
- [ ] Auto-tag by subreddit - r/programming → #programming
- [ ] Bulk unsave - Remove from Reddit after importing
- [ ] Bypass 1000 limit - Archive everything (Reddit only shows last 1000)
- [ ] Rediscover for Reddit - Triage years of saved posts

**Why Reddit is great**: Official OAuth, rich metadata, unsave endpoint, your users have years of saved content.

### YouTube Integration

- [ ] OAuth flow - Connect YouTube/Google account
- [ ] Import playlists - User-created playlists (not Watch Later - Google blocks API)
- [ ] Create playlists from Pawkit - Pawkit collection → YouTube playlist
- [ ] Add videos to playlists - One-click save to both Pawkit + YouTube
- [ ] Remove videos - Bulk select → remove from YouTube
- [ ] Workaround for Watch Later - Create "My Watch Later" playlist

**The UX improvement**:
```
Current YouTube:     Save = 4 clicks. Delete = each video individually.
With Pawkit:         One-click save. Bulk select + remove. Syncs back.
```

### Video Platform Embeddings (Beyond YouTube)

| Platform | Approach |
|----------|----------|
| TikTok | OG tags or iframe embedding |
| Instagram Reels | Instagram's embed.js |
| Vimeo | Professional video with transcripts |
| Twitter/X Video | Embed video tweets |
| Twitch VODs | Gaming/streaming content |

**Technical approach**:
- `yt-dlp` for transcript extraction (supports 1000+ sites)
- Platform-specific embed methods for playback
- Unified video player interface across all platforms

**Features**:
- [ ] Multi-platform video transcripts
- [ ] Consistent embed experience
- [ ] Timestamp capture across platforms
- [ ] Download for offline (where legal)

### Twitter/X Integration

- [ ] Import bookmarks - OAuth or file-based (JSON export from browser script)
- [ ] Full metadata - Tweet text, author, timestamp, media URLs
- [ ] Auto-tag by author - Group tweets by poster

**Note**: API requires developer approval. Start with file-based import.

### Hacker News Integration

- [ ] Import saved/upvoted - Scrape logged-in web interface
- [ ] Metadata - Title, URL, points, comments, HN discussion link
- [ ] Target demographic - Your exact users

### GitHub Stars Import & Sync

**Why**: Developers star 100s of repos and never revisit them.

- [ ] Import starred repositories - Developers' bookmark system
- [ ] Auto-tag by language - Python, JavaScript, Rust, etc.
- [ ] Auto-tag by topic - Machine learning, web dev, DevOps
- [ ] Sync on schedule - Keep updated automatically
- [ ] Repository metadata - Stars count, last updated, description
- [ ] README preview - See project docs inline

### RSS Feed Reader Integration

**Philosophy**: Privacy-conscious, open web, no tracking.

- [ ] Subscribe to RSS feeds within Pawkit
- [ ] OPML import from Feedly, Inoreader, NetNewsWire
- [ ] Discover → Save → Organize → Rediscover workflow
- [ ] Folder organization for feed subscriptions
- [ ] Unread counts and mark-as-read

### Media Service Imports

**Pattern**: Trapped content in single-purpose apps → liberate to Pawkit.

| Service | Content Type |
|---------|--------------|
| Kindle Highlights | Book annotations |
| Goodreads/Letterboxd | Movies/books to watch/read |
| Steam Library | Game backlogs, wishlists |
| Spotify Library | Music collection, listening history |
| Trakt.tv | Movie/TV tracking |
| Podcast episodes | With show metadata |

### GitHub Connector (Detailed Spec)

**Problem**: Developers using AI workflows struggle to track documentation changes. Markdown files, Claude skills, and roadmaps are scattered with no unified interface.

**Solution**: Connect a GitHub repo to a Pawkit. Selected markdown files import as cards. Track AI-made changes visually.

#### Phase 1: Read-Only Import (MVP)

- [ ] Connect GitHub repo via OAuth
- [ ] Select paths to import (e.g., `README.md`, `docs/**/*.md`, `.claude/skills/**/*.md`)
- [ ] Import markdown files as cards into designated Pawkit
- [ ] Preserve folder structure as nested sub-pawkits
- [ ] Manual refresh button to pull latest
- [ ] Auto-fetch on Pawkit open

**User Flow**:
1. Create/open Pawkit
2. Settings → Connect GitHub Repository
3. Select repo → Choose paths
4. Import creates cards for each file
5. Click card to read rendered markdown

#### Phase 2: Diff Highlighting

- [ ] Store previous version when fetching
- [ ] Detect changes between versions
- [ ] Show diff view (green additions, red deletions)
- [ ] Display commit context (message, author, timestamp)
- [ ] Badge on cards: "Updated since last viewed"

**UI Elements**:
- Tab toggle: Rendered | Diff | Raw
- "Updated X minutes ago" indicator
- Commit message preview

#### Phase 3: Two-Way Sync (Future)

- [ ] Edit markdown in Pawkit
- [ ] Local saves to IndexedDB (automatic)
- [ ] Manual "Push to GitHub" action
- [ ] Batch changes into single commit
- [ ] Custom commit message input
- [ ] Conflict detection if remote changed

**Data Model**:
```typescript
interface GitHubConnection {
  id: string;
  pawkitId: string;
  repoOwner: string;       // "TheVisher"
  repoName: string;        // "Pawkit"
  branch: string;          // "main"
  syncPaths: string[];     // ["docs/**/*.md"]
  lastFetchedAt: Date;
}

interface GitHubFileCard extends Card {
  githubPath: string;
  githubSha: string;
  lastCommitMessage: string;
  lastCommitAuthor: string;
  previousContent?: string;  // For diff
}
```

**Why This Matters**:
- **Visibility** - See all project docs in one interface
- **AI Oversight** - Track what Claude Code changes
- **Organization** - Drag, nest, arrange docs
- **Dogfooding** - Use Pawkit to manage Pawkit

### Platform Scraping Tools

**Problem**: Some platforms (Twitter/X) have expensive or restricted APIs. Need alternatives.

| Tool | Purpose | Cost |
|------|---------|------|
| Browserbase | Headless browser for JS-heavy sites | Per-use |
| Firecrawl | Web scraping API, handles JS rendering | Per-page |
| Apify | Pre-built scrapers for Reddit, YouTube, etc. | Subscription |

**Twitter/X Challenge**:
- Official API: $100/mo minimum (Basic tier)
- Solution: User exports (Settings → Download Archive → Upload JSON to Pawkit)

**Strategy**:
- [ ] File export import for MVP - User uploads their data export
- [ ] Scraping tools if users demand convenience - Higher friction but no API costs
- [ ] Browserbase for stubborn platforms - When file export isn't available

**User Export Flows**:
| Platform | Export Method |
|----------|---------------|
| Twitter/X | Settings → Download Archive → data/bookmarks.js |
| Reddit | User Data Request → saved_posts.csv |
| YouTube | Google Takeout → YouTube/playlists/*.json |

---

## 2. Knowledge Capture & Topic Notes

### The Problem

You watch a YouTube video, see something brilliant at 14:32, think "I should remember this"... and forget it within a week.

### Topic Notes Solution

A Topic Note is a living document that grows as you consume related content.

**Citation blocks**:
```markdown
> "Every pixel should earn its place."
> — Design Course · YouTube · [14:32](youtube.com/...?t=872)
```

**Features**:
- [ ] YouTube timestamps - Click to jump to exact moment
- [ ] Reddit citations - Quote comments with post link
- [ ] Twitter citations - Embed tweet quotes
- [ ] Article citations - Quote with article link
- [ ] "Capture to Note" panel - Always visible in Rediscover
- [ ] Quick capture field - Auto-attaches current source + timestamp
- [ ] Note picker - Select existing Topic Note or create new
- [ ] Side panel option - Open Topic Note alongside content

**Visual in Note**:
```
## The 60-30-10 Color Rule

> "60% dominant, 30% secondary, 10% accent."
> — u/designerguy · r/web_design · [View post](reddit.com/...)

Works well with accessibility contrast requirements too.

> "Reduce your color palette to 2-3 colors max."
> — @steveschoger · Twitter · [View tweet](twitter.com/...)
```

**Source Tracking**:
- [ ] Sources panel in Topic Note - Shows all platforms/items cited
- [ ] Source indicators - "12 sources · 🎬 4 · 🤖 5 · 🐦 2 · 📄 1"

---

## 3. AI Features (BYOAI)

### Philosophy

Pawkit doesn't charge for AI. Users bring their own (ChatGPT, Claude, etc.). **"Your subscription, your data, your AI."**

### Phase 1: Smart Export + Paste-Back

**Copy to AI**:
- [ ] Select items → "Copy to AI" button
- [ ] Dropdown: "Organize & group", "Expand into notes", "Summarize themes", "Custom"
- [ ] Copies pre-written prompt + formatted notes for AI to respond

**What gets copied**:
```
Here are quick notes from my knowledge base. Please organize them
into logical groups and output in this EXACT format:

[PAWKIT_IMPORT]
## Group: Topic Name
- Note 1
- Note 2
[/PAWKIT_IMPORT]

NOTES TO ORGANIZE:
• Note content here...
```

**Paste-Back Parser**:
- [ ] "Import AI Response" button
- [ ] Paste response with [PAWKIT_IMPORT] tags
- [ ] Preview: "Create 3 notes in these topics?"
- [ ] One-click creates organized notes

### Phase 2: Extension Enhancement

- [ ] Extension detects chat.openai.com or claude.ai
- [ ] If response contains [PAWKIT_IMPORT], show "Import to Pawkit"
- [ ] One-click import from AI chat page

### Phase 3: Claude MCP Integration (Game Changer)

**How it works**:
```
User → Claude (their subscription) → MCP → Reads/writes to Pawkit
```

**User just chats with Claude**:
- "Organize my quick notes into topic groups"
- "Find everything about Svelte and create a Topic Note"
- "Auto-tag all my untagged bookmarks"
- "What have I saved related to this article?"
- "Summarize what I saved this week"

**MCP Tools to expose**:
- [ ] `pawkit_search` - Search bookmarks, notes, files
- [ ] `pawkit_get_item` - Get full details
- [ ] `pawkit_get_quick_notes` - Get all quick notes
- [ ] `pawkit_create_note` - Create new note
- [ ] `pawkit_update_note` - Update existing note
- [ ] `pawkit_add_tags` - Add tags to items
- [ ] `pawkit_create_folder` - Create note folder
- [ ] `pawkit_move_item` - Move to folder/pawkit
- [ ] `pawkit_delete_item` - Delete item
- [ ] `pawkit_get_related` - Find related items
- [ ] `pawkit_get_stats` - Activity stats
- [ ] `pawkit_create_event` - Create calendar event

**Why MCP is huge**:
- Zero AI costs (user's Claude subscription)
- Privacy-first (data to their Claude, not our servers)
- Always improving (Claude gets better, features get better)
- Natural language for everything
- Competitive moat (few apps have MCP yet)

### Embeddings for Cross-Platform Linking

- [ ] Generate embeddings on import (title + description + content)
- [ ] Store in Supabase with pgvector
- [ ] Find semantic similarity - Surface connections user never knew

**Cost**: ~$0.03 to embed 3,000 items (essentially free)

**What to Embed**:
| Platform | Content |
|----------|---------|
| Reddit | Title + selftext + subreddit |
| YouTube | Title + description + auto-transcript |
| Twitter | Tweet text + thread content |
| Articles | Title + extracted text |
| Notes | Full markdown content |

### Personalized Recommendations ("Your Algorithm, Uncorrupted")

**The Problem**: Platform algorithms get polluted by work searches, rabbit holes, accidental clicks.

**The Solution**: Pawkit only contains intentionally saved content. Pure signal, no noise.

- [ ] Interest profile from saves - Topic weights, recent saves higher
- [ ] Content discovery feed - Suggest new content from web
- [ ] "Discover" tab - Dedicated recommendations (not mixed with Library)
- [ ] Topic-based discovery - "Find more like this" in Rediscover
- [ ] Subreddit/channel suggestions - "You might like r/webdev"

**Privacy options**:
- [ ] Local embedding option (all-MiniLM-L6-v2)
- [ ] Cloud embedding option (OpenAI)
- [ ] Recommendations can be local-only

---

## 4. Kit AI Assistant

### Current Implementation

Kit is Pawkit's built-in AI (Claude Haiku), available in-app.

**Existing**:
- [x] Chat API (`/api/kit/chat`)
- [x] Summarize endpoint
- [x] Suggest tags endpoint
- [x] Rate limiting + usage tracking (`kit_usage` table)
- [x] Context building from user's library

### Kit Actions (Write Capabilities)

**Calendar Actions**:
- [ ] Create events from chat - "Remind me to check this Friday"
- [ ] Parse natural language - "this weekend", "next Tuesday", "in 3 days"
- [ ] Confirmation flow - "I'll add for tomorrow at 9am. Sound good?"
- [ ] Movie/show reminders - "Remind me when Avatar comes out"

**Example**:
```
User: "Remind me to read this article tomorrow"
Kit: "I'll add a reminder for tomorrow at 9am. Sound good? 📅"
User: "Make it 2pm"
Kit: "Done! Added 'Read: [article title]' for tomorrow at 2pm."
```

**Other Kit Actions**:
- [ ] Create bookmarks - "Save this URL to my Design Pawkit"
- [ ] Create notes - "Create a note about what we discussed"
- [ ] Add tags - "Tag this as 'read-later' and 'design'"
- [ ] Move items - "Move this to my Archive Pawkit"

### Kit Context Awareness

- [ ] Route-based context - In Library = search cards, in Notes = search notes
- [ ] View context indicator - "Searching Library" or "Searching Notes"
- [ ] Override capability - "Search my library for..." while in Notes

### Kit Performance

- [ ] Two-stage RAG - Send title index first, fetch details for relevant
- [ ] Embeddings - Semantic search via pgvector
- [ ] Caching - Cache library context for repeat queries

### Kit OCR (Auto Image Text Extraction)

**Flow**:
```
User uploads image → Filen → Kit extracts text → Stored in card metadata → Searchable offline
```

**Cost**: ~$0.04/month per 100 images (negligible)

**Use Cases**:
- Screenshots of paywalled articles
- Receipts and invoices
- Warranties and ToS
- Business cards
- Handwritten notes
- Instagram posts, tweets that might get deleted

**Intelligence Layer**:
- [ ] Summarize documents
- [ ] Extract structured data (dates, amounts, names)
- [ ] Auto-tag based on content
- [ ] Create calendar reminders from dates found
- [ ] Answer questions about uploaded docs later

---

## 5. Quick Notes System

### The Problem

Users jot quick one-line notes. They end up with 1000 single-line files. Cluttered.

### Solution: Quick Notes + Auto-Consolidation

**Quick Capture**:
- [ ] Quick Notes section in sidebar (or `⌘+Shift+N`)
- [ ] Frictionless - type and done
- [ ] NOT full notes - fleeting thoughts

**Consolidation**:
- [ ] Notes older than 7 days show in Rediscover: "Still relevant?"
- [ ] Actions: Delete, Keep (reset timer), Promote to full note, Merge into existing
- [ ] Weekly auto-archive: Unclaimed → "Week of Dec 8" note
- [ ] Nothing deleted - just auto-organized

**Sidebar structure**:
```
NOTES
├── 📁 My Folders
├── 📝 Quick Notes (7)        ← Current captures
├── ─────────────
├── 📁 Archive
│   ├── 📝 Week of Dec 8      ← Auto-consolidated
│   └── 📝 Week of Dec 1
```

---

## 6. Note Organization

### Note Folders

- [ ] `note_folders` table - Same pattern as Pawkits
- [ ] Nested hierarchy - Reuse Pawkit tree rendering
- [ ] `folder_id` on notes - Nullable, existing stay "Unfiled"
- [ ] Folder sidebar in Notes view

### Notes in Pawkits (Many-to-Many)

User might want a note about "UI/UX Design" alongside saved articles in "Design Resources" Pawkit.

- [ ] `pawkit_notes` junction table
- [ ] Notes have "home" folder - Primary in Notes view
- [ ] Notes can "appear in" Pawkits - Like aliases
- [ ] "Add to Pawkit" from note
- [ ] "Add Note" from Pawkit - Search existing or create new

```sql
-- Primary organization
ALTER TABLE notes ADD COLUMN folder_id UUID REFERENCES note_folders(id);

-- Many-to-many
CREATE TABLE pawkit_notes (
  pawkit_id UUID REFERENCES pawkits(id) ON DELETE CASCADE,
  note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  PRIMARY KEY (pawkit_id, note_id)
);
```

---

## 7. Rediscover Mode Evolution

### From Triage Tool to Consumption Interface

**Before**: "Here are random old bookmarks. Keep or delete?"
**After**: "Here's your content queue. Watch, read, dismiss. Let's go."

### Inbox Zero Mode

**Concept**: New cards automatically land in "Inbox" Pawkit by default.

**Flow**:
1. Save a link → lands in Inbox
2. User processes: Tag → File to Pawkit → or Trash
3. Gamified counter: "X items in inbox"
4. Goal: Hit zero regularly

**Why it works**:
- Reduces "everything in Library" overwhelm
- Creates clear processing workflow
- Satisfying like email inbox zero

**Competitive angle**: Like email inbox zero but for knowledge.

### Smarter Rediscover Filters

| Filter | Logic |
|--------|-------|
| **Never Opened** | `lastOpenedAt` is null |
| **Oldest Forgotten** | Saved 2+ years ago, never revisited |
| **Seasonal** | Things saved this time last year |
| **Frequently Opened** | Opened 5+ times - probably important |
| **Quick Wins** | Short articles (< 5 min read time) |

### Random Card / "Surprise Me"

**What**: Button that loads a random saved card.

- [ ] "Surprise me with something I saved"
- [ ] Filtered options: "Random article", "Random from 2023", "Random from this Pawkit"
- [ ] Dead simple feature, oddly satisfying
- [ ] Encourages rediscovery without algorithmic pressure

**Implementation**: Just `ORDER BY RANDOM() LIMIT 1` with optional filters.

### Source Picker

- [ ] Modal when opening - Inbox, YouTube, Reddit, Twitter, Library, Custom
- [ ] Filters - By subreddit, by tag, by content type, by date range
- [ ] Examples:
  - "Reddit saves from r/recipes older than 6 months"
  - "YouTube videos shorter than 10 minutes"
  - "Articles I saved this week"

### Content Consumption

- [ ] YouTube embeds - Watch videos directly
- [ ] Reddit rendering - Text = markdown, image = full, links = reader mode
- [ ] Twitter embeds - Render tweets inline
- [ ] Article reader mode - You already have Readability

### Actions

| Action | What it does |
|--------|--------------|
| **Skip** | Move to end, come back later |
| **Remove** | Delete + optionally unsave from source |
| **Keep** | Move to Library (or pick Pawkit) |
| **Open** | Open in new tab |

### The Killer Feature

While consuming in Rediscover, capture insights directly into Topic Notes.

---

## 8. Research Mode (Split View)

**Concept**: User is reading an article about UI design. They want to actively build their "UI Design Research" note while reading. Instead of switching back and forth, they work in a split view.

### UI Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Reader Mode                    │  Research Note            │
│  ─────────────────────────────  │  ───────────────────────  │
│                                 │  # UI Design Research     │
│  Article content here...        │                           │
│                                 │  ## Key Principles        │
│  [User highlights this text]    │  - Less is more           │
│  ════════════════════════════   │  - [cursor here]          │
│         ↓ drag to note          │                           │
│                                 │  > "The best interface    │
│                                 │  > is no interface"       │
│                                 │  > — Article Title        │
│                                 │                           │
└─────────────────────────────────────────────────────────────┘
```

### Features

- [ ] "Open Research Mode" button in reader toolbar
- [ ] Split view: Reader (left) + Note editor (right)
- [ ] Highlight in reader → drag to note position
- [ ] Auto-format as blockquote with source attribution
- [ ] Note auto-saves as you edit
- [ ] Resizable split panes
- [ ] Mobile: swipe between reader and note (no split)

### Entry Points

- Reader toolbar: "Research Mode" or "Take Notes" button
- Keyboard shortcut: `Cmd/Ctrl + Shift + N`
- Right-click highlight: "Open in Research Mode"

---

## 9. Continuous Reading Queue

**Priority**: Future | **Effort**: Medium-High

Allow users to stay in reader mode and continuously scroll through multiple articles without returning to the library.

### Concept

Instead of: read article → close → open next
Users can: scroll past end → seamlessly load next

**Queue sources**:
- **Tag-based**: All articles tagged "UI Design"
- **Pawkit-based**: All articles in a collection
- **Manual queue**: User-curated reading list
- **Smart queue**: Unread articles sorted by reading time

### Prior Art

| App | Implementation |
|-----|----------------|
| Matter | Explicit queue, continuous flow |
| Apple News | Infinite scroll by topic |
| Flipboard | Swipe-based continuous reading |
| Kindle | Continuous scroll through series |
| Feedly | Keyboard mark-read-and-advance |

### Technical Considerations

- Preload next article at ~80% scroll progress
- Intersection observer for transition detection
- Visual divider: "Next: [Title]" preview
- Memory management (don't load all at once)
- Graceful handling of failed extractions
- Back navigation (re-read previous)
- Clear "end of queue" state
- Session metrics (articles read, time spent)

### UI Flow

```
┌─────────────────────────────────────┐
│  Article 1 Title                    │
│  ...content...                      │
│  ...content...                      │
│  ─────────────────────────────────  │
│  END OF ARTICLE                     │
│  ↓ Keep scrolling for next          │
│  ─────────────────────────────────  │
│  ▼ NEXT UP: Article 2 Title         │
│    Estimated 5 min read             │
│  ─────────────────────────────────  │
│  Article 2 Title                    │
│  ...content begins...               │
└─────────────────────────────────────┘
```

---

## 10. Cloud Storage & Sync

### Cloud Drives

- [x] Filen - Full implementation
- [ ] Google Drive - OAuth exists, needs release
- [ ] Dropbox - OAuth exists, needs release
- [ ] OneDrive - Not wired yet

### Advanced Features

- [ ] Ghost files - Placeholders for cloud-only files
- [ ] Sync status icons - Cloud checkmark on synced cards
- [ ] Two-way sync - Cloud → Pawkit auto-import
- [ ] Cross-drive transfers
- [ ] Pawkit-specific folders in Filen

### WebDAV Support

**Why**: Privacy-conscious users often self-host storage via Nextcloud, Synology, ownCloud.

| Provider | Use Case |
|----------|----------|
| Nextcloud | Self-hosted cloud, popular with privacy users |
| Synology NAS | Home server storage |
| ownCloud | Enterprise self-hosted |
| FastMail | Email provider with WebDAV storage |

**Features**:
- [ ] WebDAV connection setup - Server URL, credentials
- [ ] Folder structure sync - Same as other cloud providers
- [ ] Certificate validation options - Self-signed certs for home servers
- [ ] Offline sync queue - Retry when server unavailable
- [ ] Connection testing - Verify setup before save

**Benefit**: Reaches users who refuse Google/Dropbox on principle.

### Realtime Sync (WebSockets)

**Current**: Sync happens on app load, then push-only for changes. Cross-device updates require manual refresh.

**Goal**: Instant updates across all devices using Supabase Realtime.

- [ ] Subscribe to Supabase Realtime channels per user
- [ ] Listen for INSERT/UPDATE/DELETE on cards, collections, events
- [ ] Merge incoming changes with local state
- [ ] Visual indicator: "Synced just now" / "Syncing..."
- [ ] Handle offline → online reconnection gracefully
- [ ] Debounce rapid changes to avoid flicker

**Prior Art**: Notion, Linear, Figma - all use WebSocket sync

**Consideration**: Battery/bandwidth on mobile. Make realtime opt-in or smart (only when app is active).

### Sync Conflict Resolution Strategies

**Current**: Uses "Last-Write-Wins" automatically. User has no visibility into conflicts.

**Resolution Rules** (in priority order):
| Rule | Logic | Rationale |
|------|-------|-----------|
| 1. Deletion always wins | If either device deleted, item stays deleted | Prevents "ghost cards" returning |
| 2. Stale device detection | Device inactive >24 hours = stale | Don't let old device overwrite recent |
| 3. Active device priority | Most recently active device wins | User's current context matters |
| 4. Last-write-wins | Timestamp comparison for normal conflicts | Simple, predictable fallback |

**Advanced Strategies** (future):
- [ ] Field-level merge - Per-field timestamps, merge non-conflicting changes
- [ ] Content-aware merge - For notes, attempt text merge
- [ ] User choice modal - "Keep mine / Keep theirs / Merge"

**Multi-Session Detection**:
- [ ] "Take Control" banner - When same account open elsewhere
- [ ] Session heartbeat - Detect stale sessions
- [ ] Offline queue - Changes queue locally, sync when online

**Implementation Critical**: Deletion checks MUST run first before any other conflict logic.

### Conflict Resolution UI

**Goal**: Visual interface for users to resolve sync conflicts when they occur.

- [ ] Detect conflicts (local change vs server change with different timestamps)
- [ ] Show conflict modal: "This item was changed on another device"
- [ ] Options: Keep mine | Keep theirs | View diff | Merge
- [ ] Side-by-side diff view for text content
- [ ] Conflict history log (optional)
- [ ] Auto-resolve option in settings (for power users who prefer LWW)

### Web Snapshots & Archiving

**Concept**: Personal Wayback Machine - never lose content to link rot.

- [ ] Full webpage archiving - Not just text extraction
- [ ] Visual snapshots - Capture as it appeared
- [ ] Offline browsing - Access archived pages without internet
- [ ] Snapshot versioning - Track changes over time
- [ ] Archive.org fallback - Suggest archived version for dead links
- [ ] Storage to Filen - E2E encrypted archive storage

**Why valuable**: Long-term users accumulate years of bookmarks. Sites disappear.

### Shared Pawkits / Collaborative Collections

**Concept**: Share Pawkits with family, teams, or publicly.

| Sharing Type | Use Case |
|--------------|----------|
| Family Filen folder | Shared recipe collection |
| Team Pawkit | Collaborative research |
| Public link | Share curated list with anyone |

**Features**:
- [ ] Share via Filen folders - E2E encrypted sharing
- [ ] Read-only vs edit permissions - Granular access control
- [ ] Sync conflict resolution - Multiple editors
- [ ] Activity feed - See who added what
- [ ] Public sharing links - Optional non-authenticated access

**Extended Collaboration Features** (future):
- [ ] Share note as read-only link - Public URL generation
- [ ] Export to PDF/HTML - Styled export with branding
- [ ] Comments system - Threaded feedback on notes/cards
- [ ] Real-time co-editing - Live cursors for teams
- [ ] Invitation system - Email invite to shared Pawkit
- [ ] Role management - Owner, Editor, Viewer roles

**Caution**: May conflict with local-first philosophy. Evaluate carefully:
- Real-time sync requires server mediation
- Permissions need server-side enforcement
- Consider opt-in for teams, default single-user

**Competitive**: Most bookmark tools are single-user only.

### BYOS (Bring Your Own Storage) Architecture

**Philosophy**: User's cloud = backend. Pawkit = frontend. Zero storage costs.

**How It Works**:
```
┌─────────────────────────────────────────────────────────────┐
│  User's Browser                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Pawkit Web App                                          │ │
│  │ - UI, search, organization                              │ │
│  │ - Metadata in IndexedDB                                 │ │
│  │ - Files upload directly to user's cloud                 │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────┬──────────────────────────────┘
                               │
           ┌───────────────────┼───────────────────┐
           ▼                   ▼                   ▼
    ┌────────────┐      ┌────────────┐      ┌────────────┐
    │   Filen    │      │   Google   │      │  Dropbox   │
    │  (E2EE)    │      │   Drive    │      │            │
    └────────────┘      └────────────┘      └────────────┘
         │                   │                   │
         └───────────────────┴───────────────────┘
                             │
              User pays their own storage
```

**Benefits**:
| Benefit | Description |
|---------|-------------|
| Zero storage costs | User pays cloud, not Pawkit |
| Privacy maximized | Data never touches Pawkit servers |
| E2E Encryption | Filen encrypts before upload |
| Familiar interface | Users already know their cloud |
| Large file support | Cloud handles multi-GB files |

**Technical Implementation**:
- [ ] Filen SDK - `@filen/sdk` for browser/React Native
- [ ] Direct uploads - Browser → Cloud, bypasses Pawkit servers
- [ ] Folder structure - `Pawkit/_Library/`, `Pawkit/_Attachments/`
- [ ] Multi-provider abstraction - Same API for all clouds

**Competitive Examples**:
- Suite Studios (video editing) - Users bring their own S3
- Iconik (media management) - BYOS for enterprise
- Dromo (data import) - Customer's S3 bucket

**Why This Matters**:
- No surprise storage bills
- Complete data ownership
- Works offline (files already on user's cloud)
- Privacy-focused users love this

---

## 11. Calendar & Reminders

### External Calendar Sync

| Provider | Approach |
|----------|----------|
| Google Calendar | OAuth + API |
| CalDAV | Open standard (Apple, Fastmail, Nextcloud, Proton) |
| Apple Calendar | Via Nylas (~$1-2/month) |

### Reminders & Notification System

**"Remind me" button** in card modal with quick options:
- [ ] Tomorrow, This weekend, Next week, Custom
- [ ] Optional reminder notes - "Review before Monday meeting"
- [ ] Calendar integration - Shows with 🔔 icon
- [ ] Home widget - "Reminders Today" dashboard section
- [ ] Completion tracking - Mark as done, snooze, reschedule
- [ ] Rediscover integration - "Remind me later" as skip action

**Data model**:
```sql
CREATE TABLE reminders (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  card_id UUID REFERENCES cards(id),
  remind_at TIMESTAMP,
  note TEXT,
  completed_at TIMESTAMP,
  notified BOOLEAN DEFAULT FALSE
);
```

**Multi-channel notifications**:
- [ ] Browser push
- [ ] Mobile push (iOS/Android)
- [ ] Email digest
- [ ] Cron job scheduler - Check due reminders every 15 minutes

### Notification Infrastructure (Unified)

**Problem**: Notifications scattered - browser push here, email there, mobile separate.

| Tool | Type | Cost | Self-Host |
|------|------|------|-----------|
| **Knock** | Unified API | Usage-based | No |
| **Novu** | Open source | Free/paid | Yes |
| **Courier** | Enterprise | Expensive | No |

**Why Unified Notifications Matter**:
- One API call → email + push + in-app + SMS
- User preference management per channel
- Delivery tracking and analytics
- Template management

**Implementation with Knock**:
```typescript
await knock.notify("reminder-due", {
  recipients: [userId],
  data: {
    cardTitle: "Read this article",
    dueAt: reminder.remind_at,
    cardUrl: `/library/${cardId}`,
  },
});
// Knock routes to: email, push, in-app based on user prefs
```

**User Preference UI**:
- [ ] Per-channel toggles - Email on, push off
- [ ] Quiet hours - No notifications 10pm-8am
- [ ] Digest mode - Batch notifications into daily email
- [ ] Per-notification-type settings - Reminders vs sync alerts

**Notification Types**:
| Type | Channels | Priority |
|------|----------|----------|
| Reminder due | Push, email, in-app | High |
| Weekly digest | Email only | Low |
| Sync conflict | In-app only | Medium |
| Extension save | In-app toast | Low |

### Subscription/Bill Calendar Tracking

**Flow**:
```
User on Netflix confirmation → Extension capture → Kit extracts:
- Service: Netflix
- Amount: $15.99
- Renewal: 20th monthly
→ Creates recurring calendar event
```

---

## 12. Browser Extension

### Multi-Tab Batch Saving

**Problem**: Users often want to save multiple tabs at once, not just the current tab.

**UI Toggle**:
- [ ] Current Tab (default) - Single page save
- [ ] Multiple Tabs - Checkbox list of open tabs

**Features**:
- [ ] Checkbox list - Select which open tabs to save
- [ ] Select All / Deselect All - Quick controls
- [ ] Collection inheritance - Selection carries between mode toggles
- [ ] Progress feedback - "Saving 2/5..." indicator
- [ ] Tab preview - Title + favicon for identification

**Implementation Approaches**:

| Approach | Pros | Cons |
|----------|------|------|
| Sequential saves | No backend changes, MVP-ready | Slower, multiple API calls |
| Batch endpoint | Efficient, single request | Requires `/api/cards/batch` |

**Batch API Endpoint** (future):
```typescript
POST /api/cards/batch
{
  cards: [
    { url, title, collectionId },
    { url, title, collectionId },
  ]
}
```

### Command Palette Vision (Raycast-Style)

Transform from "bookmark saver" to "command center for browsing".

**Activation**: `Cmd+Shift+Space` (Mac) / `Ctrl+Shift+Space` (Win)

**Search Modes with Prefixes**:
| Prefix | Scope |
|--------|-------|
| (none) | Search everything |
| `t:` or `@` | Tabs only |
| `b:` or `#` | Bookmarks only |
| `c:` or `/` | Collections only |
| `>` | Actions/commands only |
| `?` | Help/keyboard shortcuts |

**Commands**:
- `/save` - Save current page
- `/search [query]` - Search Pawkit
- `/note` - Quick note capture
- `/recent` - Show recent saves
- `/pawkit [name]` - Save to specific Pawkit

**Technical Implementation**:
- [ ] Fuzzy search - Fuse.js for typo-tolerant matching
- [ ] Keyboard navigation - Arrows, Enter, Escape
- [ ] Shadow DOM injection - Doesn't break page CSS
- [ ] IndexedDB cache - Offline bookmark access

**Phased Rollout**:
1. **Tab Switcher MVP** - Search and switch open tabs
2. **Bookmark Integration** - Search Pawkit library
3. **Power Features** - Tab groups, voice input, actions
4. **Cross-Browser** - Firefox, Safari extensions

### Tab Manager / Cross-Browser Tab Layer

**Vision**: "Portable browsing" - your tabs work across any browser.

**Core Concept**:
- Arc pioneered "browser as workspace" but it's tied to Arc
- Pawkit provides the **portability layer** - use Safari, Chrome, Firefox, but Pawkit is your workspace

**Features**:
- [ ] New tab page override - Extension becomes landing page
- [ ] Raycast-style hotkey - Quick popup showing all tabs
- [ ] Tab groups within Pawkit - Not tied to browser's native groups
- [ ] Pinned tabs - Persist across browser restarts
- [ ] Cross-browser sync - Tab state syncs via Supabase OR cloud drives (BYOS)
- [ ] Browser-agnostic features - Vertical tabs, grouping work in ANY browser
- [ ] Device continuity - Pick up tab state on another machine

**Value Proposition**: "Your tabs, your storage, any browser"

### Tab Session Saving

**What**: Capture all open tabs with one click, similar to OneTab or Session Buddy.

**Capture Data**:
- URLs, titles, favicons
- Tab order and window groupings
- Chrome Tab Groups (chrome.tabGroups API, Chrome 89+)

**Save Options**:
- [ ] "Save & Close" (OneTab-style) - saves tabs and closes them
- [ ] "Save Only" - saves snapshot without closing
- [ ] "Auto-save periodic snapshots" - background save every X minutes

**Restore Options**:
- [ ] Open all tabs at once
- [ ] Open in new window
- [ ] Open individual tabs selectively
- [ ] Preview before restoring

**Data Model Options**:
```typescript
// Option A: New card type
type: 'session'
tabs: Tab[]  // { url, title, favicon, position, groupId }

// Option B: Collection flag
collection.isSession = true
// Contains individual tab cards
```

**Integration**:
- [ ] Sessions backup to cloud (Filen, GDrive, etc.)
- [ ] Sessions visible in web app Library
- [ ] Search across saved sessions
- [ ] Tags and Pawkits for organization

**Competitive Advantage**:
| vs. OneTab/Session Buddy | vs. Browser Sync |
|--------------------------|------------------|
| Full cloud backup | Cross-browser restore |
| Multiple providers | Not tied to Google/Firefox account |
| Part of Pawkit ecosystem | Works with notes, bookmarks, files |

**Competes With**: OneTab, Session Buddy, Toby
**Tagline**: "Your internet in your Pawkit" - portable browsing layer

### Context Menu Integration

**What**: Right-click menu options throughout the browser.

**Page Context Menu** (right-click on page):
- [ ] "Save to Pawkit" - Quick save current page
- [ ] "Save to..." submenu - List of recent Pawkits
- [ ] "Send to Rediscover" - Quick triage action

**Link Context Menu** (right-click on link):
- [ ] "Save Link to Pawkit" - Save without opening
- [ ] "Open & Save" - Open in new tab AND save

**Image Context Menu** (right-click on image):
- [ ] "Save Image to Pawkit" - Download + create card
- [ ] "Use as Thumbnail" - For current page's card
- [ ] Extract from srcset - Handle responsive images
- [ ] SPA workaround - Manual image selection bypasses scraping issues

**Current Status**: Image capture implemented but may need debugging for edge cases.

**Text Selection Context Menu**:
- [ ] "Save Selection as Note" - Create quick note from highlighted text
- [ ] "Search Pawkit for..." - Find related saves

**Implementation**: `chrome.contextMenus` API with `contexts: ["page", "link", "image", "selection"]`

### Additional Features

- [ ] Quick note modal - Hotkey-activated
- [ ] Speech-to-text - Voice input
- [ ] Clipboard capture - Auto-save copied URLs (opt-in)
- [ ] Portable Browsing - Tab sync, cross-browser context

### Extension Snippet Tool

**Two modes after capture**:

**"Extract Info" Mode**:
- Image sent to Kit for OCR
- Extracts structured data
- Creates card/event with just info
- Image discarded

**"Save Image" Mode**:
- Image uploaded to Filen
- Kit OCRs for searchability
- Card created with image + text
- Full preservation

### URL Metadata Extraction Enhancements

**Current**: Basic Open Graph extraction with fallbacks.

**Enhanced Extraction Sources** (in priority order):
| Source | Data Available |
|--------|----------------|
| JSON-LD (Schema.org) | Product price, Article author/date, Recipe ingredients |
| Open Graph | og:image, og:title, og:description |
| Twitter Cards | twitter:image, twitter:title |
| HTML Meta | description, author, keywords |
| Favicon | Link rel, apple-touch-icon, /favicon.ico fallback |

**Features**:
- [ ] JSON-LD parsing - Extract structured data (Product, Article, Recipe schemas)
- [ ] Reading time calculation - Word count estimation from content
- [ ] Author extraction - From meta tags or JSON-LD
- [ ] Publish date detection - Article dates for sorting
- [ ] Manual thumbnail override - User-supplied image URL when scraping fails

**Bot Detection Challenges**:
| Site | Issue | Workaround |
|------|-------|------------|
| Vans, Best Buy | Block scrapers entirely | Manual override essential |
| Twitter/X | Requires auth | User file export |
| Instagram | Heavy JS rendering | Browserbase or manual |

**Technical Approach**:
```typescript
// Extraction priority
1. Try JSON-LD first (most structured)
2. Fall back to Open Graph
3. Fall back to Twitter Cards
4. Fall back to basic meta tags
5. Show manual override UI if all fail
```

### Multi-Channel Capture Methods

**Philosophy**: Capture content from wherever you are, not just the browser.

| Channel | Use Case |
|---------|----------|
| Email-to-Pawkit | Forward newsletters, receipts, confirmations |
| Telegram Bot | Share links from mobile chat |
| iOS/Android Share Sheet | Already implemented - extend it |
| Discord Bot | Save from community servers |
| Slack Integration | Capture work-related content |
| Apple Shortcuts | iOS automation integration |
| Zapier/Make | Connect 1000s of apps |

**Email-to-Pawkit**:
- [ ] Unique ingest address per user - `your-id@ingest.pawkit.app`
- [ ] Parse email body - Extract links, text content
- [ ] Attachment handling - Save PDFs, images to cloud storage
- [ ] Sender-based rules - Auto-tag newsletters by sender
- [ ] Unsubscribe detection - Flag subscription emails

**Telegram Bot**:
- [ ] `/save [url]` - Quick save with optional tags
- [ ] Forward messages - Bot extracts links
- [ ] `/search [query]` - Search your library from Telegram
- [ ] `/recent` - Show last 5 saves
- [ ] Two-way sync - Saves appear in web app immediately

**Apple Shortcuts Integration**:
- [ ] Custom URL scheme - `pawkit://save?url=...&tags=...`
- [ ] Shortcuts actions - "Save to Pawkit", "Search Pawkit"
- [ ] Automation triggers - Save articles when added to Reading List

**Why this matters**: Browser is one touchpoint. Modern users save from everywhere.

---

## 13. Import & Export

### Read-It-Later Service Import

**Goal**: One-click migration from competitors.

| Service | Approach |
|---------|----------|
| Pocket | Full metadata and tags |
| Instapaper | Reading lists and highlights |
| Omnivore | Open source alternative |
| Wallabag | Self-hosted option |
| Raindrop.io | Competitor migration |

- [ ] Preserve archived content - Don't lose years of saves
- [ ] Tag mapping - Convert their tags to ours
- [ ] Duplicate detection - Skip already-imported items

### Obsidian Vault Integration

**Shared user base**: Privacy-focused, local-first users.

- [ ] Two-way markdown sync with Obsidian vaults
- [ ] Wiki-link compatibility - `[[note]]` syntax works both ways
- [ ] Export to Obsidian format - Folder structure preservation
- [ ] Graph view compatibility - Backlinks work across systems
- [ ] Daily notes sync - Unified journaling
- [ ] Frontmatter preservation - YAML metadata

### Academic/Research Tools

**Target market**: Graduate students, researchers, academics.

| Feature | Description |
|---------|-------------|
| Zotero/BibTeX import | Reference library integration |
| DOI/arXiv/PubMed metadata | Auto-extract paper details |
| Citation format generator | APA, MLA, Chicago, IEEE |
| Bibliography export | Generate formatted references |
| Author/Journal tracking | Organize by research field |
| Abstract extraction | Preview papers quickly |
| Citation count display | See paper impact |

### Import Sources

| Source | Priority | Format |
|--------|----------|--------|
| Browser bookmarks | High | HTML |
| Raindrop.io | High | JSON/CSV |
| Pocket | High | HTML |
| Notion | Medium | Markdown |
| Obsidian | Medium | Vault folder |
| Instapaper | Low | CSV |
| Pinboard | Low | JSON |

### Bulk Import

- [ ] Drag-drop folder of markdown files
- [ ] URL list (one per line)
- [ ] Browser history sync

### Export & Data Portability

**Philosophy**: Anti-lock-in. Your data is yours. Leave anytime with everything.

**One-Click Full Export**:
- [ ] Single download - Everything in one ZIP
- [ ] Progress indicator - For large libraries
- [ ] Resume capability - If download fails

**Export Formats**:
| Format | Content | Use Case |
|--------|---------|----------|
| `_bookmarks.html` | All URL bookmarks | Import to any browser |
| `/notes/*.md` | All notes as markdown | Use in Obsidian, any editor |
| `/attachments/*` | Original uploaded files | PDFs, images, documents |
| `_manifest.json` | Full metadata + structure | Complete rebuild of Pawkit |

**Selective Export**:
- [ ] By Pawkit - Export single collection
- [ ] By tag - Export all items with specific tag
- [ ] By date range - Export last month's saves
- [ ] By type - Export only notes, only bookmarks

**Scheduled Automatic Backups**:
- [ ] Weekly/monthly frequency options
- [ ] Export to cloud drive (Filen, GDrive, Dropbox)
- [ ] Email notification when backup completes
- [ ] Retention policy - Keep last N backups

**Manifest Schema**:
```json
{
  "version": "2.0",
  "exportedAt": "2025-12-29T00:00:00Z",
  "user": { "email": "..." },
  "cards": [...],
  "collections": [...],
  "tags": [...],
  "events": [...]
}
```

---

## 14. Knowledge Graph

### Per-Pawkit Graphs

- Each Pawkit = "mind space"
- Items are nodes
- Connections via links, tags, similarity

### Global Graph

- Pawkits as super-nodes
- Zoom in/out navigation

### Connection Types

| Type | Detection | Visual |
|------|-----------|--------|
| Wiki-link | `[[Note name]]` | Solid line |
| Shared tag | Same tag | Dotted line (tag color) |
| Same domain | Both from same site | Thin line |
| Semantic | AI embeddings | Gradient/heat |

### Features

- [ ] Drag-drop node arrangement
- [ ] Cluster highlighting
- [ ] Organic branching, pill-shaped nodes
- [ ] Aerial view

---

## 15. Performance

### Image Caching System

**Problem**: 100+ card thumbnails fetched from Supabase every load.

**Current State**:
- 88 thumbnail requests = 8.47MB, ~1 minute load time
- Current IndexedDB usage: 0.66MB (plenty of headroom)
- Available quota: ~10GB typical (50% of free disk space)

**Implementation**:
```typescript
// Cache flow
1. First fetch → Download from Supabase → Save to IndexedDB
2. Subsequent loads → Serve from cache instantly
3. On metadata update → Invalidate cache entry
```

**Features**:
- [ ] IndexedDB image cache - Store thumbnails locally
- [ ] LRU eviction - Remove oldest images at 100MB limit
- [ ] Lazy image loading - Load images as user scrolls
- [ ] Progressive enhancement - Show low-res placeholder first
- [ ] Cache invalidation - Re-fetch on metadata update
- [ ] Bandwidth optimization - Especially for mobile users
- [ ] Storage monitoring - `navigator.storage.estimate()` tracking
- [ ] Quota warnings - Alert at 80% capacity

**Capacity Planning**:
| Images | Storage | Cards Supported |
|--------|---------|-----------------|
| 100MB cache | ~100KB avg | ~1,000 cards |
| 500MB cache | ~100KB avg | ~5,000 cards |
| 1GB cache | ~100KB avg | ~10,000 cards |

**Impact**: Eliminates 100+ thumbnail fetches on every load → instant from cache.

### Skeleton Loading States

**Goal**: Polish loading experience to match premium feel.

- [ ] Card skeletons - Animated placeholder cards while loading
- [ ] Progressive rendering - Show content as it loads
- [ ] Optimistic UI updates - Instant feedback before server confirms
- [ ] Loading indicators - For metadata fetching, article extraction
- [ ] Shimmer effects - Polished animation matching glass UI
- [ ] Empty state illustrations - Helpful prompts when no content exists

**Implementation**: CSS animation skeletons, defer heavy operations.

### Virtualization

- Current: All cards in DOM
- Problem: 500+ cards = 50K+ DOM nodes = freezing
- Solution: react-window or react-virtual

### Bundle Cleanup

- Found unused: moment (5.2MB), luxon (4.5MB)
- Using: date-fns (good!)
- Action: `npm uninstall moment moment-timezone luxon`

### Caching & Rate Limiting Infrastructure

**Problem**: Database checks for rate limiting are slow. Frequently accessed data re-fetched.

| Tool | Purpose | Cost |
|------|---------|------|
| **Upstash Redis** | Serverless rate limiting, caching | Pay-per-request |
| **Vercel KV** | Redis-compatible, tight Vercel integration | Usage-based |

**Use Cases**:
- [ ] Kit API rate limiting - Faster than DB checks
- [ ] Metadata fetch caching - Cache OG tags for popular URLs
- [ ] Session caching - Reduce Supabase auth calls
- [ ] Real-time pub/sub - Future WebSocket features

**Why Upstash**:
- Serverless (no connection pooling)
- Global edge replication
- Generous free tier (10K requests/day)
- Works with Vercel Edge Functions

**Implementation**:
```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, "1 d"), // 100/day
});
```

### Offline Mode & PWA Features

**Goal**: Full functionality without network connection.

**Progressive Web App (PWA)**:
- [ ] Service Worker - Cache assets for offline use
- [ ] Web App Manifest - Install on desktop/mobile
- [ ] Offline indicator - Clear UI showing connection status
- [ ] Add to Home Screen - Native app feel

**Offline Capabilities**:
- [ ] Read cached cards - Full library browsable offline
- [ ] Create new cards - Queue for sync when online
- [ ] Edit notes - Local changes persist
- [ ] Queue persistence - Changes survive app restart

**Sync When Online**:
```
Offline → Queue changes locally → Online → Process queue → Sync complete
```

**Cross-Tab Synchronization**:
- [ ] BroadcastChannel API - Sync state across tabs
- [ ] Tab leader election - One tab handles sync
- [ ] Conflict prevention - Avoid race conditions

**Storage Reliability**:
- [ ] Persistent storage request - `navigator.storage.persist()`
- [ ] iOS special handling - More aggressive eviction warnings
- [ ] Storage quota monitoring - Alert before quota exceeded

### Storage Management

**Problem**: Browser storage has limits, need to manage gracefully.

**Storage APIs**:
| API | Capacity | Use Case |
|-----|----------|----------|
| IndexedDB | ~50% of free disk | Primary data store |
| OPFS | Modern, larger quotas | Large file storage |
| localStorage | 5-10MB | Preferences only |

**Quota Management**:
```typescript
const estimate = await navigator.storage.estimate();
const usedMB = estimate.usage / 1024 / 1024;
const quotaMB = estimate.quota / 1024 / 1024;
const percentUsed = (estimate.usage / estimate.quota) * 100;
```

**Features**:
- [ ] Storage monitoring UI - Progress bar showing usage
- [ ] Cleanup tools - Remove old cached images/files
- [ ] File size limits - Recommend 50-100MB max per file
- [ ] Ghost files - Placeholders when file only in cloud
- [ ] Persistent storage API - Request non-evictable storage

**iOS Considerations**:
- More aggressive eviction than other browsers
- Show warnings earlier (60% vs 80%)
- Recommend cloud backup more prominently

**Current Approach**: IndexedDB sufficient for 95% of users. OPFS for power users with large files.

---

## 16. Mobile App

### Share Sheet (THE Killer Feature)

**Why it matters**: Users are on TikTok, Reddit, Instagram - not in their browser. Share Sheet lets them save from ANY app.

**Implementation**:
- [ ] Universal share target - Appears in iOS/Android share menu
- [ ] `expo-share-intent` - React Native package
- [ ] Deep link handling - `pawkit://` scheme
- [ ] Collection picker (v1.1) - Save to specific Pawkit
- [ ] Toast confirmation - "Saved to Library" feedback
- [ ] Keyboard avoidance - Omnibar stays visible while typing

**Supported Share Sources**:
| Platform | Content Type |
|----------|--------------|
| TikTok | Video links |
| Reddit | Posts and comments |
| Instagram | Posts, Reels |
| Safari/Chrome | Web pages |
| YouTube | Video links |
| Any app | URLs, text, images |

**MVP scope**: Library saves only, collection selection in later version

**Status**: iOS TestFlight with Share Extension, pending Apple review

### Document Scanning

**What**: Camera-based capture for physical documents.

**Use Cases**:
- Receipts and invoices
- Business cards
- Whiteboard photos
- Handwritten notes
- Physical mail to digitize

**Features**:
- [ ] Camera capture - Snap documents directly
- [ ] Multi-page PDFs - Combine multiple photos into single doc
- [ ] Auto-crop & enhance - Clean up scan quality
- [ ] Edge detection - Smart document boundary finding
- [ ] Upload as attachments - Link scans to cards
- [ ] Use as thumbnails - Visual cards for physical documents

**Future Integration**:
- OCR text extraction (via Kit AI)
- Automatic date/amount parsing
- Receipt categorization
- Expense tracking

### Core Features

- [ ] Offline-first - Full functionality without network
- [ ] Push notifications - Reminders, sync status
- [ ] Background sync - Sync when app is closed

### Mobile-First Responsive Design

**Current**: Web app optimized for desktop, mobile is an afterthought.

**Goal**: True mobile-first experience that works beautifully on all screen sizes.

| Screen Size | Adaptations |
|-------------|-------------|
| Mobile (<640px) | Bottom nav, swipe gestures, thumb-friendly targets |
| Tablet (640-1024px) | Collapsible sidebar, two-column layouts |
| Desktop (>1024px) | Full 3-panel layout |

**Mobile UX Patterns**:
- [ ] Bottom navigation bar - Thumb-reachable on large phones
- [ ] Swipe gestures - Left/right to navigate, swipe cards to dismiss
- [ ] Pull-to-refresh - Standard mobile pattern
- [ ] Floating action button (FAB) - Quick add button
- [ ] Touch target sizing - Minimum 44px for all interactive elements
- [ ] Haptic feedback - Subtle vibration on actions

**Responsive Components**:
- [ ] Card grid adapts - 1 column mobile, 2 tablet, 3+ desktop
- [ ] Modal sheets - Bottom sheets on mobile, centered dialogs on desktop
- [ ] Sidebar drawer - Full-screen slide-out on mobile
- [ ] Header collapse - Hide on scroll down, show on scroll up

**Performance for Mobile**:
- [ ] Reduced motion option - Respect `prefers-reduced-motion`
- [ ] Optimized images - WebP format, responsive srcsets
- [ ] Offline capability - Service worker for core features
- [ ] Battery consideration - Reduce background sync frequency

**Technical Implementation Notes**:
- [ ] Drawer navigation - Sidebars hidden on mobile, swipe to access
- [ ] Bottom sheet modals - Native iOS/Android patterns
- [ ] Touch gestures - Swipe to dismiss, pull to refresh
- [ ] Flex-based layouts - `flex-1 min-h-0` pattern everywhere
- [ ] No fixed widths - Responsive to any screen size
- [ ] Proper scroll containers - `overflow-auto`, height propagation

**Known Technical Issue**: Library view has height collapse on mobile browsers (Muuri layout engine). Needs CSS fix for mobile viewports.

### Known Issues

- Sidebar not fully functional
- Notes sync issues
- Pawkits showing empty
- Requires Apple beta review

---

## 17. Monetization

### Philosophy

- Core app free
- Premium = integrations + advanced features
- BYOS/BYOAI reduces costs

### Potential Premium

| Feature | Price |
|---------|-------|
| Google Calendar sync | $2-3/month |
| Apple Calendar (Nylas) | $1-2/month |
| Advanced AI | Usage-based |
| Team Pawkits | Future |

---

## 18. Analytics & Insights

### Domain Intelligence & Statistics

**Insight**: "You've saved 47 links from github.com"

- [ ] Top 10 domains by saves - Leaderboard view
- [ ] Domain breakdown visualization - Pie/bar chart
- [ ] Per-domain management - Bulk operations on all saves from a domain
- [ ] Domain trends over time - When did you discover this site?

**Implementation**: Just aggregation queries on existing `domain` field. Low effort, high delight.

**Why users love this**: People enjoy seeing their own patterns.

### Dashboard Widgets & Stats

- [ ] **Timeline graph** - Line chart of items saved over time
- [ ] **Content type breakdown** - Pie/bar: bookmarks vs notes vs files
- [ ] **Activity heatmap** - GitHub-style contribution grid
- [ ] **Pinned Pawkits** - Quick access cards on Home
- [ ] **Domain leaderboard** - Top sites you save from
- [ ] **Reading stats** - Articles read this week/month, time spent

### Link Rot Detection & Monitoring

**Problem**: Long-term users accumulate years of bookmarks. Links die.

**Current**: We have basic broken link detection (IMPLEMENTED.md).

**Enhanced version**:
- [ ] Background job - Periodic checks (weekly/monthly)
- [ ] Visual indicator - Badge on dead links
- [ ] "Check all links" bulk operation
- [ ] Redirect detection - Auto-update URL if permanently moved
- [ ] Archive.org fallback - Suggest Wayback Machine for dead links
- [ ] Link health report - "5 links died this month"

### Product Analytics (Privacy-Friendly)

**Philosophy**: Understand user behavior without invasive tracking.

| Tool | Type | Cost | Privacy |
|------|------|------|---------|
| **PostHog** | Full-stack analytics | Free tier, then usage | Self-hostable, GDPR |
| **Plausible** | Simple pageviews | ~$9/mo | EU-based, no cookies |
| **Pirsch** | Minimal tracking | ~$5/mo | EU-based, GDPR |
| **Fathom** | Clean analytics | ~$14/mo | Privacy-first |

**PostHog Advantages** (recommended for Pawkit):
- Product analytics + session replay
- Feature flags for A/B testing
- Self-hostable if needed
- Generous free tier (1M events/mo)

**What to Track**:
- Feature adoption - Who uses Rediscover? Calendar? Tags?
- Drop-off points - Where do users give up?
- User journeys - Onboarding completion rates
- Performance metrics - Load times, sync failures

### User Engagement Metrics

**Goal**: Understand what features matter to users.

**Activity Metrics**:
| Metric | Query | Purpose |
|--------|-------|---------|
| Active users (7/30 day) | Last login timestamp | Health check |
| Card creation rate | New cards per week | Engagement level |
| Collection usage | Cards per Pawkit | Organization habits |
| Note activity | Daily notes vs regular | Feature adoption |
| Calendar events | Scheduled items count | Calendar value |
| Extension saves | Source of new cards | Platform importance |

**Technical Metrics**:
| Metric | Query | Purpose |
|--------|-------|---------|
| Sync success rate | Successful vs failed syncs | Reliability |
| Device distribution | Web vs mobile vs extension | Platform priority |
| Offline usage | Queue depth, offline time | PWA importance |
| API latency | P50/P95 response times | Performance |

**Retention Cohorts**:
- Week 1 retention - Do they come back?
- Month 1 retention - Are they hooked?
- Month 3 retention - Long-term value?

**Implementation**:
- Anonymous user IDs (no PII)
- Aggregate queries on Supabase
- Optional PostHog for detailed funnels
- Privacy toggle in settings

**Privacy Considerations**:
- [ ] Anonymous user IDs - No PII in analytics
- [ ] Opt-out option - Settings toggle for analytics
- [ ] Self-hosted option - For paranoid users
- [ ] GDPR compliance - Cookie banners if needed

**Decision**: PostHog for full analytics, Plausible as lightweight alternative.

---

## 19. Card Modal Enhancements

### Related Items Tab

**What**: New tab in card detail modal showing related content.

| Relation Type | Logic |
|---------------|-------|
| **Same Tags** | Other cards with matching tags |
| **Same Domain** | Other saves from this website |
| **Backlinks** | Notes that `[[reference]]` this card |
| **Similar Content** | AI embeddings similarity (future) |

**Features**:
- [ ] "Related" tab alongside existing tabs
- [ ] Click to navigate to related card
- [ ] "Read All" mode - Combined reader loading articles sequentially
- [ ] Show relation reason: "3 shared tags" or "Same domain"

**Why valuable**: Surfaces forgotten connections in your knowledge base.

---

## 20. Onboarding & User Experience

### Guided Onboarding System

**Goal**: Reduce time-to-value for new users, teach power features.

**Implementation options**:
- `react-joyride` - Popular tour library
- `@reactour/tour` - Lightweight alternative

**Tour steps**:
1. Library - "This is where all your saves live"
2. Omnibar (⌘K) - "Quick add anything"
3. Pawkits organization - "Create collections to organize"
4. Calendar - "Schedule content for later"
5. Reader mode - "Distraction-free reading"

**Features**:
- [ ] Sample data seeding - Pre-populated Pawkits with example content
- [ ] One-click cleanup - "Delete all sample data" button
- [ ] Welcome banner - Dismissable introduction for new users
- [ ] Glassmorphism styled tooltips - Match Pawkit's design system
- [ ] Progress tracking - User can skip/resume tour
- [ ] Database flag: `onboardingTourCompleted` to prevent re-triggering

### Price Drop & Change Monitoring

**Concept**: Alert when saved product drops in price or page content changes.

| Monitor Type | Use Case |
|--------------|----------|
| Amazon price tracking | Alert when product drops in price |
| Generic price detection | Works on most e-commerce sites |
| Job posting monitors | Alert when listing updates or closes |
| Documentation changes | Know when docs pages update |
| Page snapshot diff | Visual comparison of what changed |

**Features**:
- [ ] Monitoring frequency - Daily/weekly checks per card
- [ ] Historical price graphs - See price trends over time
- [ ] Notification channels - Email, push, in-app badge
- [ ] Target price alerts - "Notify me when under $50"

**Technical approaches**:
- Per-site scrapers (accurate but maintenance-heavy)
- Generic heuristics (look for $ patterns, schema.org markup)
- Hybrid approach for common sites

**Business model**: Natural premium feature (requires server-side work).

---

## 21. Accessibility Features

**Philosophy**: Pawkit should be usable by everyone, including users with disabilities.

### Screen Reader Support

- [ ] Proper ARIA labels - All interactive elements labeled
- [ ] Live regions - Announce dynamic content changes (sync status, notifications)
- [ ] Landmark regions - Header, nav, main, aside properly marked
- [ ] Focus management - Modals trap focus, return focus on close
- [ ] Skip links - Jump to main content

### Keyboard Navigation

- [ ] Full keyboard operability - Every action reachable without mouse
- [ ] Visible focus indicators - Clear, high-contrast focus rings
- [ ] Logical tab order - Follows visual layout
- [ ] Keyboard shortcuts - With customization and conflict detection
- [ ] Escape to close - Standard modal behavior

### Visual Accessibility

| Feature | Implementation |
|---------|----------------|
| Color contrast | WCAG AA minimum (4.5:1 text, 3:1 UI) |
| Reduced motion | Respect `prefers-reduced-motion` |
| Text scaling | Works up to 200% zoom |
| High contrast mode | Support `prefers-contrast: high` |
| Color blind modes | Patterns/icons alongside color indicators |

**Testing tools**:
- axe-core for automated testing
- VoiceOver/NVDA manual testing
- Lighthouse accessibility audits

### Motor Accessibility

- [ ] Large touch targets - Minimum 44x44px
- [ ] Drag-and-drop alternatives - Keyboard or menu-based ordering
- [ ] Time limits - No actions that expire too quickly
- [ ] Error prevention - Confirm destructive actions

---

## 22. Theme & Appearance Customization

### Current State

- Light/Dark mode toggle (implemented)
- Glass/Modern mode toggle (implemented)
- HSL-based color tokens (implemented)

### Extended Customization

**Accent Color Picker**:
- [ ] Primary accent color selection - Beyond current blue
- [ ] Preset palettes - Popular color schemes
- [ ] Custom hex input - For brand colors
- [ ] Per-Pawkit accent colors - Different collections, different vibes

**Font Customization**:
- [ ] Font family selection - System, Inter, serif options
- [ ] Font size scaling - Global text size adjustment
- [ ] Line height preferences - Compact vs comfortable
- [ ] Dyslexia-friendly fonts - OpenDyslexic option

**Layout Density**:
| Density | Description |
|---------|-------------|
| Compact | More cards visible, smaller spacing |
| Comfortable | Default balanced layout |
| Spacious | Maximum breathing room |

**Card Appearance**:
- [ ] Border radius options - Sharp, rounded, pill
- [ ] Shadow depth - None, subtle, prominent
- [ ] Image display options - Crop, contain, cover
- [ ] Thumbnail size preference

**Advanced**:
- [ ] Custom CSS injection - For power users
- [ ] Theme export/import - Share themes with others
- [ ] Time-based themes - Auto-switch at sunset

---

## 23. Developer API & Webhooks

**Target audience**: Power users, developers, automation enthusiasts.

### Public REST API

**Authentication**:
- [ ] API key generation in settings
- [ ] Scoped permissions - Read-only vs full access
- [ ] Key rotation and revocation
- [ ] Rate limiting by key

**Endpoints**:
```
GET    /api/v1/cards           - List cards (with filters)
GET    /api/v1/cards/:id       - Get single card
POST   /api/v1/cards           - Create card
PATCH  /api/v1/cards/:id       - Update card
DELETE /api/v1/cards/:id       - Delete card

GET    /api/v1/collections     - List Pawkits
POST   /api/v1/collections     - Create Pawkit
GET    /api/v1/tags            - List tags
POST   /api/v1/search          - Full-text search
```

**API Documentation**:
- [ ] OpenAPI/Swagger spec - Machine-readable
- [ ] Interactive docs - Try endpoints in browser
- [ ] Code examples - curl, JavaScript, Python

### Webhooks

**Events**:
| Event | Payload |
|-------|---------|
| `card.created` | Full card object |
| `card.updated` | Card with changed fields |
| `card.deleted` | Card ID |
| `collection.created` | Collection object |
| `tag.applied` | Card ID + tag |

**Configuration**:
- [ ] Webhook URL registration
- [ ] Event selection - Subscribe to specific events
- [ ] Secret signing - Verify payload authenticity
- [ ] Retry logic - Automatic retry on failure
- [ ] Delivery logs - Debug failed webhooks

**Use cases**:
- Sync to external systems (Notion, Airtable)
- Trigger automation (Zapier, n8n, Make)
- Custom notifications
- Backup to external storage

### CLI Tool

- [ ] `npx pawkit-cli login` - Authenticate
- [ ] `npx pawkit-cli save <url>` - Quick save from terminal
- [ ] `npx pawkit-cli search <query>` - Search library
- [ ] `npx pawkit-cli export` - Backup data
- [ ] Pipe support - `echo "url" | pawkit-cli save`

---

## 24. Background Job Infrastructure

**Problem**: Several features need server-side background processing.

### Required Jobs

| Job | Purpose | Frequency |
|-----|---------|-----------|
| Link health check | Detect broken links | Weekly |
| Trash auto-purge | Delete items older than 30 days | Daily |
| Reminder notifications | Send scheduled notifications | Every 15 min |
| Connected platform sync | Pull new Reddit/YouTube saves | Hourly |
| Embedding generation | Process new cards for AI | On create |
| Sitemap generation | SEO for public Pawkits | Daily |
| Usage analytics | Aggregate anonymized stats | Daily |

### Technology Options

| Tool | Pros | Cons |
|------|------|------|
| **Trigger.dev** | Serverless, great DX, Vercel-friendly | Newer, less battle-tested |
| **Inngest** | Event-driven, retries, rate limiting | Additional service |
| **Supabase pg_cron** | In-database, no extra infra | Limited to SQL |
| **Vercel Cron** | Simple, integrated | 1-min timeout on Pro |
| **Upstash QStash** | Serverless, generous free tier | Queue-focused |

**Detailed Comparison**:

| Feature | Vercel Cron | Trigger.dev | Inngest |
|---------|-------------|-------------|---------|
| Setup complexity | Zero | Low | Low |
| Long-running jobs | No (1 min) | Yes | Yes |
| Retries | Manual | Automatic | Automatic |
| Dashboard | Logs only | Full UI | Full UI |
| Cost | Free with Vercel | Free tier + usage | Free tier + usage |
| Step functions | No | Yes | Yes |

**Recommendation Path**:
1. **Start**: Vercel Cron for simple jobs (trash purge, weekly digest)
2. **Migrate**: Trigger.dev when jobs need retries, long-running, or complexity
3. **Consider**: Inngest if event-driven architecture becomes core

### Implementation Pattern

```typescript
// Example: Trigger.dev job definition
export const linkHealthCheck = client.defineJob({
  id: "link-health-check",
  name: "Link Health Check",
  version: "1.0.0",
  trigger: intervalTrigger({
    seconds: 60 * 60 * 24 * 7, // Weekly
  }),
  run: async (payload, io, ctx) => {
    const cards = await io.runTask("get-cards", async () => {
      return db.card.findMany({
        where: { type: "url", lastCheckedAt: { lt: weekAgo() } },
        take: 100,
      });
    });

    for (const card of cards) {
      await io.runTask(`check-${card.id}`, () => checkLink(card));
    }
  },
});
```

### Monitoring

- [ ] Job dashboard - See running, queued, failed jobs
- [ ] Error alerting - Notify on job failures
- [ ] Retry configuration - Exponential backoff
- [ ] Dead letter queue - Capture permanently failed jobs
- [ ] Performance metrics - Job duration, success rate

---

## 25. Testing Infrastructure

**Value**: Catch sync nightmares before users do.

### Playwright E2E Tests

**Current Status**: 24 tests covering sync logic, conflict resolution, queue management.

**Why Playwright**:
- Cross-browser testing (Chrome, Firefox, Safari)
- Visual regression testing
- Network interception for sync testing
- Claude Code plugin integration

**Critical Test Coverage**:
| Area | Tests Needed |
|------|-------------|
| Offline queue | Items save locally when offline, sync when online |
| Multi-session detection | "Take Control" button works correctly |
| Ghost card prevention | Deleted cards don't reappear |
| Delete propagation | Deletes sync across all devices |
| Conflict resolution | Last-write-wins with metadata scoring |

**Test Categories**:
- [ ] Unit tests - Pure functions (url-normalizer, todo-detection)
- [ ] Integration tests - API routes with test database
- [ ] E2E tests - Full user flows with Playwright
- [ ] Visual regression - Screenshot comparison for UI changes

**Claude Code Integration**:
```bash
# Run tests in Claude Code conversation
claude --plugin playwright test sync.spec.ts
```

**Test-Driven Refactoring**:
- Once a bug is fixed, write test to prevent regression
- Confidence when changing sync code
- Prevents sync nightmares from returning

---

## 26. Error Tracking & Observability

**Problem**: 3 platforms (web, iOS, Android) + extensions + 87 users = can't reproduce every bug manually.

### Error Tracking Tools

| Tool | Purpose | Cost |
|------|---------|------|
| **Sentry** | Error tracking, stack traces | Free tier + usage |
| **LogRocket** | Session replay, see user actions | ~$99/mo |
| **Highlight.io** | Open source, logs + replay | Self-hostable |

**Why Sentry (Recommended)**:
- Cross-platform support (web, React Native, browser extensions)
- Full stack traces with source maps
- Release tracking
- Performance monitoring
- Generous free tier (5K errors/mo)

**Implementation**:
```typescript
// Initialize Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 0.1, // 10% for performance
});

// Error boundary connection (see ROADMAP tech debt)
componentDidCatch(error, errorInfo) {
  Sentry.captureException(error, { extra: errorInfo });
}
```

**What to Track**:
- [ ] Sync failures - Queue errors, conflict issues
- [ ] API errors - Failed requests with context
- [ ] Extension errors - Content script failures
- [ ] Mobile crashes - React Native exceptions
- [ ] Performance - Slow page loads, large bundles

**Session Replay (Optional)**:
- LogRocket or Sentry Replay
- See exactly what user did before error
- Privacy considerations (mask inputs)

---

## 27. User Feedback System

**Goal**: Low-friction feedback without leaving the app.

### In-App Feedback Button

**Placement**: Sidebar footer (always visible)

**UI Flow**:
1. User clicks feedback button
2. Simple modal opens: text area + optional email
3. Submit → saved to Supabase `feedback` table
4. Email notification via Resend

**Features**:
- [ ] Feedback button in sidebar - Always accessible
- [ ] Simple text area modal - No complex forms
- [ ] Optional email field - For follow-up
- [ ] Automatic context capture - Current URL, user ID, app version
- [ ] Screenshot attachment (optional) - Visual bug reports
- [ ] No account required - Anonymous feedback welcome

**Data Model**:
```sql
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  email TEXT,
  message TEXT NOT NULL,
  context JSONB, -- { url, version, userAgent }
  screenshot_url TEXT,
  status TEXT DEFAULT 'new', -- new, reviewed, resolved
  created_at TIMESTAMP DEFAULT now()
);
```

**Notification Flow**:
- [ ] Resend email on new feedback
- [ ] Slack webhook (optional) for real-time alerts
- [ ] Weekly digest of unreviewed feedback

**Evolution Path**:
1. **MVP**: Simple text feedback → Supabase → email
2. **Growth**: Canny or Fider for feature voting when volume grows
3. **Scale**: Intercom or Zendesk if support tickets increase

---

## 28. Power User Features

**Target**: Developers, writers, Obsidian refugees, keyboard warriors.

### Vim Mode & Keybindings

**Note Editor**:
- [ ] Vim keybindings - h/j/k/l navigation
- [ ] Modal editing - Normal, Insert, Visual modes
- [ ] Vim commands - `:w` save, `:q` close, `/` search
- [ ] Toggle option - Vim mode off by default

**Library Navigation**:
- [ ] j/k - Navigate between cards
- [ ] Enter - Open selected card
- [ ] gg - Jump to first card
- [ ] G - Jump to last card
- [ ] / - Focus search

### Global Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+K` | Open Omnibar |
| `Cmd+N` | New note |
| `Cmd+Shift+N` | Quick note |
| `Cmd+O` | Quick switcher (fuzzy search notes) |
| `Cmd+,` | Settings |
| `Cmd+/` | Keyboard shortcuts help |
| `Esc` | Close modal / blur input |

**Features**:
- [ ] Customizable bindings - User can remap shortcuts
- [ ] Conflict detection - Warn if shortcut already used
- [ ] Cheatsheet modal - `Cmd+/` shows all shortcuts
- [ ] Keyboard-first UX - Every action has shortcut

### Slash Commands in Editor

**Trigger**: Type `/` in note editor

| Command | Action |
|---------|--------|
| `/h1` | Insert heading 1 |
| `/h2` | Insert heading 2 |
| `/todo` | Insert checkbox |
| `/code` | Insert code block |
| `/quote` | Insert blockquote |
| `/link` | Insert link from library |
| `/date` | Insert current date |
| `/template` | Insert template |

### Quick Note Switcher

**Trigger**: `Cmd+O` (like VS Code)

- [ ] Fuzzy search all notes - Title matching
- [ ] Recent notes first - Most recently edited on top
- [ ] Keyboard navigation - Arrow keys + Enter
- [ ] Preview on hover - See note content
- [ ] Create new if not found - "Create 'My Note'"

---

## 29. Note Templates & Snippets

### Template System

**Pre-built Templates**:
| Template | Structure |
|----------|-----------|
| Meeting Notes | Date, attendees, agenda, discussion, action items |
| Research | Source, key quotes, analysis, related notes |
| Daily Log | Date header, tasks, notes, reflection |
| Book Notes | Title, author, chapters, key ideas, quotes |
| Project | Overview, goals, tasks, timeline, resources |

**Template Variables**:
```markdown
# Meeting: {{title}}
**Date**: {{date}}
**Time**: {{time}}
**Attendees**:

## Agenda
-

## Notes
-

## Action Items
- [ ]
```

**Features**:
- [ ] Template gallery - Browse and preview templates
- [ ] Custom templates - User creates their own
- [ ] Template variables - `{{date}}`, `{{time}}`, `{{title}}`
- [ ] Auto-fill on create - New note from template
- [ ] Template editing - Modify built-in templates

### Snippet Tool

**Concept**: Save and reuse text blocks.

- [ ] Snippet library - User's saved text blocks
- [ ] Trigger expansion - Type shortcut → expands to snippet
- [ ] Variables in snippets - Dynamic content insertion
- [ ] Sync across devices - Snippets in IndexedDB + cloud

**Examples**:
```
/sig → Full email signature
/meet → Meeting notes template
/bug → Bug report template
```

---

## 30. Canvas & Whiteboard Mode

**Phase**: Future (after core notes solid)

### Infinite Canvas

**Concept**: 2D spatial workspace for visual thinkers.

**Features**:
- [ ] Infinite 2D workspace - Pan and zoom freely
- [ ] Drag items spatially - Position cards anywhere
- [ ] Visual connections - Draw lines between items
- [ ] Mix content types - Notes, bookmarks, images together
- [ ] Freeform drawing - Sketch and annotate
- [ ] Sticky notes - Quick thoughts on canvas

### Use Cases

| Use Case | How Canvas Helps |
|----------|------------------|
| Brainstorming | Non-linear idea capture |
| Project planning | Timeline visualization |
| Research boards | Connect sources visually |
| Mind mapping | Hierarchical idea trees |
| Mood boards | Visual inspiration collection |

### Technical Considerations

- [ ] Render engine - Canvas API or SVG
- [ ] Performance - Virtualize off-screen elements
- [ ] Collaboration (future) - Real-time cursors
- [ ] Export - Save as image or structured markdown
- [ ] Mobile - Touch gestures for pan/zoom

**Prior Art**: Miro, FigJam, Obsidian Canvas, tldraw

---

## 31. Version History & Rollback

### Auto-Save & Versioning

**Problem**: Users accidentally delete content or want to see changes over time.

**Features**:
- [ ] Auto-save frequency - Every 30 seconds
- [ ] Version snapshots - Store last 10 versions per note
- [ ] Manual snapshots - User triggers "Save Version"
- [ ] Storage efficient - Only store diffs, not full copies

### Version UI

- [ ] Version history panel - List of snapshots with timestamps
- [ ] Diff visualization - Compare changes between versions
- [ ] Restore previous - One-click rollback
- [ ] Preview before restore - See content without committing
- [ ] Last modified display - "You edited 2 hours ago"

### Implementation

```typescript
interface NoteVersion {
  id: string;
  noteId: string;
  content: string;      // Full content or diff
  createdAt: Date;
  type: 'auto' | 'manual';
}

// Storage: Keep last 10 versions per note
// Cleanup: Remove versions older than 30 days
```

### Advanced Features (Future)

- [ ] Git integration - For developers who want full history
- [ ] Branch/merge - Experimental edits
- [ ] Collaboration history - See who changed what

---

## 32. Miscellaneous

### Tag System Improvements

- [ ] Tag creation independent of Pawkits
- [ ] Tag picker in card modal
- [ ] Tag autocomplete
- [ ] Tag management UI (rename, merge, delete)
- [ ] Bulk tag operations
- [ ] Tag colors/icons
- [ ] Tag hierarchy (e.g., #programming/javascript)

### Onboarding

- [ ] Interactive checklist (3 steps)
- [ ] Inline Pawkit rename
- [ ] Enhanced visual affordances
- [ ] Empty state guidance

### Weekly Email Digest

- [ ] Summary of weekly saves
- [ ] Rediscover nudge: "X items you haven't looked at"
- [ ] Milestones: "500 bookmarks!", "1 year of Pawkit"
- [ ] Tech: Supabase Edge Functions + Resend + React Email

### Keyboard Shortcuts

- [ ] Global shortcuts for common actions
- [ ] Vim-style navigation (j/k, gg, G)
- [ ] User-configurable bindings

### Other Ideas

- [ ] Highlights - Select text, highlight, annotate
- [ ] Smart folders - Saved searches as virtual collections
- [ ] "Complete the Set" recommendations
- [ ] Browser history analysis
- [ ] Full-text search within article content

---

## How to Use This Document

1. **For Planning**: Pick ideas to move to [ROADMAP.md](./ROADMAP.md)
2. **For Inspiration**: Browse when looking for what to build next
3. **For Updates**: Add new ideas as they arise
4. **For Claude Code**: Reference when implementing features

---

*Last Updated: December 29, 2025*
*Sources: V1 TODO.md (32KB), V1 SKILL.md (124KB), chat history consolidation, Gemini/Claude audits, extension conversations*
