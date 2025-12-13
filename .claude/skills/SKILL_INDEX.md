# Pawkit Skill Index

> **Purpose**: Route AI agents (Claude Desktop + Claude Code) to the correct skill files based on task type.
> **Location**: `.claude/skills/SKILL_INDEX.md`
> **Last Updated**: December 13, 2025

---

## Quick Reference: Task → Skill Mapping

| Task Type | Primary Skill | Secondary Skills |
|-----------|---------------|------------------|
| **UI work** (components, styling, modals) | `pawkit-ui-ux/COMPONENT_REGISTRY.md` ⚠️ | `pawkit-ui-ux/UI_QUICK_REFERENCE.md` |
| **Sync/data issues** | `pawkit-sync-patterns` | `pawkit-troubleshooting` |
| **API routes** | `pawkit-api-patterns` | `pawkit-security` |
| **Cloud storage** (Filen, GDrive, etc.) | `pawkit-cloud-providers` | `pawkit-sync-patterns` |
| **Database/migrations** | `pawkit-migrations` | `pawkit-database` |
| **Supabase/RLS/backend** | `pawkit-database` | `pawkit-security` |
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

1. **FIRST**: `pawkit-ui-ux/COMPONENT_REGISTRY.md` - CSS variables, copy-paste patterns
2. **THEN**: `pawkit-ui-ux/UI_QUICK_REFERENCE.md` - Quick reference for Modern vs Glass
3. **IF NEEDED**: `pawkit-ui-ux/SKILL.md` - Full component documentation (Glass-focused)
4. **ALSO**: `docs/PAWKIT_UI_DESIGN_SYSTEM.md` - CSS variables and elevation system

### The Golden Rule: CSS Variables = Theme-Aware

**ALL components must use CSS variables** for backgrounds, shadows, borders. This is how theme switching works automatically:

```tsx
// ✅ CORRECT - Works in ALL themes (Modern, Glass, Light, Dark, Purple)
style={{ background: 'var(--bg-surface-2)' }}

// ❌ WRONG - Only works in Glass mode
className="bg-white/5 backdrop-blur-md"
```

### Key Rules:
- **Modern is the DEFAULT style** (solid surfaces with depth)
- **Glass is OPT-IN** (only when user enables it in settings)
- Use **CSS variables** so components work in ALL theme combinations
- Buttons must have **shadow + hover lift effect** (not flat!)
- Cards must have **elevation shadows** (not just borders)
- **No `backdrop-blur`** in component code (CSS handles this for Glass mode)

### Creating New UI = Support ALL Themes

When creating any new component, it must work with:
- Modern mode (default)
- Glass mode (transparent + blur)
- Light mode
- Dark mode  
- Purple tint
- ALL combinations of the above

**This is automatic if you use CSS variables correctly.**

**If CC creates flat buttons, uses hardcoded colors, or uses Glass patterns by default, it hasn't read the Component Registry.**

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

**THREE FILES - Read in order:**

1. **`COMPONENT_REGISTRY.md`** (READ FIRST!)
   - CSS variable system explained
   - 7 core UI patterns with copy-paste code
   - Existing components to use vs deprecate
   - Inline style templates
   - Theme combination support

2. **`UI_QUICK_REFERENCE.md`** (Quick decisions)
   - Modern vs Glass quick comparison
   - Common mistakes to avoid
   - Checklist before submitting UI work

3. **`SKILL.md`** (Full reference - optional)
   - Glass morphism details
   - Calendar components
   - Context menu patterns
   - Mobile patterns

**Key insight**: The main SKILL.md focuses heavily on Glass patterns because it was written when Glass was the default. Now Modern is default. Always check Component Registry first!

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

#### `pawkit-database`
**When to use**: Supabase backend, RLS policies, database schema, constraints, backend audits
**Contains**:
- Database schema overview (tables, relationships)
- RLS policies (all tables protected as of Dec 2025)
- Constraint patterns (per-user uniqueness)
- Supabase migration history
- Backend audit checklist (SQL queries)
- Common issues & fixes

**Read this**: Before any Supabase work, backend debugging, or security audits

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
- .claude/skills/pawkit-ui-ux/COMPONENT_REGISTRY.md (READ FIRST - CSS variables + patterns)
- .claude/skills/pawkit-ui-ux/UI_QUICK_REFERENCE.md (Modern vs Glass)
- .claude/skills/pawkit-conventions/SKILL.md

Style: Use CSS variables so it works in ALL themes

After completing, update:
- COMPONENT_REGISTRY.md if new pattern emerged
```

### For Claude Code (via filesystem)

At the start of any UI task:

```bash
# ALWAYS read Component Registry FIRST for UI work
view .claude/skills/pawkit-ui-ux/COMPONENT_REGISTRY.md

# Then Quick Reference
view .claude/skills/pawkit-ui-ux/UI_QUICK_REFERENCE.md

# Full skill only if needed
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
