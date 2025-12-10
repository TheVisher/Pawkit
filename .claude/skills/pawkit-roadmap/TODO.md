# Pawkit TODO & Roadmap

> **Last Updated:** December 10, 2025

---

## 🚀 Major Feature: Connected Platforms & Knowledge Capture

This is the big vision discussed on Dec 10, 2025. Pawkit becomes not just a bookmark manager, but a **unified interface for consuming and learning from saved content across platforms**.

### The Problem We're Solving
- People save content across Reddit, YouTube, Twitter, etc. and never revisit it
- No way to search across platforms
- No way to bulk manage saves
- Knowledge from consumed content is lost (e.g., "I saw something about this... somewhere...")
- Native platform UX for managing saves is intentionally bad

### The Vision
```
SAVE → ORGANIZE → CONSUME & CAPTURE → KNOWLEDGE
─────────────────────────────────────────────────
Reddit ──┐                                      
YouTube ─┼──→ Connected ──→ Rediscover ──→ Topic Notes
Twitter ─┤    Sources       (queue +       (knowledge
Web ─────┘                   capture)       accumulates)
```

---

## Connected Platforms

### Reddit Integration
- [ ] **OAuth flow** — Connect Reddit account (straightforward API)
- [ ] **Import saved posts** — Pull all saved posts with full metadata
  - Reddit API returns: thumbnail, preview images, title, URL, subreddit, score, comment count
  - Much better than scraping (real thumbnails for most content)
  - Text posts = note-type cards, image posts = full images, link posts = bookmarks
- [ ] **Auto-tag by subreddit** — r/programming → #programming tag
- [ ] **Bulk unsave** — Remove items from Reddit after importing to Pawkit
- [ ] **Rediscover for Reddit** — Triage years of saved posts
- [ ] **Bypass 1000 limit** — Reddit only shows last 1000 saves; we can archive everything

**Why Reddit API is great:**
- Official OAuth, easy approval
- Returns rich metadata (thumbnails, previews, scores)
- Supports unsave endpoint for cleanup
- Your target users probably have years of saved content

### YouTube Integration
- [ ] **OAuth flow** — Connect YouTube/Google account
- [ ] **Import playlists** — Pull user-created playlists (not Watch Later - Google blocks API access)
- [ ] **Create playlists from Pawkit** — Pawkit collection → YouTube playlist
- [ ] **Add videos to playlists** — One-click save from extension adds to both Pawkit + YouTube
- [ ] **Remove videos from playlists** — Bulk select in Pawkit → remove from YouTube
- [ ] **Workaround for Watch Later** — Create "My Watch Later" playlist since Google blocks the real one

**The UX improvement:**
```
Current YouTube:     Save = 4 clicks per video. Delete = go to each video individually.
With Pawkit:         One-click save. Bulk select + remove. Syncs back to YouTube.
```

### Twitter/X Integration
- [ ] **Import bookmarks** — OAuth or file-based import (JSON export from browser script)
- [ ] **Full metadata** — Tweet text, author, timestamp, media URLs
- [ ] **Auto-tag by author** — Group tweets by who posted them

**Note:** Twitter API requires developer approval. Start with file-based import (user runs export script, uploads JSON to Pawkit).

### Hacker News Integration (Future)
- [ ] **Import saved/upvoted stories** — Scrape logged-in web interface (no official API for user saves)
- [ ] **Metadata** — Story title, URL, points, comment count, HN discussion link
- [ ] **Target demographic** — Your exact users

---

## Inbox System

### Concept
A landing zone for unsorted content. Keeps Library clean and curated.

- [ ] **Inbox view in sidebar** — Shows count badge
- [ ] **Quick saves go to Inbox** — If user saves without picking a Pawkit, lands here
- [ ] **Platform imports land in Connected section** — Not Inbox (different mental model)
- [ ] **Triage from Inbox** — Move to Library, add to Pawkit, or delete

### Structure Options (decided: Option D)
```
Sidebar:
├── Home
├── Inbox (34) ← Your unsorted quick saves
├── Library ← Your curated collection
├── Pawkits
├── Calendar
├── Notes
├── ──────────
├── Rediscover ← Opens the queue picker
├── ──────────
├── Connected
│   ├── Reddit (156)
│   ├── YouTube (42)
│   └── Twitter (15)
├── ──────────
├── Cloud Storage
│   └── Filen ✓
```

**Key insight:** Platform imports are bulk data needing triage. Quick saves are intentional grabs. Keep them separate.

