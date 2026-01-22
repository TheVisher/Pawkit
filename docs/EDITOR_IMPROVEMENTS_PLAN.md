# Pawkit Editor Improvements Plan

> A phased approach to bringing the Pawkit editor up to modern PKM standards.
> Based on competitive analysis of Notion, Obsidian, Craft, Bear, Logseq, and others.

---

## Current State

**Foundation:** TipTap v3.14.0 (ProseMirror-based) - solid and extensible

**Existing Strengths:**
- @ Mentions with backlinks (excellent implementation)
- Slash commands (11 options)
- Basic tables with resize
- Task lists with checkboxes
- Auto-linking (phone, email, URLs)
- Three editor variants (full, notes, article)
- Supabase Storage already configured (`card-images` bucket)
- Image persistence system for expiring URLs

---

## Implementation Status Summary

| Phase | Feature | Status |
|-------|---------|--------|
| 0.1 | Photo Picker Storage |  Complete |
| 1.1 | Image Support in Editor |  Complete |
| 1.2 | Callout/Admonition Blocks |  Complete |
| 1.3 | Code Syntax Highlighting |  Complete |
| 2.1 | Enhanced Table Controls |  Complete |
| 2.2 | Multiple Highlight Colors |  Complete |
| 2.3 | Better Link Editing |  Complete |
| 2.4 | Toggle/Collapsible Sections |  Complete |
| 2.5 | Block Drag Handle + Menu |  Complete |
| 2.6 | Contextual Image Toolbar |  Not Started |
| 2.7 | Improved Slash Menu |  Complete |
| 2.8 | Enhanced Text Selection Toolbar |  Complete |
| 2.9 | Table of Contents Widget |  Not Started |
| 2.10 | Advanced Table Controls |  Not Started |
| 2.11 | Text Colors |  Complete |
| 3.1 | Markdown Export |  Complete |

**Completed:** 13/16 features (81%)
**Remaining:** Image toolbar, TOC widget, advanced table controls

---

## Phase 0: Quick Win - Fix Photo Picker Storage

### 0.1 Use Supabase Storage for Manual Photo Uploads

**Priority:**  Critical (Quick Win)
**Effort:** Low (infrastructure already exists)
**Files to modify:**
- `src/components/modals/card-photo-picker-modal.tsx`
- `src/lib/metadata/image-persistence.ts` (export `uploadToSupabase`)

#### Problem

Currently, manual photo uploads via the Card Photo Picker save images as **Base64 data URLs** directly to the Postgres database. This is inefficient:

| Upload Method | Current Behavior | Storage Location |
|---------------|------------------|------------------|
| TikTok/Instagram/Twitter bookmark | Auto-uploads to Supabase | `card-images` bucket  |
| Manual photo upload | Base64 data URL | Postgres database  |

**Issues with Base64:**
- Base64 is ~33% larger than binary (500KB image → 670KB string)
- Bloats Postgres database (500MB free tier limit)
- Slower to load and sync
- Wastes Postgres storage instead of using the 1GB Storage bucket

#### Solution

The `uploadToSupabase()` function already exists in `image-persistence.ts`. Just need to:

1. Export the function
2. Use it in the photo picker instead of `fileToDataUrl()`

**Step 1: Export the upload function**
```typescript
// src/lib/metadata/image-persistence.ts
// Change from:
async function uploadToSupabase(...) { ... }

// To:
export async function uploadToSupabase(...) { ... }
```

**Step 2: Update the photo picker**
```typescript
// src/components/modals/card-photo-picker-modal.tsx

import { uploadToSupabase } from '@/lib/metadata/image-persistence';
import imageCompression from 'browser-image-compression';

// Replace fileToDataUrl usage with:
const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file || !cardPhotoCardId) return;

  try {
    // Compress before upload
    const options = {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    };
    const compressedFile = await imageCompression(file, options);

    // Upload to Supabase Storage
    const url = await uploadToSupabase(
      cardPhotoCardId,
      compressedFile,
      compressedFile.type
    );

    if (url) {
      setPreviewImage(url);
      setActiveTab('adjust');
    } else {
      toast({ type: 'error', message: 'Failed to upload image' });
    }
  } catch (err) {
    console.error('Failed to upload file:', err);
    toast({ type: 'error', message: 'Failed to upload image' });
  }
}, [cardPhotoCardId, toast]);
```

**Step 3: Handle clipboard paste the same way**
```typescript
// In the paste handler, replace:
const dataUrl = await fileToDataUrl(blob);

// With:
const compressedBlob = await imageCompression(blob, options);
const url = await uploadToSupabase(cardPhotoCardId, compressedBlob, blob.type);
```

**Step 4: Install compression library**
```bash
npm install browser-image-compression
```

#### Optional: Migrate Existing Base64 Images

Create a one-time migration to convert existing Base64 images to Storage:

```typescript
// src/lib/migrations/migrate-base64-images.ts
import { db } from '@/lib/db';
import { uploadToSupabase } from '@/lib/metadata/image-persistence';

export async function migrateBase64Images() {
  const cards = await db.cards
    .filter(card => card.image?.startsWith('data:image/'))
    .toArray();

  console.log(`Found ${cards.length} cards with Base64 images`);

  for (const card of cards) {
    try {
      // Convert data URL to blob
      const response = await fetch(card.image!);
      const blob = await response.blob();

      // Upload to Supabase
      const url = await uploadToSupabase(card.id, blob, blob.type);

      if (url) {
        await db.cards.update(card.id, { image: url });
        console.log(`Migrated: ${card.id}`);
      }
    } catch (err) {
      console.error(`Failed to migrate ${card.id}:`, err);
    }
  }
}
```

#### Acceptance Criteria
- [x] Manual photo uploads go to Supabase Storage, not Base64
- [x] Clipboard paste uploads go to Supabase Storage
- [x] URL input still works (just saves the URL directly)
- [x] Images are compressed before upload (<500KB)
- [x] Existing Base64 images still display (backwards compatible)
- [ ] Optional: Migration script for existing Base64 images

---

## Phase 1: Essential Features (High Impact)

