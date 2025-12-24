# Editor Component Documentation

> Rich text editor system for Pawkit V2 notes and content editing

**Last Updated**: December 23, 2025
**Current Status**: Phase 7.1 - Foundation Complete

---

## Overview

The Editor component provides a rich text editing experience powered by Tiptap. It supports:
- Rich text formatting (bold, italic, code, links)
- Markdown shortcuts
- Slash commands for block insertion
- Task lists with checkboxes
- Auto-saving with debounce

---

## Architecture

```
src/components/editor/
├── editor.tsx           # Main editor component with floating toolbar
├── slash-command-menu.tsx # Slash command menu for block insertion
└── index.ts             # Exports
```

---

## Components

### Editor

Main Tiptap-based rich text editor component.

**Location**: `src/components/editor/editor.tsx`

**Props**:
```tsx
interface EditorProps {
  content: string;           // HTML content to edit
  onChange: (html: string) => void;  // Called when content changes
  placeholder?: string;      // Placeholder text
  className?: string;        // Additional CSS classes
  editable?: boolean;        // Whether editor is editable (default: true)
}
```

**Usage**:
```tsx
import { Editor } from '@/components/editor';

<Editor
  content={note.content}
  onChange={(html) => updateNote(note.id, { content: html })}
  placeholder="Start writing..."
/>
```

**Features**:
- **Floating Toolbar**: Appears on text selection with Bold, Italic, Code, Link buttons
- **Keyboard Shortcuts**:
  - `Cmd/Ctrl+B`: Bold
  - `Cmd/Ctrl+I`: Italic
  - `Cmd/Ctrl+K`: Insert link (via toolbar)
  - `Cmd/Ctrl+Z`: Undo
  - `Cmd/Ctrl+Shift+Z`: Redo
- **Markdown Shortcuts**:
  - `# ` → Heading 1
  - `## ` → Heading 2
  - `### ` → Heading 3
  - `- ` or `* ` → Bullet list
  - `1. ` → Numbered list
  - `[ ] ` → Task list item
  - `> ` → Blockquote
  - `` ``` `` → Code block

### SlashCommandMenu

Appears when typing `/` to insert block elements.

**Location**: `src/components/editor/slash-command-menu.tsx`

**Available Commands**:
| Command | Description |
|---------|-------------|
| `/heading1` | Large section heading |
| `/heading2` | Medium section heading |
| `/heading3` | Small section heading |
| `/bulletlist` | Create a simple list |
| `/orderedlist` | Create a numbered list |
| `/checklist` | Create a todo list |
| `/code` | Display code with syntax |
| `/blockquote` | Capture a quotation |
| `/divider` | Insert a horizontal line |

**Navigation**:
- `↑↓`: Navigate commands
- `Enter`: Select command
- `Esc`: Close menu
- Type to filter commands

---

## Integration Points

### Card Detail Modal

The editor is integrated into `card-detail-modal.tsx` for two use cases:

1. **Note Cards** (`type: 'md-note' | 'text-note' | 'quick-note'`):
   - Editor is used for the main `content` field
   - Edit/Preview toggle available
   - Content saved with 500ms debounce

2. **Bookmark Cards** (`type: 'url'`):
   - Editor is used for the `notes` field
   - Rich text notes about the bookmarked content

### Auto-Save

Content is automatically saved after 500ms of inactivity:
```tsx
const handleContentChange = useCallback((html: string) => {
  setContent(html);

  if (saveTimeoutRef.current) {
    clearTimeout(saveTimeoutRef.current);
  }

  saveTimeoutRef.current = setTimeout(() => {
    if (card && html !== card.content) {
      updateCard(card.id, { content: html });
    }
  }, 500);
}, [card, updateCard]);
```

---

## Styling

All editor styling uses CSS variables for theming compatibility:

**Text Colors**:
- `var(--color-text-primary)`: Main content
- `var(--color-text-secondary)`: Blockquotes
- `var(--color-text-muted)`: Placeholder, strikethrough

**Accent**:
- `var(--color-accent)`: Links, active toolbar buttons, checkboxes

**Glass Morphism**:
- `var(--glass-bg)`: Code blocks, checkboxes background
- `var(--glass-border)`: Code block borders, dividers
- `var(--glass-panel-bg)`: Floating toolbar background

**Toolbar Styling**:
```tsx
className={cn(
  'bg-[var(--glass-panel-bg)]',
  'backdrop-blur-[var(--glass-blur)] backdrop-saturate-[var(--glass-saturate)]',
  'border border-[var(--glass-border)]',
  'shadow-[var(--glass-shadow)]'
)}
```

---

## Tiptap Extensions

The editor uses these Tiptap extensions:

| Extension | Purpose |
|-----------|---------|
| `StarterKit` | Basic formatting, lists, headings, code blocks |
| `Placeholder` | Placeholder text when empty |
| `Link` | Hyperlink support |
| `TaskList` | Checkbox lists |
| `TaskItem` | Individual checkboxes |
| `Typography` | Smart quotes, dashes |

---

## Dependencies

```json
{
  "@tiptap/react": "^3.14.0",
  "@tiptap/starter-kit": "^3.14.0",
  "@tiptap/extension-placeholder": "^3.14.0",
  "@tiptap/extension-link": "^3.14.0",
  "@tiptap/extension-task-list": "^3.14.0",
  "@tiptap/extension-task-item": "^3.14.0",
  "@tiptap/extension-typography": "^3.14.0"
}
```

---

## Future Enhancements (Phase 7.2+)

- Wiki-links (`[[page-name]]` syntax)
- Backlinks panel
- **Block handles** (+ button for commands, ⋮⋮ drag handle for reordering)
- **Raw Markdown Toggle** (View/Edit source for power users)
- **Note Export** (Markdown and Plain Text formats)
- Image uploads
- Table support
- Code syntax highlighting
- Collaboration (CRDT-based)

---

## File Size

```
src/components/editor/
├── editor.tsx              ~10KB
├── slash-command-menu.tsx   ~6KB
└── index.ts                 ~0.1KB
```

Total: ~16KB

---

## Testing Checklist

- [x] Rich formatting works (bold, italic, links, lists, checkboxes)
- [x] Markdown shortcuts trigger correctly
- [x] Slash commands open menu and insert blocks
- [x] Floating menu appears on text selection
- [x] Content persists correctly via debounced save
- [x] Works in both light and dark mode
- [x] No TypeScript errors
