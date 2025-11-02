# MD Note Improvements Plan

## Overview

This document outlines the comprehensive plan for enhancing Pawkit's Markdown note-taking capabilities with rich editing features, advanced PKM (Personal Knowledge Management) tools, and production-ready reliability improvements.

---

## 🎯 **Current Status**

### ✅ **Already Implemented:**
- Wiki-Style Note Linking (`[[Note Title]]` syntax)
- Note-to-Bookmark Linking (`[[card:Title]]` and `[[URL]]` syntax)
- Bidirectional Backlinks (Links tab with incoming/outgoing connections)
- Local-First Architecture (IndexedDB-first operations)
- Real-time Auto-save (2-second debounced saving)
- Performance Optimizations (reduced re-renders, console logs)

---

## 📋 **Implementation Plan**

### **Phase 1: Enhanced MD Editor** 🚀 *In Progress*
*Priority: High | Time: 2-3 hours | User Impact: Immediate*

#### 1.1 Rich Markdown Editor
- **Status**: 🔄 In Progress
- **Description**: Replace basic textarea with `@uiw/react-md-editor`
- **Features**:
  - Toolbar with formatting buttons (bold, italic, headers, lists, links)
  - Syntax highlighting for better readability
  - Keyboard shortcuts (Ctrl+B, Ctrl+I, etc.)
  - Auto-completion for wiki-links
- **Files**: `components/notes/md-editor.tsx`, `components/modals/card-detail-modal.tsx`

#### 1.2 Live Preview Toggle
- **Status**: ⏳ Pending
- **Description**: Seamless switching between edit and preview modes
- **Features**:
  - Side-by-side editing (optional)
  - Full-screen preview mode
  - Real-time preview updates
- **Files**: `components/notes/md-editor.tsx`

---

### **Phase 2: Tag System** 🏷️
*Priority: High | Time: 3-4 hours | User Impact: High*

#### 2.1 Tag Extraction
- **Status**: ⏳ Pending
- **Description**: Auto-detect and extract hashtags from note content
- **Features**:
  - Auto-extract `#tag` syntax
  - Store tags in IndexedDB
  - Real-time tag updates
- **Files**: `lib/utils/tag-extractor.ts`, `lib/stores/data-store.ts`

#### 2.2 Tag Management UI
- **Status**: ⏳ Pending
- **Description**: Display and manage tags in note interface
- **Features**:
  - Tag display in note modals
  - Tag filtering in Notes view
  - Tag autocomplete when typing
  - Tag statistics and usage
- **Files**: `components/notes/tag-manager.tsx`, `components/library/notes-view.tsx`

---

### **Phase 3: Metadata & Analytics** 📊
*Priority: Medium | Time: 2-3 hours | User Impact: Medium*

#### 3.1 Metadata Display
- **Status**: ⏳ Pending
- **Description**: Real-time note statistics and metadata
- **Features**:
  - Character/word count
  - Link count (wiki-links, external links)
  - Tag count and list
  - Last modified timestamp
  - Reading time estimate
- **Files**: `components/notes/metadata-panel.tsx`

---

### **Phase 4: Advanced PKM Features** 🧠
*Priority: Medium | Time: 4-6 hours | User Impact: High*

#### 4.1 Graph Visualization
- **Status**: ⏳ Pending
- **Description**: Interactive knowledge graph of note connections
- **Features**:
  - Network view of note relationships
  - Interactive node exploration
  - Connection strength indicators
  - Filter by note types or tags
- **Files**: `components/notes/graph-visualization.tsx`

#### 4.2 Smart Search
- **Status**: ⏳ Pending
- **Description**: Enhanced note discovery and search
- **Features**:
  - Full-text search across all notes
  - Fuzzy search for titles and content
  - Search by tags and links
  - Search history and suggestions
- **Files**: `components/notes/smart-search.tsx`, `lib/utils/search-engine.ts`