### 1.1 Image Support in Editor

**Priority:**  Critical
**Effort:** Medium
**Files to modify:**
- `src/components/editor/editor.tsx`
- `src/components/editor/slash-command-menu.tsx`
- `src/lib/metadata/image-persistence.ts` (extend existing)
- New: `src/lib/tiptap/extensions/image.ts`

#### Problem
Users cannot insert images into notes/articles. This is table stakes for any modern editor.

#### Solution

**A. Add TipTap Image Extension**
```bash
# Already available in TipTap
npm install @tiptap/extension-image
```

**B. Create Custom Image Extension with Upload**
```typescript
// src/lib/tiptap/extensions/image.ts
import Image from '@tiptap/extension-image'
import { Plugin } from '@tiptap/pm/state'

export const PawkitImage = Image.extend({
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleDrop: (view, event, slice, moved) => {
            // Handle drag-drop image upload
          },
          handlePaste: (view, event, slice) => {
            // Handle paste image upload
          },
        },
      }),
    ]
  },
})
```

**C. Storage Strategy (Supabase Free Tier Optimization)**

Since free tier has 1GB storage, implement these safeguards:

1. **Client-side compression before upload:**
   ```typescript
   // Use browser-image-compression library
   import imageCompression from 'browser-image-compression'

   const options = {
     maxSizeMB: 0.5,           // Max 500KB
     maxWidthOrHeight: 1920,   // Max dimension
     useWebWorker: true,
     fileType: 'image/webp',   // Convert to WebP (50-80% smaller)
   }
   const compressedFile = await imageCompression(file, options)
   ```

2. **Size limits with user feedback:**
   - Warn if original > 2MB
   - Reject if compressed still > 1MB
   - Show compression savings to user

3. **Storage monitoring:**
   - Track total storage used per user (store in user metadata)
   - Soft limit warning at 50MB per user
   - Hard limit at 100MB per user (free tier)

4. **Deduplication:**
   - Hash image content before upload
   - Reuse existing URL if same hash exists
   - Already partially implemented in `image-persistence.ts`

**D. Add to Slash Commands**
```typescript
// In slash-command-menu.tsx
{
  title: 'Image',
  description: 'Upload or embed an image',
  icon: ImageIcon,
  shortcut: '/image',
  command: ({ editor }) => {
    // Open file picker or URL input
    openImagePicker()
  },
}
```

**E. Image Node UI Features**
- Resize handles (drag corners)
- Alignment options (left, center, right)
- Caption support
- Alt text for accessibility
- Delete button on hover

#### Acceptance Criteria
- [x] Can paste images directly into editor
- [x] Can drag-drop images into editor
- [x] Can insert via slash command `/image`
- [x] Images compressed to <500KB WebP
- [x] Images stored in Supabase `card-images` bucket
- [x] Resize handles work (corner handles, proportional, width persists)
- [x] Images display inline in content

---

### 1.2 Callout/Admonition Blocks

**Priority:**  Critical
**Effort:** Medium
**Files to modify:**
- New: `src/lib/tiptap/extensions/callout.ts`
- New: `src/components/editor/callout-node-view.tsx`
- `src/components/editor/slash-command-menu.tsx`
- `src/styles/editor.css` (or equivalent)

#### Problem
No way to highlight important information (tips, warnings, notes, danger).

#### Solution

**A. Create Callout Extension**
```typescript
// src/lib/tiptap/extensions/callout.ts
import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { CalloutNodeView } from '@/components/editor/callout-node-view'

export type CalloutType = 'info' | 'warning' | 'tip' | 'danger' | 'note'

export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',  // Can contain multiple blocks

  addAttributes() {
    return {
      type: {
        default: 'info',
        parseHTML: el => el.getAttribute('data-type'),
        renderHTML: attrs => ({ 'data-type': attrs.type }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-callout]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-callout': '' }, HTMLAttributes), 0]
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutNodeView)
  },

  addCommands() {
    return {
      setCallout: (type: CalloutType) => ({ commands }) => {
        return commands.wrapIn(this.name, { type })
      },
      toggleCallout: (type: CalloutType) => ({ commands }) => {
        return commands.toggleWrap(this.name, { type })
      },
    }
  },
})
```

**B. Callout Node View Component**
```typescript
// src/components/editor/callout-node-view.tsx
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react'
import { Info, AlertTriangle, Lightbulb, AlertCircle, StickyNote } from 'lucide-react'

const calloutConfig = {
  info: { icon: Info, color: 'blue', label: 'Info' },
  warning: { icon: AlertTriangle, color: 'yellow', label: 'Warning' },
  tip: { icon: Lightbulb, color: 'green', label: 'Tip' },
  danger: { icon: AlertCircle, color: 'red', label: 'Danger' },
  note: { icon: StickyNote, color: 'gray', label: 'Note' },
}

export function CalloutNodeView({ node, updateAttributes }) {
  const type = node.attrs.type
  const config = calloutConfig[type]
  const Icon = config.icon

  return (
    <NodeViewWrapper>
      <div className={`callout callout-${type}`}>
        <div className="callout-icon">
          <Icon />
        </div>
        <div className="callout-content">
          <NodeViewContent />
        </div>
        {/* Type selector dropdown on hover */}
      </div>
    </NodeViewWrapper>
  )
}
```

**C. Add to Slash Commands**
```typescript
{
  title: 'Callout',
  description: 'Highlight important information',
  icon: InfoIcon,
  shortcut: '/callout',
  command: ({ editor }) => editor.chain().focus().setCallout('info').run(),
},
// Or individual types:
{
  title: 'Info',
  description: 'Informational callout',
  icon: InfoIcon,
  shortcut: '/info',
  command: ({ editor }) => editor.chain().focus().setCallout('info').run(),
},
{
  title: 'Warning',
  description: 'Warning callout',
  icon: AlertTriangleIcon,
  shortcut: '/warning',
  command: ({ editor }) => editor.chain().focus().setCallout('warning').run(),
},
// ... etc
```

