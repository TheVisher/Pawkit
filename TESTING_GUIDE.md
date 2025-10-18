# PKM Features Testing Guide

## Overview
This guide will help you test all the new PKM (Personal Knowledge Management) features added to Pawkit Notes.

## Setup Instructions

### 1. Database Migration
First, run the Prisma migration to create the new tables:

```bash
npx prisma generate
npx prisma migrate dev --name add_note_linking_tables
```

This will create three new tables:
- `NoteLink` - Links between notes
- `NoteCardLink` - Links between notes and bookmarks
- `NoteTag` - Tags extracted from notes

### 2. Restart Dev Server
```bash
npm run dev
```

## Feature Test Plan

### Phase 1: Enhanced Markdown Editor

#### Test 1: Basic Editor Features
1. Navigate to `/notes`
2. Create a new note
3. **Expected Results:**
   - Rich markdown toolbar visible (bold, italic, headings, lists, etc.)
   - Character count displayed
   - Syntax highlighting in edit mode
   - Live preview available

#### Test 2: Keyboard Shortcuts
1. Open a note in edit mode
2. Try these shortcuts:
   - `Cmd+B` (or `Ctrl+B`) - Bold text
   - `Cmd+I` - Italic text
   - `Cmd+K` - Insert link
   - `Cmd+S` - Save note
3. **Expected Results:**
   - All shortcuts work correctly
   - Save shortcut triggers auto-save

#### Test 3: Markdown Features
1. Test these markdown features:
   ```markdown
   # Heading 1
   ## Heading 2
   **Bold text**
   *Italic text*
   - List item
   1. Numbered item
   `code`
   ```code block```
   [Link](https://example.com)
   ![Image](url)
   ```
2. **Expected Results:**
   - All markdown renders correctly in preview
   - Syntax highlighting in edit mode

### Phase 2: Wiki-Style Note Linking

#### Test 4: Note-to-Note Links
1. Create two notes:
   - Note A: "Project Ideas"
   - Note B: "Implementation Plan"
2. In Note A, add: `See [[Implementation Plan]] for details`
3. Save Note A
4. **Expected Results:**
   - Link syntax `[[Implementation Plan]]` is recognized
   - Metadata shows "1 note link"
   - In Note B, check the "References" tab
   - Note A should appear in "Linked From" section

#### Test 5: Autocomplete
1. Start typing `[[Impl` in a note
2. **Expected Results:**
   - Autocomplete dropdown appears
   - Shows matching note titles
   - Can select from dropdown to complete

#### Test 6: Non-Existent Note Links
1. Type `[[Future Note]]` for a note that doesn't exist yet
2. **Expected Results:**
   - Link is still parsed
   - Shows as broken/unresolved link
   - Option to create the note

### Phase 3: Note-to-Bookmark Linking

#### Test 7: Link Note to Bookmark
1. Create a note called "Research: AI Tools"
2. Add some bookmarks related to AI
3. In the note, add:
   ```markdown
   ## Resources
   [[card:ChatGPT Review Article]]
   [[https://example.com/ai-tools]]
   ```
4. Save the note
5. **Expected Results:**
   - Metadata shows "X card links"
   - References tab shows linked bookmarks with thumbnails
   - Clicking linked bookmark opens it

#### Test 8: Bookmark Shows Note References
1. Open a bookmark that was linked in Test 7
2. Check the card modal
3. **Expected Results:**
   - New section shows "Referenced in notes"
   - Lists notes that link to this bookmark
   - Can click to open the note

### Phase 4: Tags System

#### Test 9: Tag Extraction
1. Create a note with content:
   ```markdown
   # My Project
   This is important for #work and #productivity

   Need to review #ai-tools #research
   ```
2. Save the note
3. **Expected Results:**
   - Metadata shows "4 tags"
   - Tags extracted: work, productivity, ai-tools, research
   - Tags visible in note metadata section

