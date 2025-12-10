# Pawkit Skill Index

> **Purpose**: Route AI agents (Claude Desktop + Claude Code) to the correct skill files based on task type.
> **Location**: `.claude/skills/SKILL_INDEX.md`
> **Last Updated**: December 10, 2025

---

## Quick Reference: Task → Skill Mapping

| Task Type | Primary Skill | Secondary Skills |
|-----------|---------------|------------------|
| **UI work** (components, styling, modals) | `pawkit-ui-ux/UI_QUICK_REFERENCE.md` ⚠️ | `pawkit-ui-ux/SKILL.md` |
| **Sync/data issues** | `pawkit-sync-patterns` | `pawkit-troubleshooting` |
| **API routes** | `pawkit-api-patterns` | `pawkit-security` |
| **Cloud storage** (Filen, GDrive, etc.) | `pawkit-cloud-providers` | `pawkit-sync-patterns` |
| **Database/migrations** | `pawkit-migrations` | `instructions.md` |
| **Bug investigation** | `pawkit-troubleshooting` | varies by area |
| **Performance issues** | `pawkit-performance` | `pawkit-sync-patterns` |
| **Security concerns** | `pawkit-security` | `pawkit-api-patterns` |
| **Testing** | `pawkit-testing` | varies by area |
| **New feature planning** | `pawkit-roadmap` | `pawkit-project-context` |
| **Project status/context** | `pawkit-project-context` | `pawkit-roadmap` |
| **Code conventions** | `pawkit-conventions` | `pawkit-api-patterns` |

---

## ⚠️ CRITICAL: UI Work Instructions

**For ANY UI work, read these files IN ORDER:**

1. **FIRST**: `pawkit-ui-ux/UI_QUICK_REFERENCE.md` - Copy-paste patterns, default style
2. **THEN** (if needed): `pawkit-ui-ux/SKILL.md` - Full component documentation
3. **ALSO**: `docs/PAWKIT_UI_DESIGN_SYSTEM.md` - CSS variables and elevation system

**Key Rules:**
- **Modern is the DEFAULT style** (solid surfaces with depth)
- **Glass is OPT-IN** (only when user enables it in settings)
- Buttons must have **shadow + hover lift effect** (not flat!)
- Cards must have **elevation shadows** (not just borders)

**If CC creates flat buttons or uses Glass patterns by default, it hasn't read the Quick Reference.**

---

## Skill Descriptions

### Core Skills (Always Relevant)

#### `pawkit-project-context`
**When to use**: Understanding current project state, recent changes, architecture decisions
**Contains**: Project overview, session history, key decisions, current branch status
**Read this**: At the start of any significant work session

#### `pawkit-conventions`
**When to use**: Writing new code, reviewing patterns, understanding data models
**Contains**: File naming, component patterns, store patterns, API conventions
**Read this**: Before creating new files or components

#### `pawkit-roadmap`
**When to use**: Planning features, understanding priorities, checking TODO status
**Contains**: Feature backlog, TODO.md with detailed tasks, implementation phases
**Read this**: Before starting any new feature work

---

### Domain-Specific Skills

#### `pawkit-ui-ux` ⚠️ SPECIAL HANDLING

**TWO FILES - Read in order:**

1. **`UI_QUICK_REFERENCE.md`** (READ FIRST!)
   - Default style = Modern (NOT Glass)
   - Copy-paste button/card/modal patterns
   - Common mistakes to avoid
   - Checklist before submitting UI work

2. **`SKILL.md`** (Full reference)
   - Glass morphism patterns (for when Glass is requested)
   - Calendar components
   - Context menu patterns
   - List view standardization
   - Mobile glass patterns
   - Toast notification system

**Key insight**: The main SKILL.md focuses heavily on Glass patterns because it was written when Glass was the default. Now Modern is default. Always check UI_QUICK_REFERENCE.md first!