---

## Rediscover as Content Queue

### Evolution
**Before:** "Here are random old bookmarks. Keep or delete?" (triage tool)
**After:** "Here's your content queue. Watch, read, or dismiss. Let's go." (consumption interface)

### Source Picker
When opening Rediscover, user picks what they're in the mood for:
- [ ] **Source selection modal** — Inbox, YouTube, Reddit, Twitter, Library, Custom filters
- [ ] **Filter options** — By subreddit, by tag, by content type, by date range
- [ ] **Examples:**
  - "Reddit saves from r/recipes older than 6 months"
  - "YouTube videos shorter than 10 minutes"
  - "Articles I saved this week"

### Content Consumption
- [ ] **YouTube embeds** — Watch videos directly in Rediscover
- [ ] **Reddit rendering** — Text posts render markdown, image posts show full image, link posts show reader mode
- [ ] **Twitter embeds** — Render tweets inline
- [ ] **Article reader mode** — You already have this via Readability

### Actions
| Action | What it does |
|--------|--------------|
| **Skip** | Move to end of queue, come back later |
| **Remove** | Delete from Pawkit + optionally unsave from source platform |
| **Keep** | Move to Library (or pick a Pawkit) |
| **Open** | Open in new tab (for stuff needing full context) |

### The Killer Feature: Consume → Capture Flow
While watching/reading in Rediscover, user can capture insights directly into Topic Notes.
See "Topic Notes & Knowledge Capture" section below.

---

## Note Folders

### User Feedback
A user requested folders in the Notes section to organize notes. This pairs perfectly with Topic Notes.

### Implementation
- [ ] **note_folders table** — Same pattern as Pawkits (id, name, parent_id, user_id, position)
- [ ] **Nested hierarchy** — Reuse Pawkit tree rendering, drag-drop, expand/collapse
- [ ] **Add folder_id to notes** — Nullable, existing notes stay "Unfiled"
- [ ] **Folder sidebar in Notes view** — Left panel shows folder tree, right shows notes in selected folder

### Notes in Pawkits (Many-to-Many)
User might want a note about "UI/UX Design" to live alongside saved design articles in a "Design Resources" Pawkit.

- [ ] **pawkit_notes junction table** — Links notes to pawkits (many-to-many)
- [ ] **Notes have a "home" folder** — Primary organization in Notes view
- [ ] **Notes can "appear in" Pawkits** — Like aliases/shortcuts
- [ ] **"Add to Pawkit" from note** — Select which Pawkits to appear in
- [ ] **"Add Note" from Pawkit** — Search existing notes or create new

```sql
-- Primary organization
alter table notes add column folder_id uuid references note_folders(id);

-- Many-to-many: notes can appear in pawkits
create table pawkit_notes (
  pawkit_id uuid references pawkits(id) on delete cascade,
  note_id uuid references notes(id) on delete cascade,
  position integer default 0,
  primary key (pawkit_id, note_id)
);
```

---

## Topic Notes & Knowledge Capture

### The Problem
You watch a YouTube video, see something brilliant at 14:32, think "I should remember this"... and forget it exists within a week. The knowledge is lost.

### The Solution: Topic Notes
A Topic Note is a living document that grows as you consume related content across platforms.

### Features
- [ ] **Citation blocks** — Embedded quotes with source attribution
  ```markdown
  > "Every pixel should earn its place."
  > — Design Course · YouTube · [14:32](youtube.com/...?t=872)
  ```
- [ ] **YouTube timestamps** — Clicking timestamp opens video at exact moment
- [ ] **Reddit citations** — Quote comments with link to post
- [ ] **Twitter citations** — Embed tweet quotes
- [ ] **Article citations** — Quote with link to article

### Capture Flow in Rediscover
- [ ] **"Capture to Note" panel** — Always visible while consuming content
- [ ] **Quick capture field** — Type note, auto-attaches current source + timestamp
- [ ] **Note picker** — Select existing Topic Note or create new
- [ ] **Side panel option** — Open Topic Note alongside content being consumed

### Visual in Note
```
## The 60-30-10 Color Rule

> "60% dominant color, 30% secondary, 10% accent. Learned this 
> from interior design but it applies perfectly to UI."
> 
> — u/designerguy · r/web_design · [View post](reddit.com/...)

Works well with accessibility contrast requirements too.

> "The quickest way to make a UI feel more designed: reduce 
> your color palette to 2-3 colors max."
>
> — @steveschoger · Twitter · [View tweet](twitter.com/...)
```

