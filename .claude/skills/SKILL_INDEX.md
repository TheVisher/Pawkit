# Pawkit Skill Index

> **Purpose**: Route AI agents (Claude Desktop + Claude Code) to the correct skill files based on task type.
> **Location**: `.claude/skills/SKILL_INDEX.md`
> **Last Updated**: December 10, 2025

---

## Quick Reference: Task → Skill Mapping

| Task Type | Primary Skill | Secondary Skills |
|-----------|---------------|------------------|
| **UI work** (components, styling, modals) | `pawkit-ui-ux` | `pawkit-conventions` |
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

#### `pawkit-ui-ux`
**When to use**: Any UI/styling work, component creation, design consistency
**Contains**: 
- Glass morphism patterns (108KB of patterns!)
- Button, card, modal, slider patterns
- Calendar components
- Context menu patterns
- List view standardization
- Mobile glass patterns (React Native)
- Toast notification system
- Neumorphic-lite design system

**Key patterns**:
- `GlassPillButton`, `GlassCard`, `GlassModal`
- Purple glow = interaction indicator
- `rounded-3xl` for cards, `rounded-full` for pills
- Line icons only (no emojis!)

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
Task: Add a new glass modal for tag management

Skills to read:
- .claude/skills/pawkit-ui-ux/SKILL.md (Section: MODALS)
- .claude/skills/pawkit-conventions/SKILL.md

After completing, update:
- .claude/skills/pawkit-ui-ux/SKILL.md if new pattern emerged
```

### For Claude Code (via filesystem)

At the start of any task:

```bash
# Read relevant skills FIRST
view .claude/skills/SKILL_INDEX.md
view .claude/skills/pawkit-ui-ux/SKILL.md  # for UI work
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