#### `pawkit-sync-patterns`
**When to use**: Sync issues, conflict resolution, multi-session problems, offline behavior
**Contains**:
- Local-first architecture (IndexedDB = source of truth)
- Conflict resolution strategies (5 types)
- Multi-session detection
- Sync queue management
- Mobile sync (AsyncStorage)
- Filen cloud sync
- Multi-provider sync architecture
- 12 known architectural flaws (documented for future fixing)

**Critical rules**:
1. IndexedDB is source of truth
2. Never lose user data
3. Sync is background process
4. Handle conflicts gracefully

#### `pawkit-api-patterns`
**When to use**: Creating/modifying API routes, error handling, response formats
**Contains**: Standardized error responses, endpoint patterns, authentication

#### `pawkit-cloud-providers`
**When to use**: Cloud storage integration (Filen, Google Drive, Dropbox, OneDrive)
**Contains**:
- Provider interface
- Folder structure conventions
- Authentication flows
- Multi-provider sync
- Direct upload (bypassing SDK)

#### `pawkit-security`
**When to use**: Authentication, authorization, user isolation, XSS prevention
**Contains**: Security audit findings, user isolation patterns, CSP headers

#### `pawkit-migrations`
**When to use**: Database schema changes, data migrations
**Contains**: Migration patterns, rollback strategies, Prisma conventions
**CRITICAL**: Read `instructions.md` first for database safety rules!

#### `pawkit-performance`
**When to use**: Performance optimization, slow queries, render optimization
**Contains**: Profiling results, optimization patterns, IndexedDB performance

#### `pawkit-testing`
**When to use**: Writing tests, test coverage, testing strategies
**Contains**: Test patterns, E2E testing, sync testing

#### `pawkit-troubleshooting`
**When to use**: Bug investigation, known issues, error messages
**Contains**: Issue catalog with root causes and fixes

---

## Usage Instructions

### For Claude Desktop (via GitHub MCP)

When giving tasks to Claude Code, include skill references:

```
Task: Add a new modal for tag management

Skills to read:
- .claude/skills/pawkit-ui-ux/UI_QUICK_REFERENCE.md (READ FIRST - default patterns)
- .claude/skills/pawkit-ui-ux/SKILL.md (Section: MODALS - if needed)
- .claude/skills/pawkit-conventions/SKILL.md

Style: Use Modern (default) style unless I say otherwise

After completing, update:
- .claude/skills/pawkit-ui-ux/UI_QUICK_REFERENCE.md if new pattern emerged
```

### For Claude Code (via filesystem)

At the start of any UI task:

```bash
# ALWAYS read Quick Reference FIRST for UI work
view .claude/skills/pawkit-ui-ux/UI_QUICK_REFERENCE.md

# Then read full skill if needed
view .claude/skills/pawkit-ui-ux/SKILL.md
```

### Skill Update Workflow

When completing significant work:

1. **Identify affected skills** - Which skills contain relevant patterns?
2. **Update skill content** - Add new patterns, update dates, document decisions
3. **Commit skill updates** - Include in same PR as feature work
4. **Update session history** - Add entry to `pawkit-project-context` if major milestone

---

## Skill File Structure

Each skill follows this format:

```markdown
---
name: skill-name
description: One-line description for quick reference
---

# Skill Title

**Purpose**: What this skill documents
**Status**: Current state (e.g., "Production-ready", "In development")
**Key Principle**: The most important rule

---

## SECTION 1

### Subsection
...patterns, examples, rules...

---

## Session Updates

### Session: [Date]
**Changes**: What was added/modified
```

---

## Cross-Referencing

Skills often reference each other:

- `pawkit-sync-patterns` → `pawkit-troubleshooting` (for specific bug fixes)
- `pawkit-ui-ux` → `pawkit-conventions` (for naming patterns)
- `pawkit-cloud-providers` → `pawkit-sync-patterns` (for sync architecture)
- `pawkit-api-patterns` → `pawkit-security` (for auth patterns)

When reading a skill that references another, read both if the task requires it.

---

## Maintenance

**Weekly**: Review `pawkit-project-context` session history for accuracy
**Per-feature**: Update relevant domain skills with new patterns
**Monthly**: Audit skill index for new skill needs or deprecations

---

**End of Skill Index**