### Source Tracking
- [ ] **Sources panel in Topic Note** — Shows all platforms/items cited
- [ ] **Source indicators on note cards** — "12 sources · 🎬 4 · 🤖 5 · 🐦 2 · 📄 1"

---

## BYOAI (Bring Your Own AI)

### Philosophy
Pawkit doesn't charge for AI features. Users bring their own AI (ChatGPT, Claude, etc.) and we make the integration seamless. Aligns with "bring your own storage" philosophy.

**The pitch:** "Your subscription, your data, your AI."

### Phase 1: Smart Export + Paste-Back

**Copy to AI:**
- [ ] Select quick notes / items → "Copy to AI" button
- [ ] Dropdown: "Organize & group", "Expand into notes", "Summarize themes", "Custom"
- [ ] Copies pre-written prompt + notes formatted for AI to respond in parseable format

**What gets copied:**
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

**Paste-Back Parser:**
- [ ] "Import AI Response" button in quick notes / notes section
- [ ] Paste AI response with [PAWKIT_IMPORT] tags
- [ ] Pawkit parses and shows preview: "Create 3 notes in these topics?"
- [ ] One-click creates organized notes from AI response

### Phase 2: Extension Enhancement
- [ ] Extension detects when user is on chat.openai.com or claude.ai
- [ ] If response contains [PAWKIT_IMPORT] format, show "Import to Pawkit" button
- [ ] One-click import from AI chat page

### Phase 3: Claude MCP Integration (Game Changer)

MCP (Model Context Protocol) lets Claude connect to Pawkit as a tool. Users with Claude Pro can do AI tasks through natural language — zero API costs for Pawkit.

**How it works:**
```
User → Claude (their subscription) → MCP → Reads/writes to Pawkit
```

**User just chats with Claude:**
- "Organize my Pawkit quick notes into topic groups"
- "Find everything I've saved about Svelte and create a Topic Note"
- "Auto-tag all my untagged bookmarks"
- "What have I saved that's related to this article?"
- "Summarize what I saved this week"

**MCP Server tools to expose:**
- [ ] `pawkit_search` — Search bookmarks, notes, files
- [ ] `pawkit_get_item` — Get full details of an item
- [ ] `pawkit_get_quick_notes` — Get all quick notes
- [ ] `pawkit_create_note` — Create a new note
- [ ] `pawkit_update_note` — Update existing note
- [ ] `pawkit_add_tags` — Add tags to items
- [ ] `pawkit_create_folder` — Create note folder
- [ ] `pawkit_move_item` — Move item to folder/pawkit
- [ ] `pawkit_delete_item` — Delete an item
- [ ] `pawkit_get_related` — Find related items
- [ ] `pawkit_get_stats` — Get user's activity stats

**All AI features work through MCP:**
| Feature | Via MCP |
|---------|---------|
| Auto-tagging | "Tag my untagged items" |
| Topic Notes | "Create topic note about X from my saves" |
| Related items | "What's related to this bookmark?" |
| Weekly summary | "Summarize what I saved this week" |
| Quick note consolidation | "Organize quick notes into proper notes" |
| Content recommendations | "Based on my saves, what should I read next?" |
| Cross-platform linking | "Find connections between Reddit and YouTube saves" |

**UI options for MCP:**
- [ ] "AI Chat" tab links to Claude with Pawkit MCP connected
- [ ] Pre-built prompt buttons that open Claude with context
- [ ] Or: Embed Claude chat in Pawkit (if Anthropic allows)