**D. Styling**
```css
.callout {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  margin: 8px 0;
}

.callout-info { background: rgba(59, 130, 246, 0.1); border-left: 4px solid #3b82f6; }
.callout-warning { background: rgba(245, 158, 11, 0.1); border-left: 4px solid #f59e0b; }
.callout-tip { background: rgba(34, 197, 94, 0.1); border-left: 4px solid #22c55e; }
.callout-danger { background: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; }
.callout-note { background: rgba(107, 114, 128, 0.1); border-left: 4px solid #6b7280; }
```

#### Acceptance Criteria
- [x] Can create callout via `/callout`, `/info`, `/warning`, `/tip`, `/danger`
- [x] Callouts render with correct icon and color
- [x] Can type content inside callout
- [x] Can change callout type after creation
- [x] Can nest other blocks inside callout (lists, code, etc.)
- [x] Can delete callout (unwrap to normal content)

---

### 1.3 Code Syntax Highlighting

**Priority:**  High
**Effort:** Low
**Files to modify:**
- `src/components/editor/editor.tsx`
- `src/components/editor/slash-command-menu.tsx`
- New: `src/lib/tiptap/extensions/code-block-lowlight.ts`

#### Problem
Code blocks are plain monospace text with no syntax highlighting.

#### Solution

**A. Install Dependencies**
```bash
npm install @tiptap/extension-code-block-lowlight lowlight
```

**B. Configure Extension**
```typescript
// src/lib/tiptap/extensions/code-block-lowlight.ts
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'

// Import specific languages to reduce bundle size
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import css from 'highlight.js/lib/languages/css'
import html from 'highlight.js/lib/languages/xml'
import json from 'highlight.js/lib/languages/json'
import bash from 'highlight.js/lib/languages/bash'
import sql from 'highlight.js/lib/languages/sql'

const lowlight = createLowlight(common)
lowlight.register('javascript', javascript)
lowlight.register('typescript', typescript)
lowlight.register('python', python)
lowlight.register('css', css)
lowlight.register('html', html)
lowlight.register('json', json)
lowlight.register('bash', bash)
lowlight.register('sql', sql)

export const PawkitCodeBlock = CodeBlockLowlight.configure({
  lowlight,
  defaultLanguage: 'plaintext',
})
```

**C. Replace StarterKit CodeBlock**
```typescript
// In editor.tsx
StarterKit.configure({
  codeBlock: false, // Disable default
}),
PawkitCodeBlock, // Use lowlight version
```

**D. Add Language Selector UI**
```typescript
// NodeView for code blocks with language dropdown
export function CodeBlockNodeView({ node, updateAttributes }) {
  return (
    <NodeViewWrapper>
      <select
        value={node.attrs.language}
        onChange={(e) => updateAttributes({ language: e.target.value })}
      >
        <option value="plaintext">Plain text</option>
        <option value="javascript">JavaScript</option>
        <option value="typescript">TypeScript</option>
        <option value="python">Python</option>
        {/* ... */}
      </select>
      <pre>
        <NodeViewContent as="code" />
      </pre>
    </NodeViewWrapper>
  )
}
```

**E. Add Styles**
```css
/* Import a highlight.js theme */
@import 'highlight.js/styles/github-dark.css';

/* Or customize for dark/light mode */
.hljs-keyword { color: #c678dd; }
.hljs-string { color: #98c379; }
.hljs-number { color: #d19a66; }
/* ... */
```

#### Acceptance Criteria
- [x] Code blocks have syntax highlighting
- [x] Language selector dropdown on code blocks (36 languages available)
- [x] At least 8 languages supported (JS, TS, Python, CSS, HTML, JSON, Bash, SQL)
- [x] Highlighting works in dark/light mode
- [x] Copy button on code blocks (hover to show, checkmark feedback)

---

## Phase 2: Polish Features (Medium Impact)

### 2.1 Enhanced Table Controls

**Priority:**  Medium
**Effort:** Medium
**Files to modify:**
- `src/components/editor/editor.tsx`
- New: `src/components/editor/table-controls.tsx`

#### Problem
Tables only have keyboard-based controls. No visual way to add/remove rows/columns.

#### Solution

**A. Create Table Controls Component**
```typescript
// src/components/editor/table-controls.tsx
export function TableControls({ editor }) {
  return (
    <div className="table-controls">
      <button onClick={() => editor.chain().focus().addRowBefore().run()}>
        + Row Above
      </button>
      <button onClick={() => editor.chain().focus().addRowAfter().run()}>
        + Row Below
      </button>
      <button onClick={() => editor.chain().focus().addColumnBefore().run()}>
        + Col Left
      </button>
      <button onClick={() => editor.chain().focus().addColumnAfter().run()}>
        + Col Right
      </button>
      <button onClick={() => editor.chain().focus().deleteRow().run()}>
        Delete Row
      </button>
      <button onClick={() => editor.chain().focus().deleteColumn().run()}>
        Delete Column
      </button>
      <button onClick={() => editor.chain().focus().deleteTable().run()}>
        Delete Table
      </button>
    </div>
  )
}
```

**B. Show Controls on Table Selection**
- Floating toolbar appears when cursor is in table
- Or: Plus buttons at row/column edges (Notion-style)

**C. Keyboard Shortcuts**
```typescript
// Add to editor
addKeyboardShortcuts() {
  return {
    'Mod-Alt-ArrowUp': () => this.editor.commands.addRowBefore(),
    'Mod-Alt-ArrowDown': () => this.editor.commands.addRowAfter(),
    'Mod-Alt-ArrowLeft': () => this.editor.commands.addColumnBefore(),
    'Mod-Alt-ArrowRight': () => this.editor.commands.addColumnAfter(),
  }
}
```

#### Acceptance Criteria
- [x] Visual buttons to add rows/columns (floating toolbar + Notion-style edge buttons)
- [x] Visual buttons to delete rows/columns (dropdown menus)
- [x] Keyboard shortcuts for table operations
- [x] Controls appear contextually when in table

---

### 2.2 Multiple Highlight Colors

**Priority:**  Medium
**Effort:** Low
**Files to modify:**
- `src/components/editor/editor.tsx`
- `src/components/editor/toolbar.tsx` (or bubble menu)