#### 4.3 Note Templates
- **Status**: ⏳ Pending
- **Description**: Pre-built note structures for common use cases
- **Features**:
  - Meeting notes template
  - Project planning template
  - Research notes template
  - Custom template creation
- **Files**: `components/notes/template-selector.tsx`, `lib/templates/`

---

### **Phase 5: Production Reliability** 🛡️
*Priority: High | Time: 4-5 hours | User Impact: Critical*

#### 5.1 Idempotency Tokens
- **Status**: ⏳ Pending
- **Description**: Prevent duplicate operations with UUID-based deduplication
- **Features**:
  - Generate unique operation IDs
  - Server-side duplicate detection
  - Request deduplication
- **Files**: `lib/services/sync-queue.ts`, API routes

#### 5.2 Retry Logic
- **Status**: ⏳ Pending
- **Description**: Auto-recovery from network failures
- **Features**:
  - Exponential backoff with jitter
  - Configurable retry limits
  - Failure notifications
- **Files**: `lib/services/sync-queue.ts`

#### 5.3 Conflict Resolution
- **Status**: ⏳ Pending
- **Description**: Handle concurrent edits gracefully
- **Features**:
  - Last-write-wins with timestamps
  - Conflict detection and notification
  - Manual merge resolution (future)
- **Files**: `lib/services/conflict-resolver.ts`

---

## 🎯 **Implementation Order**

### **Week 1: Core Editor Experience**
1. ✅ Rich Markdown Editor (In Progress)
2. ⏳ Live Preview Toggle
3. ⏳ Tag System (Extraction + UI)

### **Week 2: Enhanced Features**
4. ⏳ Metadata Display
5. ⏳ Smart Search
6. ⏳ Note Templates

### **Week 3: Advanced & Reliability**
7. ⏳ Graph Visualization
8. ⏳ Idempotency Tokens
9. ⏳ Retry Logic

### **Week 4: Polish & Testing**
10. ⏳ Conflict Resolution
11. ⏳ Performance optimization
12. ⏳ User testing and feedback

---

## 📦 **Dependencies**

### **New Packages Needed:**
```json
{
  "@uiw/react-md-editor": "^4.0.0",
  "react-markdown": "^9.0.0",
  "remark-gfm": "^4.0.0",
  "remark-breaks": "^4.0.0",
  "uuid": "^9.0.0",
  "fuse.js": "^7.0.0",
  "d3": "^7.0.0",
  "react-force-graph-2d": "^1.0.0"
}
```

### **Database Schema Updates:**
```sql
-- Tags table
CREATE TABLE NoteTag (
  id TEXT PRIMARY KEY,
  noteId TEXT NOT NULL,
  tag TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (noteId) REFERENCES Card(id) ON DELETE CASCADE
);

-- Search index
CREATE INDEX idx_note_content ON Card(content);
CREATE INDEX idx_note_tags ON NoteTag(tag);
```

---

## 🧪 **Testing Strategy**

### **Unit Tests:**
- Tag extraction logic
- Search functionality
- Link resolution
- Template rendering

### **Integration Tests:**
- Editor functionality
- Auto-save behavior
- Tag filtering
- Graph visualization

### **User Testing:**
- Editor usability
- Performance with large notes
- Mobile responsiveness
- Accessibility compliance

---

## 📈 **Success Metrics**

### **User Experience:**
- Note creation time reduced by 30%
- User satisfaction score > 4.5/5
- Feature adoption rate > 80%

### **Technical:**
- Page load time < 2s
- Auto-save latency < 100ms
- Zero data loss incidents
- 99.9% uptime

---

## 🚀 **Deployment Strategy**

### **Feature Flags:**
- Enable/disable new editor
- A/B test tag system
- Gradual rollout of graph visualization

### **Rollback Plan:**
- Keep current textarea as fallback
- Database migrations are reversible
- Feature flags for quick disable

---

*Last Updated: 2025-01-17*
*Document Version: 1.0*