#### Test 10: Tag Filtering
1. Go to `/notes`
2. Look for tag filter (may need to implement UI)
3. Click on a tag (e.g., #work)
4. **Expected Results:**
   - Only notes with that tag are shown
   - Count updates to show filtered results

#### Test 11: Tag Autocomplete
1. Start typing `#pro` in a note
2. **Expected Results:**
   - Autocomplete shows existing tags: "productivity"
   - Can select to complete

### Phase 5: Integration Tests

#### Test 12: Combined Features
1. Create a comprehensive note:
   ```markdown
   # Weekly Review - Oct 16

   ## Projects
   - Reviewed [[Project Ideas]] doc
   - Need to check [[card:Design System Article]]

   ## Tags
   #weekly-review #productivity #planning

   ## Resources
   Found useful: [[https://example.com/productivity]]
   ```
2. Save and check all tabs
3. **Expected Results:**
   - 2 note links detected
   - 2 card links detected
   - 3 tags extracted
   - All links clickable
   - References tab shows everything

#### Test 13: Backlinks Navigation
1. Create Note A linking to Note B
2. Open Note B
3. Go to "References" tab
4. Click on Note A in backlinks
5. **Expected Results:**
   - Note A modal opens
   - Can navigate back and forth
   - Breadcrumb/history works

### Phase 6: Search and Discovery

#### Test 14: Full-Text Search
1. Go to `/notes`
2. Use search bar
3. Search for text within note content
4. **Expected Results:**
   - Finds notes by content (not just title)
   - Highlights matches
   - Fast search performance

#### Test 15: Search by Tag
1. Search for `#productivity`
2. **Expected Results:**
   - Shows all notes with that tag
   - Can combine with text search

## Performance Tests

### Test 16: Large Notes
1. Create a note with 1000+ lines
2. Test editor responsiveness
3. **Expected Results:**
   - Editor remains fast
   - Scrolling smooth
   - Save works quickly

### Test 17: Many Links
1. Create a note with 20+ wiki links
2. Save and open
3. **Expected Results:**
   - All links parsed correctly
   - No performance issues
   - References tab loads quickly

## Edge Cases

### Test 18: Special Characters
1. Test links with special characters:
   - `[[Note with (parentheses)]]`
   - `[[Note with [brackets]]]` (should not work - nested)
   - `[[Note_with_underscores]]`
2. **Expected Results:**
   - Handles valid cases
   - Rejects invalid syntax gracefully

### Test 19: Duplicate Links
1. Link to same note multiple times:
   ```markdown
   See [[Other Note]] and also [[Other Note]]
   ```
2. **Expected Results:**
   - No duplicate entries in database
   - Shows as single link in references

### Test 20: Circular References
1. Create Note A → links to Note B
2. Create Note B → links to Note A
3. **Expected Results:**
   - Both notes show proper backlinks
   - No infinite loops
   - Can navigate between them

## Mobile Testing

### Test 21: Mobile Editor
1. Open notes on mobile device
2. Create/edit note
3. **Expected Results:**
   - Editor works on mobile
   - Toolbar accessible
   - Touch-friendly

## Known Limitations

### Current Limitations (May Need Implementation):
1. **Migration Issue**: Database migration may need manual intervention due to existing migrations
2. **Real-time Updates**: Link updates may require page refresh
3. **Note Renaming**: Renaming notes doesn't update links automatically (future feature)
4. **Link Preview**: No hover preview of linked content yet
5. **Graph View**: Visual knowledge graph not yet implemented

## Troubleshooting

### If Features Don't Work:

1. **Editor not loading:**
   ```bash
   # Check if packages installed
   npm list @uiw/react-md-editor
   ```

2. **Links not parsing:**
   - Check browser console for errors
   - Verify content is being saved
   - Check database tables exist

3. **Database errors:**
   ```bash
   # Reset and remigrate
   npx prisma migrate reset
   npx prisma migrate dev
   ```

4. **TypeScript errors:**
   ```bash
   npx prisma generate
   npm run build
   ```

## Success Criteria

All tests should pass with these overall results:
- ✅ Enhanced editor loads and works
- ✅ Wiki links create database relationships
- ✅ Card links connect notes to bookmarks
- ✅ Tags are extracted and searchable
- ✅ Backlinks show bidirectional relationships
- ✅ Navigation between linked notes works
- ✅ Performance remains good with many links
- ✅ Mobile experience is usable

## Feedback

After testing, note:
1. Features that work well
2. Features that need improvement
3. Bugs encountered
4. Performance issues
5. UX suggestions

This testing will help refine the PKM system into a production-ready feature!
