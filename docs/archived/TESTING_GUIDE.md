# Pawkit Feature Testing Guide

This guide provides comprehensive testing instructions for all newly implemented features in the YOLO roadmap implementation.

## Table of Contents

1. [Global Keyboard Shortcuts](#1-global-keyboard-shortcuts)
2. [Keyboard Shortcuts Help Modal](#2-keyboard-shortcuts-help-modal)
3. [Search with Operators](#3-search-with-operators)
4. [Dig Up Improvements](#4-dig-up-improvements)
5. [Tag Management](#5-tag-management)
6. [Recently Viewed](#6-recently-viewed)
7. [Knowledge Graph Enhancements](#7-knowledge-graph-enhancements)
8. [Toast Notifications](#8-toast-notifications)

---

## 1. Global Keyboard Shortcuts

### Overview
Comprehensive keyboard shortcut system for navigation and common actions.

### Testing Steps

#### General Shortcuts
1. **Command Palette** (Cmd/Ctrl + K)
   - Press `Cmd + K` (Mac) or `Ctrl + K` (Windows/Linux)
   - Verify command palette opens
   - Press `Esc` to close

2. **New Note** (Cmd/Ctrl + N)
   - Press `Cmd + N` (Mac) or `Ctrl + N` (Windows/Linux)
   - Verify create note modal opens
   - Create a note and verify it appears in library

3. **New Card** (Cmd/Ctrl + P)
   - Press `Cmd + P` (Mac) or `Ctrl + P` (Windows/Linux)
   - Verify add card modal opens
   - Add a URL and verify card is created

4. **Today's Note** (Cmd/Ctrl + T)
   - Press `Cmd + T` (Mac) or `Ctrl + T` (Windows/Linux)
   - Verify navigation to today's daily note
   - If doesn't exist, should create it automatically

5. **Focus Search** (/)
   - Press `/` key
   - Verify omnibar search input is focused
   - Type to test search functionality

6. **Close Modal** (Esc)
   - Open any modal
   - Press `Esc`
   - Verify modal closes

#### Navigation Shortcuts (G + Letter)
1. **Go to Home** (G then H)
   - Press `G` then quickly press `H`
   - Verify navigation to home page

2. **Go to Library** (G then L)
   - Press `G` then quickly press `L`
   - Verify navigation to library

3. **Go to Calendar** (G then C)
   - Press `G` then quickly press `C`
   - Verify navigation to calendar

4. **Go to Notes** (G then N)
   - Press `G` then quickly press `N`
   - Verify navigation to notes page

5. **Go to Pawkits** (G then P)
   - Press `G` then quickly press `P`
   - Verify navigation to pawkits page

6. **Go to Dig Up** (G then D)
   - Press `G` then quickly press `D`
   - Verify navigation to dig up page

7. **Go to Timeline** (G then T)
   - Press `G` then quickly press `T`
   - Verify navigation to timeline page

### Expected Behavior
- All shortcuts should work from any page
- Shortcuts should NOT trigger when typing in input fields or text areas
- G-key sequences should timeout after 1 second if second key not pressed

---

## 2. Keyboard Shortcuts Help Modal

### Overview
Help dialog showing all available keyboard shortcuts.

### Testing Steps

1. **Open Help Modal**
   - Press `?` key (Shift + /)
   - Verify keyboard shortcuts modal opens
   - Check all shortcut groups are displayed:
     - General shortcuts
     - Navigation shortcuts
     - Markdown Editor shortcuts

2. **Modal Content**
   - Verify keyboard shortcut badges are styled correctly
   - Verify shortcuts are organized by group
   - Check descriptions are clear and accurate

3. **Close Help Modal**
   - Press `Esc` to close
   - Click outside modal to close
   - Click X button to close
   - Verify modal closes properly

### Expected Behavior
- Modal should display with smooth animation
- All shortcuts should be documented
- Keyboard shortcut badges should be visually consistent
- Modal should be accessible via `?` key from anywhere

---

## 3. Search with Operators

### Overview
Advanced search functionality with operator support for filtering.

### Testing Steps

#### Tag Operator
1. Navigate to Library
2. In search bar, type: `tag:work`
3. Verify only cards with "work" tag are shown
4. Try: `tag:personal`
5. Verify filtering updates

#### Type Operator
1. Type: `type:note`
2. Verify only notes (md-note, text-note) are shown
3. Type: `type:url`
4. Verify only URL cards are shown
5. Type: `type:markdown`
6. Verify only markdown notes are shown

#### Date Operator
1. Type: `date:today`
2. Verify only cards created today are shown
3. Type: `date:yesterday`
4. Verify only cards from yesterday are shown
5. Type: `date:week`
6. Verify cards from last 7 days are shown
7. Type: `date:month`
8. Verify cards from last 30 days are shown

#### In Operator (Collections)
1. Type: `in:work`
2. Verify only cards in "work" pawkit are shown
3. Replace spaces with hyphens: `in:my-reading-list`

#### Is Operator (Status)
1. Type: `is:favorite`
2. Verify only favorited cards are shown
3. Type: `is:archived`
4. Verify only archived cards are shown

#### Combined Operators
1. Type: `tag:work type:note`
2. Verify cards that are both tagged "work" AND are notes
3. Type: `date:week is:favorite`
4. Verify favorite cards from the last week
5. Mix operators: `tag:reading type:url date:month`

#### Text Search + Operators
1. Type: `tag:work javascript`
2. Verify cards tagged "work" that contain "javascript"
3. Operators should be extracted, remaining text is searched

### Expected Behavior
- Multiple operators should work together (AND logic)
- Operators should be case-insensitive
- Search should update in real-time
- Result count should reflect filtered results

---

## 4. Dig Up Improvements

### Overview
Enhanced Dig Up interface with keyboard shortcuts and snooze functionality.

### Testing Steps

#### Keyboard Shortcuts
1. **Navigate to Dig Up**
   - Go to `/distill` or use Dig Up from sidebar

2. **Keep Card** (K key)
   - Press `K` to mark current card as seen
   - Verify moves to next card
   - Card should not appear again in current session

3. **Delete Card** (D key)
   - Press `D` to delete current card
   - Verify deletion confirmation works
   - Card should be moved to trash

4. **Add to Pawkit** (P key)
   - Press `P` to open pawkit selector
   - Verify sidebar opens with pawkit list
   - Press `P` again to toggle closed
   - Select a pawkit and verify card is added

5. **Snooze Card** (S key)
   - Press `S` to open snooze menu
   - Verify sidebar shows snooze options
   - Press `S` again to toggle closed

6. **Escape Key**
   - With pawkit or snooze sidebar open, press `Esc`
   - Verify sidebar closes
   - With both closed, press `Esc`
   - Verify returns to library

#### Snooze Functionality
1. **Open Snooze Menu**
   - Click "Snooze (S)" button or press `S` key
   - Verify snooze sidebar opens

2. **Snooze Options**
   - Click "Tomorrow" - card should disappear
   - Card should reappear in Dig Up tomorrow
   - Test "In 3 Days"
   - Test "In 1 Week"
   - Test "In 1 Month"
   - Test "In 3 Months"

3. **Never Show Again**
   - Click "Never Show" button
   - Card should disappear permanently
   - Card should not appear in Dig Up for a very long time (10 years)

#### Progress Indicator
1. Verify progress bar shows correct position
2. Check "X of Y reviewed" text is accurate
3. Progress should update as you review cards
4. Bar should fill as you progress through cards

#### Filter Modes
1. Switch between "Uncategorized Only" and "All Cards"
2. Verify card list updates based on filter
3. Check count updates correctly

### Expected Behavior
- All keyboard shortcuts should work
- Snooze timestamps should persist in localStorage
- Cards should not reappear until snooze period expires
- Progress should be saved across page refreshes
- Filter mode selection should persist

---

## 5. Tag Management

### Overview
Dedicated page for managing tags across all cards.

### Testing Steps

#### Access Tag Management
1. Navigate to `/tags`
2. Verify page shows all tags extracted from cards
3. Check tag count and card count are accurate

#### Search Tags
1. Use search bar to filter tags
2. Type partial tag name
3. Verify real-time filtering
4. Clear search with X button

#### Rename Tag
1. Hover over a tag card
2. Click edit icon (pencil)
3. Type new tag name
4. Press Enter or click away
5. Verify tag is renamed across all cards
6. Check toast notification confirms rename

#### Delete Tag
1. Hover over a tag card
2. Click delete icon (trash)
3. Confirm deletion in alert dialog
4. Verify tag is removed from all cards
5. Check toast notification confirms deletion

#### View Cards with Tag
1. Click "View Cards" button on any tag
2. Verify navigation to library with tag filter
3. Check URL contains `?q=tag:tagname`
4. Verify only cards with that tag are shown

#### Tag Statistics
1. Verify each tag shows correct card count
2. Tags should be sorted by usage (most used first)
3. Empty state should show if no tags exist

### Expected Behavior
- Tag operations should update all associated cards
- Toast notifications should confirm successful operations
- Search should be case-insensitive
- Tag renaming should preserve tag associations
- Deleting a tag should only remove it, not delete cards

---

## 6. Recently Viewed

### Overview
Track and display recently viewed cards and notes in sidebar.

### Testing Steps

#### Viewing Items
1. Open any card in library
2. Close card detail modal
3. Open sidebar
4. Check "Recently Viewed" section appears
5. Verify the card you just viewed is listed

2. **View Multiple Items**
   - Open 5-10 different cards/notes
   - Check recently viewed list updates
   - List should show last 5 items
   - Most recent should be at top

3. **Different Item Types**
   - View a note
   - View a URL card
   - Verify both types appear in recent list
   - Note items should link to `/notes#id`
   - Card items should link to library search

#### Navigation from Recent List
1. Click any item in recently viewed
2. Verify navigation to correct item
3. For notes: should scroll to note
4. For cards: should filter library

#### Persistence
1. View several items
2. Refresh page
3. Check recently viewed list persists
4. List should maintain order and items

### Expected Behavior
- Maximum 10 items stored in localStorage
- Most recent item appears first
- Clicking item navigates correctly
- List updates in real-time as items are viewed
- Timestamps are stored with each view

---

## 7. Knowledge Graph Enhancements

### Overview
Improved knowledge graph with search, highlighting, and better interactions.

### Testing Steps

#### Search Nodes
1. Navigate to Notes page
2. Scroll to Knowledge Graph
3. Type in search box
4. Verify only matching nodes are shown
5. Clear search with X button

#### Node Hovering
1. Hover over any node
2. Verify:
   - Node size increases
   - Connected nodes are highlighted
   - Connected links are highlighted
   - Unconnected nodes/links dim
3. Move mouse away
4. Verify highlighting resets

#### Node Selection
1. Click a node
2. Verify selection persists (doesn't require hover)
3. Connected nodes remain highlighted
4. Click same node again to deselect
5. Clicking different node should change selection

#### Zoom Controls
1. Click zoom in (+) button
2. Verify graph zooms in (percentage increases)
3. Click zoom out (-) button
4. Verify graph zooms out
5. Click reset button
6. Verify zoom returns to 100% and pan resets

#### Pan (Drag)
1. Click and drag on graph background
2. Verify graph pans smoothly
3. Release and verify position holds

#### Open Cards from Graph
1. Click on a node
2. Verify:
   - Node highlights
   - If node is a card, card detail modal opens
3. Close modal
4. Selection should persist

### Expected Behavior
- Search filters nodes in real-time
- Hover highlighting should be smooth
- Click selection should persist until another click
- Zoom should center on graph
- Pan should be smooth and responsive
- Connected nodes/links should be visually distinct

---

## 8. Toast Notifications

### Overview
Improved user feedback with toast notifications instead of alerts.

### Testing Steps

#### Toast Types
1. **Success Toast**
   - Rename a tag
   - Verify green success toast appears
   - Check for checkmark icon

2. **Error Toast**
   - Trigger an error (e.g., try to delete with failure)
   - Verify red error toast appears
   - Check for X icon

3. **Info Toast**
   - General informational messages
   - Verify blue info toast
   - Check for info icon

4. **Warning Toast**
   - Warning messages
   - Verify yellow warning toast
   - Check for warning triangle icon

#### Toast Behavior
1. **Auto-dismiss**
   - Trigger a toast
   - Wait 3 seconds
   - Verify toast fades out and disappears

2. **Multiple Toasts**
   - Trigger multiple toasts quickly
   - Verify they stack vertically
   - Each should dismiss independently

3. **Toast Positioning**
   - Verify toasts appear bottom-right
   - Check they don't overlap with other UI
   - z-index should be high (above modals)

#### Integration Points
1. **Tag Management**
   - Rename tag: success toast
   - Delete tag: success toast
   - Failed operations: error toast

2. **Other Features** (if implemented)
   - Card operations
   - Pawkit operations
   - Note operations

### Expected Behavior
- Toasts should appear smoothly
- Auto-dismiss after 3 seconds
- Multiple toasts should stack
- Appropriate colors and icons for each type
- Text should be clear and descriptive

---

## General Testing Notes

### Browser Compatibility
Test in:
- Chrome/Edge (Chromium)
- Firefox
- Safari

### Device Testing
- Desktop (Windows, Mac, Linux)
- Tablet (landscape and portrait)
- Mobile (if responsive features implemented)

### Accessibility
- Keyboard navigation should work
- Focus states should be visible
- Screen reader compatibility (basic)

### Performance
- No console errors during normal operation
- Smooth animations
- Quick response times for interactions

---

## Known Limitations

1. **Search Operators**
   - Only work in library view
   - Date operators use creation date, not scheduled date

2. **Dig Up**
   - Snoozed cards stored in localStorage only
   - Not synced across devices

3. **Recently Viewed**
   - Maximum 10 items
   - Stored in localStorage only

4. **Knowledge Graph**
   - Performance may degrade with 100+ nodes
   - Layout is random, not optimized

---

## Reporting Issues

If you find bugs or unexpected behavior:

1. Note the exact steps to reproduce
2. Check browser console for errors
3. Verify browser and OS version
4. Test in different browser if possible
5. Document expected vs actual behavior

---

## Success Criteria

All features are working correctly if:

- ✅ All keyboard shortcuts respond correctly
- ✅ Search operators filter as expected
- ✅ Dig Up keyboard shortcuts work
- ✅ Tag management CRUD operations succeed
- ✅ Recently viewed tracks and displays correctly
- ✅ Knowledge graph interactions are smooth
- ✅ Toast notifications appear and dismiss properly
- ✅ No console errors during testing
- ✅ Smooth animations and transitions
- ✅ Data persists across page refreshes where expected

---

**Last Updated**: October 21, 2025
**Version**: YOLO Roadmap Implementation
**Status**: Ready for Testing