#### Problem
Only one highlight color available (and only in ArticleEditor).

#### Solution

**A. Configure Highlight Extension with Colors**
```typescript
import Highlight from '@tiptap/extension-highlight'

Highlight.configure({
  multicolor: true,
})
```

**B. Add Color Picker to Toolbar**
```typescript
const highlightColors = [
  { name: 'Yellow', value: '#fef08a' },
  { name: 'Green', value: '#bbf7d0' },
  { name: 'Blue', value: '#bfdbfe' },
  { name: 'Pink', value: '#fbcfe8' },
  { name: 'Orange', value: '#fed7aa' },
]

// In toolbar
<DropdownMenu>
  <DropdownMenuTrigger>
    <HighlighterIcon />
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    {highlightColors.map(color => (
      <DropdownMenuItem
        key={color.value}
        onClick={() => editor.chain().focus().toggleHighlight({ color: color.value }).run()}
      >
        <div style={{ background: color.value }} className="w-4 h-4 rounded" />
        {color.name}
      </DropdownMenuItem>
    ))}
    <DropdownMenuItem onClick={() => editor.chain().focus().unsetHighlight().run()}>
      Remove highlight
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**C. Keyboard Shortcut for Last Used Color**
```typescript
// Cmd+Shift+H applies last used highlight color
// Store last color in localStorage
```

#### Acceptance Criteria
- [x] 5 highlight colors available
- [x] Color picker in toolbar/bubble menu
- [x] Keyboard shortcut applies last used color
- [x] Remove highlight option

---

### 2.3 Better Link Editing

**Priority:**  Medium
**Effort:** Medium
**Files to modify:**
- `src/components/editor/editor.tsx`
- New: `src/components/editor/link-popover.tsx`

#### Problem
Links use `window.prompt()` which is ugly and jarring.

#### Solution

**A. Create Link Popover Component**
```typescript
// src/components/editor/link-popover.tsx
import { Popover } from '@/components/ui/popover'