**Why this is huge:**
- Zero AI costs for Pawkit (user's Claude subscription)
- Privacy-first (data goes to their Claude, not our servers)
- Always improving (Claude gets better, features get better)
- Natural language for everything (no complex UI needed)
- Competitive moat (few apps have MCP yet)

---

## Quick Notes System

### The Problem
Users jot quick one-line notes. They end up with 1000 single-line note files. Cluttered and overwhelming.

### Solution: Quick Notes + Auto-Consolidation

**Quick Capture:**
- [ ] Quick Notes section in sidebar (or modal via keyboard shortcut ⌘+Shift+N)
- [ ] Frictionless capture — type and done
- [ ] NOT full notes — these are fleeting thoughts

**Consolidation System:**
- [ ] Quick notes older than 7 days show in Rediscover: "Still relevant?"
- [ ] Actions: Delete, Keep (reset timer), Promote to full note, Merge into existing note
- [ ] Weekly auto-archive: Unclaimed notes consolidate into "Week of Dec 8" note
- [ ] Nothing deleted — just auto-organized

**Sidebar structure:**
```
NOTES
├── 📁 My Folders
├── 📝 Quick Notes (7)        ← Current captures
├── ─────────────
├── 📁 Archive
│   ├── 📝 Week of Dec 8      ← Auto-consolidated
│   └── 📝 Week of Dec 1
```

**AI Integration (via BYOAI/MCP):**
- [ ] "Copy to AI" with prompt for organizing quick notes
- [ ] Paste-back parser creates organized notes from AI response
- [ ] Via MCP: "Organize my quick notes" does it automatically

---

## AI Features

### Embeddings for Cross-Platform Linking
- [ ] **Generate embeddings on import** — title + description + content
- [ ] **Store in Supabase with pgvector** — You're already using Supabase
- [ ] **Find semantic similarity** — Surface connections user never knew existed

**Example:** User has Reddit post about Svelte, YouTube video about Svelte, Twitter thread on Svelte, article about Svelte — all saved separately. AI shows they're related.

**Cost:** ~$0.03 to embed 3,000 items (essentially free)

### What to Embed
| Platform | Content |
|----------|---------|
| Reddit | Title + selftext + subreddit |
| YouTube | Title + description + auto-transcript |
| Twitter | Tweet text + thread content |
| Articles | Title + extracted article text |
| Notes | Full markdown content |

### AI-Powered Features
- [ ] **"Related Across Platforms" panel** — Shows connected content from different sources
- [ ] **Suggested Topic Notes** — "You have 23 items about Svelte. Create a collection?"
- [ ] **Smart Rediscover queues** — Group related items to binge-learn a topic
- [ ] **Knowledge map** — Topics you've saved across platforms with counts
- [ ] **Content discovery** — Suggest new content from web based on Topic Note themes

### Personalized Content Recommendations ("Your Algorithm, Uncorrupted")

**The Problem:** Platform algorithms (YouTube, Reddit, etc.) get polluted by work searches, random rabbit holes, and accidental clicks. When you want to consume content you actually enjoy, the recommendations are garbage.

**The Solution:** Pawkit only contains content you *intentionally* saved. This is pure signal — no noise from passive browsing. AI recommendations based on Pawkit data reflect your actual interests.

- [ ] **Interest profile from saves** — Analyze what user has saved to build topic weights
  - "47 UI/UX items, 23 Svelte items, 15 cooking items"
  - Weight recent saves higher than old ones
  - Distinguish between platforms (YouTube interests vs Reddit interests)
- [ ] **Content discovery feed** — Suggest new content from the web
  - Pull from RSS feeds, YouTube API, Reddit API based on user's topics
  - "Because you saved 8 CSS items recently" explanations
  - Refresh weekly or on-demand
- [ ] **"Discover" tab/view** — Dedicated place for recommendations
  - Not mixed into Library (keep that user-curated)
  - One-click save to Pawkit
  - "Not interested" to refine suggestions
- [ ] **Topic-based discovery in Rediscover** — "Find more like this" after consuming content
- [ ] **Subreddit/channel suggestions** — "You might like r/webdev based on your saves"

**Why this is better than platform algorithms:**
- Only uses intentional saves (not passive browsing)
- Doesn't get polluted by work searches
- User controls the signal completely
- Cross-platform understanding (knows your YouTube AND Reddit interests)
- No engagement optimization — optimizes for your actual interests

### Privacy Angle
- [ ] **Local embedding option** — Use models like all-MiniLM-L6-v2 (free, runs anywhere)
- [ ] **Cloud embedding option** — OpenAI for speed (tiny cost)
- [ ] **Embeddings don't contain original content** — Just vectors, privacy-safe
- [ ] **Recommendations can be local-only** — No data sent to third parties if user prefers

---

## Proper Tag System

### Current State
Tags exist but are auto-generated when a card is added to a Pawkit (card gets the Pawkit name as a tag). No way to:
- Create tags manually
- Add/remove tags from cards directly
- Manage tags (rename, merge, delete)

### Needed Features
- [ ] **Tag creation** — Create tags independently of Pawkits
- [ ] **Tag picker in card modal** — Add/remove tags when editing a card
- [ ] **Tag autocomplete** — Suggest existing tags as user types
- [ ] **Tag management UI** — Rename, merge, delete tags (already have /tags page, but limited)
- [ ] **Bulk tag operations** — Add/remove tags from multiple cards at once
- [ ] **Tag colors/icons** — Optional visual customization
- [ ] **Tag hierarchy** — Nested tags (e.g., #programming/javascript) — future/optional

### Relationship to Pawkits
**Decision (Dec 10, 2025):** Keep auto-tagging. When a card is added to a Pawkit, it automatically gets that Pawkit's name as a tag. The new tag system is additive — users can create and apply additional tags on top of the auto-generated ones.

---

## Bugs

- [ ] **Notes view display settings not working** — Right sidebar display options (card size, spacing, thumbnails/labels, metadata/preview) don't affect the Notes view. Should work the same as Library view.

---

## Existing TODO Items

### User Feedback (YouTube)
- [ ] **Notes folder structure** — ✅ Now part of Note Folders feature above
- [ ] **Bulk markdown import** — Dedicated import flow for multiple .md files

### In-App Features
- [ ] **Feedback system** — Sidebar button → modal → Supabase + Resend email
- [ ] **Pawkit context menu — Make Private** — Right-click option to toggle privacy

### Files & Storage
- [ ] **Pawkit-specific folders in Filen** — Organize files by Pawkit
- [ ] **Ghost files** — Placeholders for cloud-only files
- [ ] **Two-way Filen sync** — Full bidirectional sync

### Cloud Drives
- [x] ~~Filen — Fully implemented~~
- [ ] **Google Drive** — Implemented, dev-only (needs release)
- [ ] **Dropbox** — Implemented, dev-only (needs release)
- [ ] **OneDrive** — Not wired up yet

### Calendar & Scheduling
- [ ] **Google Calendar** — OAuth + read events. Workaround for Apple users: sync Apple→Google first
- [ ] **CalDAV** — For privacy-focused calendars (Apple, Fastmail, Nextcloud, Proton w/bridge)
- [ ] **Reminders system** — Set reminders on cards and notes
  - "Remind me" button in card/note modal with quick options (Tomorrow, This weekend, Next week, Custom)
  - Optional reminder note ("Review before Monday meeting")
  - Reminders table: user_id, card_id/note_id, remind_at, note, completed_at, notified
  - Show in Calendar view alongside scheduled cards (🔔 icon)
  - Home dashboard widget: "Reminders Today"
  - Notification channels: push (mobile), browser notifications, email
  - Cron job to check due reminders and send notifications
  - Integrates with Rediscover: "Remind me later" as skip action

### Library & Views
- [ ] **Customizable columns in list views** — Show/hide columns, localStorage per view

### Mobile
- [ ] **Document scanning** — Camera capture for receipts/documents → attachments or thumbnails
- [ ] **External TestFlight** — Needs Apple beta review

### Dashboard
- [ ] **Timeline graph** — Line graph of items saved over time
- [ ] **Content type breakdown** — Bar graph of bookmarks vs notes vs images etc.
- [ ] **Pinned Pawkits** — Open in modal for quick access

### Browser Extension
- [ ] **Quick note modal** — Hotkey-activated note capture while browsing
- [ ] **Speech-to-text** — Voice input for notes
- [ ] **Clipboard capture** — Auto-save copied URLs to Pawkit (opt-in)
  - Toggle in extension settings (privacy: clipboard can contain sensitive data)
  - Detect URLs in clipboard, prompt "Save to Pawkit?" or silently save to Inbox
  - Only capture URLs, not all text (avoid passwords)
  - Clear indicator when active, easy toggle on/off
- [ ] **Portable Browsing vision** — Tab sync, cross-browser context ("Your internet in your Pawkit")

### Knowledge Graph
- [ ] **Fix existing graph** — Currently broken/disabled
- [ ] **Enhanced graph** — Organic branching, pill-shaped nodes, aerial view, drag-drop reorganization

### Coming Soon (Placeholder UI Exists)
- [ ] **AI Chat** — Tab shows "AI Chat coming soon..."
- [ ] **AI Summaries** — Tab shows placeholder
- [ ] **Search Within Content** — Toast "coming soon"
- [ ] **Tag Management in Modal** — Toast "coming soon"
- [ ] **Filen Settings modal** — Opens toast instead of settings
- [ ] **Card Actions** — Copy/Share/Duplicate not functional

### Weekly Email Digest
- [ ] **Weekly summary email** — Personalized digest sent to users
  - Activity: bookmarks saved, notes created, files uploaded
  - Rediscover nudge: "You have X items you haven't looked at in 6+ months" with thumbnails
  - Milestones: "You hit 500 bookmarks!", "1 year of using Pawkit 🎉"
  - Later (with AI): Top topics, collection suggestions
- [ ] **User preference toggle** — "Send weekly summary" in settings (default ON)
- [ ] **Unsubscribe flow** — Link in email footer
- [ ] **Tech stack:** Supabase Edge Functions or Vercel Cron + Resend + React Email

### Future Features
- [ ] **Apple Calendar via Nylas** — Premium add-on ($1-2/month)
- [ ] **Related Items tab** — Same tags/domain/backlinks in card modal
- [ ] **"Read All" combined reader mode** — Lazy-load articles sequentially
- [ ] **Contact Filen for partnership**

---

## MCP Implementation Plan (Priority: High)

**Why prioritize:** Erik wants to use this personally ASAP for testing + as a dev tool.

**Phase 1: Core MCP Server**
- [ ] Create `@pawkit/mcp-server` npm package
- [ ] Implement read operations:
  - `list_cards` — Get bookmarks with filters
  - `list_notes` — Get notes with folder filter
  - `list_quick_notes` — Get quick notes
  - `list_pawkits` — Get collections tree
  - `search` — Full-text search across content
  - `get_card` / `get_note` — Get single item details
- [ ] Implement write operations:
  - `create_note` — Create new note
  - `update_note` — Edit note content
  - `create_quick_note` — Add quick note
  - `add_tags` — Tag items
  - `move_to_pawkit` — Organize items
  - `delete_quick_note` — Remove quick note
- [ ] Auth via token (generated in Pawkit settings)
- [ ] Test locally with Claude Desktop

**Phase 2: Easy User Setup**

*Option A: npx auto-setup (for terminal users)*
- [ ] Create `pawkit-mcp-setup` npm package
- [ ] Detects OS, finds Claude config location
- [ ] Prompts for auth token
- [ ] Creates/updates config file
- [ ] Open source for trust/transparency
```bash
npx pawkit-mcp-setup
```

*Option B: In-app guided setup (for everyone)*
- [ ] Settings page with step-by-step guide
- [ ] Auto-generates config JSON with user's token embedded
- [ ] "Copy to clipboard" button
- [ ] OS-specific instructions for finding config file
- [ ] 60-second video walkthrough embedded

**Phase 3: Dev Workflow (Erik's Personal Use)**
- [ ] Combine with filesystem MCP server for code access
- [ ] Claude can cross-reference Pawkit data + codebase
- [ ] Use for: "Check my quick notes for TODOs about X, then look at the relevant code"
- [ ] Copy Claude's analysis → paste to other Claude instances for deeper work

**Example config for dev use:**
```json
{
  "mcpServers": {
    "pawkit": {
      "command": "npx",
      "args": ["-y", "@pawkit/mcp-server"],
      "env": { "PAWKIT_AUTH_TOKEN": "pk_xxx" }
    },
    "pawkit-code": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/pawkit"]
    }
  }
}
```

---

## Implementation Priority (Suggested)

### Phase 1: Note Folders
- Add folder support to Notes (reuse Pawkit tree pattern)
- Add pawkit_notes junction table for notes in Pawkits
- Quick win, addresses direct user feedback

### Phase 2: Reddit Integration
- OAuth flow
- Import to Connected section
- Basic Rediscover integration
- Most accessible API, high user value

### Phase 3: Rediscover as Queue
- Source picker
- Inline content consumption (embeds, reader mode)
- Platform-specific actions (unsave from Reddit)

### Phase 4: Topic Notes & Capture
- Citation blocks in notes
- "Save to Note" from Rediscover
- YouTube timestamp capture
- Source tracking panel

### Phase 5: YouTube Integration
- Playlist sync
- Bulk operations
- Two-way sync for playlists

### Phase 6: AI Features
- Embeddings generation
- Cross-platform linking
- Suggested connections
- Smart queues

---

## The Product Pitch Evolution

**Before:** "A bookmark manager with collections and sync"

**After:** "Pawkit connects your scattered saves across Reddit, YouTube, Twitter, and the web. AI discovers hidden relationships. Consume content in a focused queue. Capture insights with automatic source linking. Build a knowledge base from everything you consume."

**Tagline:** "Your internet in your Pawkit"

---

*Last conversation: December 10, 2025 — Connected Platforms, Note Folders, Topic Notes, AI linking, Reminders, Clipboard capture, BYOAI, MCP integration*
