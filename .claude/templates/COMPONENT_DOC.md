---
component: "{component-name}"
complexity: "high | medium | low"
status: "stable | in-progress | planned | deprecated"
last_updated: "YYYY-MM-DD"
maintainer: "Claude Code"
---

# {Component Name}

> Brief one-line description of what this component does

---

## Purpose

What problem does this component solve? Why does it exist?

- Primary responsibility
- Key user interactions it enables
- Where it fits in the app architecture

---

## Architecture

### Data Flow

```
[Input] → [Processing] → [Output]
```

### Key Dependencies

| Dependency | Purpose |
|------------|---------|
| `useDataStore` | Example: Card data access |
| `dnd-kit` | Example: Drag and drop |

### State Management

- **Local state**: What React state does it manage?
- **Store connections**: Which Zustand stores does it read/write?
- **Props**: Key props and their purpose

---

## File Structure

```
src/components/{component-name}/
├── {main-file}.tsx       # Primary component
├── {sub-component}.tsx   # Supporting component
└── index.ts              # Exports (if applicable)
```

### File Responsibilities

| File | Lines | Purpose |
|------|-------|---------|
| `{main-file}.tsx` | ~XXX | Main component logic |
| `{sub-component}.tsx` | ~XXX | Specific sub-feature |

---

## Current Status

### What's Working

- [ ] Feature 1
- [ ] Feature 2

### What's Not Implemented

- [ ] Planned feature 1
- [ ] Planned feature 2

### Recent Changes

| Date | Change | Commit/PR |
|------|--------|-----------|
| YYYY-MM-DD | Description | — |

---

## Known Issues

| Issue | Severity | Workaround |
|-------|----------|------------|
| Description | Low/Medium/High | How to work around it |

---

## Usage Examples

### Basic Usage

```tsx
import { ComponentName } from '@/components/{component-name}'

<ComponentName prop="value" />
```

### With Common Props

```tsx
<ComponentName
  prop1="value"
  prop2={true}
  onAction={() => {}}
/>
```

---

## Testing Notes

- How to manually test this component
- Edge cases to verify
- Related test files (if any)

---

## Related Documentation

- [PLAYBOOK.md](../../docs/PLAYBOOK.md) - Architecture context
- [Relevant Skill](../../.claude/skills/pawkit-v2-{skill}/SKILL.md) - Patterns
- [Related Component](./related.md) - If applicable

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | YYYY-MM-DD | Initial documentation |
