# GitHub Connector Feature Spec

## Overview
A GitHub integration that imports repository documentation into Pawkit, giving users a visual way to organize and view their project docs, Claude skills, roadmaps, and markdown files. Changes made by AI tools (Claude Code, etc.) automatically appear in Pawkit on refresh.

## Problem Statement
Developers using AI-assisted workflows struggle to track where their documentation lives and what changes AI tools have made. Markdown files, Claude skills, and roadmaps are scattered across repos with no unified visual interface.

## Solution
Connect a GitHub repo to a Pawkit collection. Selected markdown files import as cards, organized in a folder structure. Users can view, organize, and track changes—all in one place.

---

## Phase 1: Read-Only Import (MVP)
### Core Features:
- Connect GitHub repo via OAuth (existing auth can be reused)
- Select paths to import (e.g., `README.md`, `docs/**/*.md`, `.claude/skills/**/*.md`)
- Import markdown files as cards into a designated Pawkit
- Preserve folder structure as nested sub-pawkits
- Manual refresh button to pull latest from GitHub
- Auto-fetch on Pawkit open

### User Flow:
1. Create new Pawkit or open existing
2. Settings → Connect GitHub Repository
3. Select repo from list
4. Choose paths to sync
5. Import creates cards for each markdown file
6. Click any card to read the rendered markdown

### Technical Notes:
- Use GitHub API to fetch file contents
- Store file content in card body (markdown note type)
- Store GitHub metadata: path, SHA, last commit date, commit author
- Fetch on open + manual refresh (no webhooks for MVP)

---

## Phase 2: Diff Highlighting
### Core Features:
- Store previous version when fetching updates
- Detect changes between versions
- Show diff view with additions (green) and deletions (red)
- Display commit context: message, author, timestamp
- Badge on cards indicating "Updated since last viewed"

### UI Elements:
- Tab toggle: Rendered | Diff | Raw
- "Updated X minutes ago" indicator
- Commit message preview
- "View full diff" expansion

### Technical Notes:
- Store `previousContent` alongside `currentContent`
- Use `diff` npm package for comparison
- Consider `react-diff-viewer` for side-by-side UI
- Pull commit info from GitHub API

---

## Phase 3: Two-Way Sync (Future)
### Core Features:
- Edit markdown files within Pawkit
- Local saves to IndexedDB (frequent, automatic)
- Manual "Push to GitHub" action (user-controlled)
- Batch multiple file changes into single commit
- Custom commit message input
- Conflict detection if remote changed since last fetch

### Sync Behavior:
- GitHub-synced folder is clearly marked
- Only files in synced folder push to repo
- Bookmarks, notes, other cards stay local
- User explicitly chooses to sync new files

### UI Elements:
- "X files modified locally" indicator
- Push button with commit message dialog
- Conflict resolution modal (keep mine / keep theirs / view diff)

---

## Data Model Additions

```typescript
interface GitHubConnection {
  id: string;
  pawkitId: string;           // Which Pawkit this connects to
  repoOwner: string;          // e.g., "TheVisher"
  repoName: string;           // e.g., "Pawkit"
  branch: string;             // e.g., "main"
  syncPaths: string[];        // e.g., ["README.md", "docs/**/*.md"]
  lastFetchedAt: Date;
}

interface GitHubFileCard extends Card {
  githubPath: string;         // e.g., ".claude/skills/SKILL_INDEX.md"
  githubSha: string;          // For change detection
  lastCommitMessage: string;
  lastCommitAuthor: string;
  lastCommitDate: Date;
  previousContent?: string;   // For diff view
}
```

---

## Why This Matters
- **Visibility** - See all project docs in one visual interface
- **AI Oversight** - Track what Claude Code and other AI tools change
- **Organization** - Drag, nest, and arrange docs how your brain works
- **Context** - Bookmarks, notes, and docs for a project live together
- **Dogfooding** - Use Pawkit to manage Pawkit's own development

## Fits Existing Roadmap
This is a natural extension of "Connected Platforms" (Reddit, YouTube, Twitter imports). Same pattern: pull content from external source into Pawkit. GitHub is just the developer-focused version.