export function LinkPopover({ editor, isOpen, onClose }) {
  const [url, setUrl] = useState(editor.getAttributes('link').href || '')

  const setLink = () => {
    if (url) {
      editor.chain().focus().setLink({ href: url }).run()
    } else {
      editor.chain().focus().unsetLink().run()
    }
    onClose()
  }

  return (
    <Popover open={isOpen} onOpenChange={onClose}>
      <PopoverContent>
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter URL..."
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && setLink()}
        />
        <div className="flex gap-2 mt-2">
          <Button onClick={setLink}>Save</Button>
          <Button variant="ghost" onClick={() => {
            editor.chain().focus().unsetLink().run()
            onClose()
          }}>
            Remove
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
```

**B. Show Popover on Cmd+K or Link Click**
```typescript
// Listen for Cmd+K
// Show popover positioned near selection
// Also show when clicking existing link
```

**C. Link Preview on Hover**
```typescript
// Optional: Show URL preview when hovering links
// Similar to VS Code link hover
```

#### Acceptance Criteria
- [x] Cmd+K opens inline link popover
- [x] Can edit existing link URL
- [x] Can remove link
- [x] Popover positioned near selection
- [x] Press Enter to save

---

### 2.4 Toggle/Collapsible Sections

**Priority:**  Medium
**Effort:** Medium
**Files to modify:**
- New: `src/lib/tiptap/extensions/toggle.ts`
- New: `src/components/editor/toggle-node-view.tsx`
- `src/components/editor/slash-command-menu.tsx`

#### Problem
No way to create collapsible sections for organizing long content.

#### Solution

**A. Create Toggle Extension**
```typescript
// src/lib/tiptap/extensions/toggle.ts
import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'

export const Toggle = Node.create({
  name: 'toggle',
  group: 'block',
  content: 'block+',

  addAttributes() {
    return {
      open: { default: true },
      summary: { default: 'Toggle' },
    }
  },

  parseHTML() {
    return [{ tag: 'details' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['details', mergeAttributes(HTMLAttributes), 0]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ToggleNodeView)
  },
})
```

**B. Toggle Node View**
```typescript
// src/components/editor/toggle-node-view.tsx
export function ToggleNodeView({ node, updateAttributes }) {
  const [isOpen, setIsOpen] = useState(node.attrs.open)

  return (
    <NodeViewWrapper>
      <div className="toggle">
        <button
          className="toggle-header"
          onClick={() => {
            setIsOpen(!isOpen)
            updateAttributes({ open: !isOpen })
          }}
        >
          <ChevronRight className={isOpen ? 'rotate-90' : ''} />
          <span contentEditable suppressContentEditableWarning>
            {node.attrs.summary}
          </span>
        </button>
        {isOpen && (
          <div className="toggle-content">
            <NodeViewContent />
          </div>
        )}
      </div>
    </NodeViewWrapper>
  )
}
```

**C. Add to Slash Commands**
```typescript
{
  title: 'Toggle',
  description: 'Collapsible section',
  icon: ChevronRight,
  shortcut: '/toggle',
  command: ({ editor }) => editor.chain().focus().insertContent({
    type: 'toggle',
    attrs: { summary: 'Click to expand' },
    content: [{ type: 'paragraph' }],
  }).run(),
}
```

#### Acceptance Criteria
- [x] Can create toggle via `/toggle`
- [x] Toggle header is editable
- [x] Click chevron to expand/collapse
- [x] Content hidden when collapsed
- [x] Can nest any blocks inside toggle

---

### 2.5 Block Drag Handle + Add Button

**Priority:**  Medium
**Effort:** Medium
**Status:**  Implemented
**Files modified:**
- `src/components/editor/editor.tsx`
- `src/components/editor/block-handle.tsx`

#### Problem
No visual way to drag blocks to reorder them. Users need a handle that follows the cursor between blocks, with a "+" button to quickly insert new blocks.

#### Solution (Implemented)

**A. Custom Block Handle Component**
Created `block-handle.tsx` with:
- Single grip icon (⋮⋮) that appears on block hover
- Click opens contextual menu styled to match slash command menu
- Drag to reorder blocks with custom drop handler

**B. Block Options Menu**
Menu includes (styled with glass panel to match slash menu):
- Block type header showing current block type
- **Add block below** - inserts paragraph and opens slash menu
- **Color** submenu - 7 text colors + 5 background colors
- **Turn Into** submenu - convert to heading, paragraph, lists, code, quote
- **Duplicate** - copies block below
- **Copy** - copies block as HTML to clipboard
- **Delete** - removes the block

**C. Position Behavior**
- Handle constrained within modal padding (doesn't fall off edge)
- Finds scrollable parent container for bounds calculation
- Positioned 36px left of block content

**D. Custom Drag & Drop**
- Custom data type `application/x-pawkit-block` for drag operations
- Drop handler in editor.tsx that deletes from source and inserts at target
- NodeSelection applied during drag for visual feedback

#### Acceptance Criteria
- [x] Drag handle appears on block hover
- [x] Can drag blocks to reorder (custom drop handler implementation)
- [x] Menu includes "Add block below" (replaces separate + button)
- [x] Handle follows cursor between blocks
- [x] Handle stays within modal bounds
- [x] Block options menu (Color, Turn Into, Duplicate, Copy, Delete)
- [x] Menu styled to match slash command menu (glass panel, icon boxes)
- [x] Clicking handle selects/highlights the block

---

### 2.6 Contextual Image Toolbar

**Priority:**  Medium
**Effort:** Medium
**Files to modify:**
- `src/components/editor/editor.tsx`
- New: `src/components/editor/image-toolbar.tsx`

#### Problem
When clicking on images, there's no contextual menu for common actions like alignment, captions, download, replace, or delete.

#### Solution

**A. Create Image Toolbar Component**
```typescript
// Toolbar appears above selected image with:
// - Alignment buttons (left, center, right)
// - Add caption toggle
// - Download original
// - Replace image
// - Delete image
```

**B. Purple Resize Handles**
- Subtle purple corner handles on image hover
- More visually appealing than default handles

#### Acceptance Criteria
- [ ] Toolbar appears when image is selected
- [ ] Can align image left/center/right
- [ ] Can add/edit caption below image
- [ ] Can download original image
- [ ] Can replace image (opens picker)
- [ ] Can delete image
- [ ] Purple resize handles on hover

---

### 2.7 Improved Slash Menu with Categories

**Priority:**  Medium
**Effort:** Medium
**Files to modify:**
- `src/components/editor/slash-command-menu.tsx`

#### Problem
Current slash menu is a flat list. TipTap Notion template has categorized sections (AI, Style, Insert, Upload) with better visual organization.

#### Solution

**A. Categorize Commands**
```typescript
const commandGroups = [
  {
    title: 'AI',
    commands: ['aiComplete', 'aiSummarize', 'aiSimplify', 'aiExtend'],
  },
  {
    title: 'Format',
    commands: ['text', 'heading1', 'heading2', 'heading3'],
  },
  {
    title: 'Insert',
    commands: ['table', 'image', 'codeBlock', 'quote', 'divider'],
  },
  {
    title: 'Lists',
    commands: ['bulletList', 'numberedList', 'todoList', 'toggle'],
  },
]
```

**B. Visual Improvements**
- Section headers with subtle styling
- Icons for each command
- Keyboard shortcut hints on right side
- Better hover states

#### Acceptance Criteria
- [x] Commands grouped by category (Format, Lists, Insert, Callouts)
- [x] Section headers visible
- [x] Icons for all commands (in styled boxes)
- [x] Keyboard shortcuts shown
- [x] Search filters across all categories
- [x] Command descriptions added

---

### 2.8 Enhanced Text Selection Toolbar

**Priority:**  Medium
**Effort:** Medium
**Files to modify:**
- `src/components/editor/editor.tsx`
- `src/components/editor/bubble-menu.tsx` (existing)

#### Problem
Current bubble menu is basic. TipTap Notion template has additional features like "Turn Into" dropdown and text alignment options.

#### Solution

**A. Add "Turn Into" Dropdown**
```typescript
// Dropdown to convert selected block to:
// - Text (paragraph)
// - Heading 1/2/3
// - Bullet list
// - Numbered list
// - Todo list
// - Quote
// - Code block
```

**B. Add Alignment Options**
- Left, center, right alignment buttons
- Works for paragraphs and headings

**C. More Formatting Options**
- Strikethrough
- Subscript/superscript (if needed)
- Clear formatting button

#### Acceptance Criteria
- [x] "Turn Into" dropdown to convert block types
- [x] Alignment buttons (left/center/right)
- [x] Strikethrough option
- [x] Clear formatting button

---

### 2.9 Table of Contents Widget

**Priority:**  Nice to Have
**Effort:** Medium
**Files to modify:**
- New: `src/components/editor/table-of-contents.tsx`
- `src/components/editor/editor.tsx`

#### Problem
Long documents need a way to navigate between sections. TipTap Notion template has a floating TOC widget.

#### Solution

**A. Create TOC Component**
```typescript
// Floating widget (upper right) showing:
// - All headings in document
// - Click to scroll to heading
// - Highlight current section
// - Collapsible for space
```

**B. Auto-generate from Headings**
- Extract all H1/H2/H3 from document
- Update on content change
- Smooth scroll on click

#### Acceptance Criteria
- [ ] TOC widget visible for documents with headings
- [ ] Shows H1/H2/H3 hierarchy
- [ ] Click scrolls to heading
- [ ] Highlights current section
- [ ] Can collapse/hide widget

---

### 2.10 Advanced Table Controls

**Priority:**  Medium
**Effort:** High
**Files to modify:**
- `src/components/editor/editor.tsx`
- New: `src/components/editor/table-row-menu.tsx`
- New: `src/components/editor/table-column-menu.tsx`

#### Problem
Current table controls are in a floating toolbar. TipTap Notion template has more intuitive inline controls:
- Plus buttons on row/column edges for quick add
- Drag handles on rows for reordering
- Background color options for cells
- Column options dropdown (sort, hide, delete)

#### Solution

**A. Edge Add Buttons**
```typescript
// Show "+" button on:
// - Right edge of last column (add column)
// - Bottom edge of last row (add row)
// - Between rows/columns on hover
```

**B. Row Drag Handles**
```typescript
// Handle on left of each row to:
// - Drag to reorder
// - Right-click for row menu
```

**C. Cell Background Colors**
```typescript
// Context menu or toolbar option to set:
// - Cell background color
// - Row background color
// - Column background color
```

**D. Column Options Menu**
```typescript
// Dropdown on column header with:
// - Sort ascending/descending
// - Insert column left/right
// - Delete column
// - Resize column
```

#### Acceptance Criteria
- [ ] "+" buttons on table edges for quick add
- [ ] "+" buttons between rows/columns on hover
- [ ] Row drag handles for reordering
- [ ] Cell/row/column background colors
- [ ] Column header dropdown menu
- [ ] Sort by column

---

### 2.11 Text Colors

**Priority:**  Nice to Have
**Effort:** Low
**Files to modify:**
- `src/components/editor/editor.tsx`
- `src/components/editor/toolbar.tsx`

#### Solution

**A. Install Color Extension**
```bash
npm install @tiptap/extension-color @tiptap/extension-text-style
```

**B. Configure**
```typescript
import { Color } from '@tiptap/extension-color'
import TextStyle from '@tiptap/extension-text-style'

// Add to extensions
TextStyle,
Color,
```

**C. Add Color Picker**
```typescript
const textColors = [
  { name: 'Default', value: null },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Gray', value: '#6b7280' },
]

// In toolbar
editor.chain().focus().setColor('#ef4444').run()
editor.chain().focus().unsetColor().run()
```

#### Acceptance Criteria
- [x] Can change text color
- [x] 6+ color options (7 implemented)
- [x] Can reset to default color

---

## Phase 3: Export & Advanced Features

### 3.1 Markdown Export

**Priority:**  Medium
**Effort:** Medium
**Files to modify:**
- New: `src/lib/tiptap/markdown.ts`
- Card context menu or detail view

#### Problem
Content locked in HTML format. Users can't export notes as Markdown.

#### Solution

**A. Install Markdown Extension**
```bash
npm install @tiptap/pm # if not already
```

**B. Create Export Utility**
```typescript
// src/lib/tiptap/markdown.ts
import { generateJSON, generateHTML } from '@tiptap/core'
import TurndownService from 'turndown'

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
})

// Custom rules for Pawkit-specific nodes
turndownService.addRule('callout', {
  filter: (node) => node.hasAttribute('data-callout'),
  replacement: (content, node) => {
    const type = node.getAttribute('data-type')
    return `> [!${type}]\n> ${content.replace(/\n/g, '\n> ')}\n\n`
  },
})

export function htmlToMarkdown(html: string): string {
  return turndownService.turndown(html)
}

export function copyAsMarkdown(editor: Editor) {
  const html = editor.getHTML()
  const markdown = htmlToMarkdown(html)
  navigator.clipboard.writeText(markdown)
}

export function downloadAsMarkdown(editor: Editor, filename: string) {
  const markdown = htmlToMarkdown(editor.getHTML())
  const blob = new Blob([markdown], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.md`
  a.click()
  URL.revokeObjectURL(url)
}
```

**C. Add Export Options**
- Right-click menu: "Copy as Markdown"
- Card menu: "Export as Markdown"
- Keyboard shortcut: Cmd+Shift+C for copy as markdown

#### Acceptance Criteria
- [x] Can copy content as Markdown (Cmd+Shift+C or context menu)
- [x] Can download as .md file (context menu "Export as Markdown")
- [x] Callouts export as Obsidian-style `> [!type]`
- [x] Code blocks export with language fence
- [x] Mentions export as [[wiki-links]] for cards/pawkits, plain text for dates

---

### 3.2 Slash Command Expansion

**Priority:**  Nice to Have
**Effort:** Low
**Files to modify:**
- `src/components/editor/slash-command-menu.tsx`

#### Add New Commands

```typescript
const commands = [
  // Existing...

  // New commands after implementing above features:
  { title: 'Image', icon: ImageIcon, shortcut: '/image' },
  { title: 'Callout', icon: InfoIcon, shortcut: '/callout' },
  { title: 'Info', icon: InfoIcon, shortcut: '/info' },
  { title: 'Warning', icon: AlertTriangleIcon, shortcut: '/warning' },
  { title: 'Tip', icon: LightbulbIcon, shortcut: '/tip' },
  { title: 'Toggle', icon: ChevronRightIcon, shortcut: '/toggle' },

  // Future:
  { title: 'Embed', icon: LinkIcon, shortcut: '/embed' },
  { title: 'Date', icon: CalendarIcon, shortcut: '/date' },
]
```

#### Categorize Commands
```typescript
const commandGroups = [
  {
    title: 'Basic',
    commands: ['text', 'heading1', 'heading2', 'heading3'],
  },
  {
    title: 'Lists',
    commands: ['bulletList', 'numberedList', 'todoList', 'toggle'],
  },
  {
    title: 'Blocks',
    commands: ['quote', 'callout', 'code', 'divider', 'table'],
  },
  {
    title: 'Media',
    commands: ['image', 'embed'],
  },
]
```

---

### 3.3 Keyboard Shortcuts Documentation

**Priority:**  Nice to Have
**Effort:** Low

#### Add Help Modal

```typescript
// src/components/modals/keyboard-shortcuts-modal.tsx
const shortcuts = [
  { category: 'Formatting', items: [
    { keys: ['Cmd', 'B'], description: 'Bold' },
    { keys: ['Cmd', 'I'], description: 'Italic' },
    { keys: ['Cmd', 'K'], description: 'Insert link' },
    { keys: ['Cmd', 'Shift', 'H'], description: 'Highlight' },
  ]},
  { category: 'Blocks', items: [
    { keys: ['/'], description: 'Open slash commands' },
    { keys: ['@'], description: 'Mention card, Pawkit, or date' },
    { keys: ['Cmd', 'Shift', 'Backspace'], description: 'Delete table' },
  ]},
  // ...
]
```

#### Trigger
- `Cmd + /` or `?` to open shortcuts modal
- Link in editor placeholder text

---

## Phase 4: Future Considerations

### 4.1 AI Writing Assistance
- Summarize selection
- Expand/continue writing
- Fix grammar/spelling
- Change tone
- Requires API integration (OpenAI, Claude, etc.)

### 4.2 Real-Time Collaboration
- Yjs integration with TipTap
- Cursor presence
- Requires WebSocket server or Supabase Realtime

### 4.3 Math/LaTeX Support
- `@tiptap/extension-mathematics`
- KaTeX rendering
- Inline and block equations

### 4.4 Mermaid Diagrams
- Code blocks with `mermaid` language
- Auto-render diagram preview

### 4.5 Block References
- Reference specific blocks from other notes
- Transclusion (embed blocks that stay in sync)

---

## Implementation Order Recommendation

### Sprint 0 (Quick Win - Do First!)
0. **Fix Photo Picker Storage** - Uses existing infrastructure, stops Base64 bloat
   - Export `uploadToSupabase()` from `image-persistence.ts`
   - Update `card-photo-picker-modal.tsx` to use it
   - Install `browser-image-compression`
   - ~1-2 hours of work, immediate benefit

### Sprint 1 (Essential)
1. **Image Support in Editor** - Highest user impact
2. **Callouts** - Second most requested feature
3. **Code Highlighting** - Quick win, low effort

### Sprint 2 (Polish)
4. **Better Link Editing** - UX improvement
5. **Multiple Highlight Colors** - Quick win
6. **Toggle Sections** - Useful for long content

### Sprint 3 (Power Features)
7. **Table Controls** - Usability improvement
8. **Markdown Export** - Data portability
9. **Text Colors** - Nice to have

### Sprint 4 (Refinement)
10. **Slash Command Expansion** - After features are built
11. **Keyboard Shortcuts Modal** - Documentation
12. **Performance optimization** - As needed

---

## Technical Notes

### Bundle Size Considerations
- Use dynamic imports for heavy extensions (lowlight, image compression)
- Tree-shake unused highlight.js languages
- Lazy load modals and popovers

### Testing Approach
- Unit tests for markdown export
- Integration tests for slash commands
- E2E tests for image upload flow
- Visual regression tests for callout styles

### Migration Path
- New extensions should be additive (no breaking changes)
- Existing content renders without new extensions
- Graceful degradation if extension fails to load

---

## Appendix: Supabase Storage Limits (Free Tier)

| Resource | Limit |
|----------|-------|
| Storage | 1 GB |
| Bandwidth | 2 GB / month |
| File uploads | Unlimited |
| Max file size | 50 MB (configurable) |

### Optimization Strategies
1. Compress images to WebP (<500KB)
2. Track per-user storage usage
3. Implement soft/hard limits
4. Deduplicate identical images
5. Consider CDN for frequently accessed images

---

## Appendix: TipTap Extensions Reference

| Extension | Purpose | Bundle Size |
|-----------|---------|-------------|
| `@tiptap/extension-image` | Image blocks | ~5KB |
| `@tiptap/extension-code-block-lowlight` | Syntax highlighting | ~15KB + languages |
| `@tiptap/extension-highlight` | Text highlighting | ~3KB |
| `@tiptap/extension-color` | Text color | ~3KB |
| `@tiptap/extension-text-style` | Required for color | ~2KB |
| `browser-image-compression` | Client compression | ~20KB |
| `turndown` | HTML to Markdown | ~15KB |

---

## Appendix: Competitive Research (January 2026)

> Research conducted comparing Pawkit to Notion, Obsidian, Recall, Fabric, Mem.ai, Capacities, Tana, and Logseq.

### Gap Analysis Summary

#### High Priority Gaps (Features most competitors have)

| Feature | Pawkit | Notion | Obsidian | Recall | Fabric | Tana | Priority |
|---------|--------|--------|----------|--------|--------|------|----------|
| Graph View |  |  |  |  |  |  |  High |
| AI Summarization |  |  | Plugins |  |  |  |  High |
| Semantic Search |  |  |  |  |  |  |  High |
| AI Chat with Notes |  |  | Plugins |  |  |  |  High |
| Embeds (YouTube, etc) |  |  50+ |  |  |  |  |  Medium |
| Voice Notes |  |  |  |  |  |  |  Medium |
| Canvas/Whiteboard |  |  |  |  |  |  |  Medium |
| Version History |  |  |  Git |  |  |  |  Medium |
| Markdown Export |  |  |  Native |  |  |  |  Medium |
| Public Sharing |  |  |  Publish |  |  |  |  Low |
| Math/LaTeX |  |  |  |  |  |  |  Low |
| Real-time Collab |  |  | Plugins |  |  |  |  Low |

#### Pawkit Strengths (What we have that others don't)

| Feature | Pawkit | Competitors |
|---------|--------|-------------|
| YouTube Transcript Extraction |  | Only Recall |
| Supertags with Auto-Templates |  10 types | Tana has similar |
| Offline-First with Sync |  IndexedDB | Notion just added (2025), Obsidian local-only |
| Browser Extension + Web Clipper |  | Most have basic clippers |
| Link Health Checking |  | Unique feature |
| Multi-view Layouts |  Grid/List/Board/Timeline | Notion has similar |
| Daily Notes Widget |  | Obsidian, Logseq |

---

### Detailed Competitor Analysis

#### Notion (notion.com)

**Key Strengths:**
- 50+ block types with slash commands
- Full database functionality (relations, rollups, filters)
- 30,000+ templates in marketplace
- Real-time collaboration with cursor tracking
- AI features: summarization, writing assist, AI database properties
- Offline mode added 2025

**Unique Features:**
- Databases with multiple views (table, board, timeline, calendar, gallery)
- Notion 3.0 AI Agents (autonomous workflow execution)
- Connected app search (Slack, Google Drive without leaving Notion)

**Weaknesses:**
- Cloud-dependent (no true local-first)
- Complex learning curve
- Performance issues with large databases

---

#### Obsidian (obsidian.md)

**Key Strengths:**
- Local-first with plain markdown files
- 2,692+ community plugins
- Graph view for visualizing connections
- Canvas/whiteboard for visual thinking
- True data ownership (no vendor lock-in)

**Unique Features:**
- Canvas: infinite 2D space with embedded notes, images, web pages
- Plugin ecosystem allows almost unlimited customization
- Publish feature for static sites
- Open JSON Canvas format

**Weaknesses:**
- Steeper learning curve
- No built-in collaboration
- Mobile experience historically weaker

---

#### Recall (getrecall.ai)

**Key Strengths:**
- One-click AI summaries of any content
- Spaced repetition with algorithmically-generated quizzes
- Knowledge graph with auto-tagging
- Augmented browsing (shows relevant saves while you browse)

**Unique Features:**
- **Spaced repetition for retention** - unique among PKM apps
- Auto-summarizes articles, YouTube, podcasts, PDFs
- Conversational AI to chat with your entire knowledge base

**Weaknesses:**
- No editor/note-taking (consumption-focused)
- Cloud-based only

---

#### Fabric (fabric.so)

**Key Strengths:**
- "Death to organizing" - AI handles all organization
- Voice notes with AI transcription
- Photo-based search (take a photo, find related content)
- Semantic search by meaning, not keywords

**Unique Features:**
- **Voice capture** - ideal for mobile/on-the-go
- **Photo search** - visually find content
- Auto smart-linking suggests connections

**Weaknesses:**
- Limited editing capabilities
- Newer product, less mature

---

#### Mem.ai

**Key Strengths:**
- Self-organizing workspace
- AI Collections (auto-curated note groups)
- Temporal context awareness
- Mem Chat for Q&A with your notes

**Unique Features:**
- **Temporal awareness** - surfaces time-relevant content (seasonal docs, periodic reports)
- Related Notes surfacing (78% improved decision-making reported)

**Weaknesses:**
- Requires internet
- Some integration limitations

---

#### Capacities

**Key Strengths:**
- Object-based organization (people, books, projects instead of folders)
- Objects can belong to multiple contexts
- Custom properties and filtering
- Bridges Zettelkasten methodology with modern features

**Unique Features:**
- **Object paradigm** - think in entities, not pages
- Each object type has different properties

**Weaknesses:**
- Learning curve for object-based thinking
- Smaller ecosystem

---

#### Tana

**Key Strengths:**
- Supertags transform unstructured → structured data instantly
- AI command nodes with event triggers
- Multi-model AI (OpenAI, Claude, Gemini)
- Botless meeting transcription

**Unique Features:**
- **Supertags** - a note can be #task, #project, #concept with associated fields
- **AI automation** - build custom workflows with event triggers
- Same info can be note, task, or project depending on context

**Weaknesses:**
- Complex for simple use cases
- Cloud-based only

---

#### Logseq

**Key Strengths:**
- Privacy-first, open-source, local-first
- Outliner + bidirectional linking + graph
- Whiteboard feature
- Database version coming with RTC collaboration

**Unique Features:**
- **Fully open-source** (only one in this list)
- **Local AI via plugins** (can use Ollama for privacy)
- Plain text Markdown/Org mode files

**Weaknesses:**
- Less polished UI
- Slower development pace

---

### Recommended Future Features for Pawkit

#### Phase 5: AI Integration (High Priority)

**5.1 AI Summarization**
- Auto-summarize bookmarked articles
- Condense long notes
- Generate TL;DR for cards

**5.2 Semantic Search**
- Search by meaning, not just keywords
- "Find notes about productivity" returns relevant content even without that word
- Embedding-based similarity search

**5.3 AI Chat Interface**
- "What did I save about React hooks?"
- Q&A with your entire knowledge base
- Context-aware responses

**5.4 Auto-Tagging Suggestions**
- AI suggests tags based on content
- Reduce manual organization burden

---

#### Phase 6: Visualization (Medium Priority)

**6.1 Graph View**
- Visualize connections between cards
- Interactive node-link diagram
- Filter by tags, collections, date
- Leverage existing backlinks/references data

**6.2 Canvas/Whiteboard**
- Infinite 2D space for visual thinking
- Embed cards, images, notes
- Freehand drawing
- Mind mapping

---

#### Phase 7: Export & Portability

**7.1 Markdown Export** (Already planned)
- Copy as Markdown
- Download as .md file
- Bulk export

**7.2 Version History**
- Track changes over time
- Restore previous versions
- Diff view

**7.3 Public Sharing**
- Share individual cards publicly
- Read-only public links
- Optional password protection

---

#### Phase 8: Advanced Capture

**8.1 Voice Notes**
- Record audio notes
- AI transcription
- Mobile-first capture

**8.2 Rich Embeds**
- YouTube inline player
- Twitter/X embeds
- CodePen, Figma, etc.

**8.3 OCR/Image Text Extraction**
- Extract text from images
- Search within images

---

#### Phase 9: Retention & Learning

**9.1 Spaced Repetition** (Recall's killer feature)
- Turn notes into flashcards
- Algorithmically-timed review
- Track retention metrics

---

### Implementation Priority Matrix

| Feature | User Impact | Dev Effort | Priority Score |
|---------|-------------|------------|----------------|
| AI Summarization | High | Medium | ⭐⭐⭐⭐⭐ |
| Graph View | High | Medium | ⭐⭐⭐⭐⭐ |
| Semantic Search | High | High | ⭐⭐⭐⭐ |
| Markdown Export | Medium | Low | ⭐⭐⭐⭐ |
| AI Chat | High | High | ⭐⭐⭐⭐ |
| Rich Embeds | Medium | Medium | ⭐⭐⭐ |
| Voice Notes | Medium | Medium | ⭐⭐⭐ |
| Canvas | Medium | High | ⭐⭐⭐ |
| Spaced Repetition | Medium | Medium | ⭐⭐⭐ |
| Version History | Low | Medium | ⭐⭐ |
| Public Sharing | Low | Medium | ⭐⭐ |
| Real-time Collab | Low | Very High | ⭐ |
