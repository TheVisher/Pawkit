# Manual Testing Checklist - Pre-Merge Verification

**Branch**: `feat/multi-session-detection`
**Test Date**: __________
**Tester**: __________

---

## Instructions

- Use checkboxes to track progress: `[ ]` → `[✓]` → `[✗]`
- `[✓]` = PASSED
- `[✗]` = FAILED
- Add notes in the "Notes" section for each category
- **CRITICAL**: Tests marked with 🔴 must pass before merge

---

## 1. Authentication & Settings

### 1.1 Login Flow 🔴
- [ ] Login with existing account works
- [ ] User session persists across page refresh
- [ ] Logout works correctly
- [ ] Can log back in after logout

**Notes**:
```
_________________________________________________
_________________________________________________
```

---

### 1.2 Display Name Settings 🔴
- [ ] Profile modal opens when clicking profile icon
- [ ] Display name shows current value
- [ ] Can edit display name
- [ ] Display name saves to server (check Network tab for PATCH /api/user)
- [ ] Display name updates in UI immediately
- [ ] Display name persists after page refresh
- [ ] Display name shows in profile tooltip

**Notes**:
```
_________________________________________________
_________________________________________________
```

---

### 1.3 Settings Sync Across Tabs 🔴
- [ ] Open app in two tabs
- [ ] Change card size in tab 1
- [ ] Card size updates in tab 2 (may need refresh)
- [ ] Change theme in tab 1
- [ ] Theme updates in tab 2
- [ ] Check localStorage and server state match

**Notes**:
```
_________________________________________________
_________________________________________________
```

---

### 1.4 View Settings
- [ ] Change layout (grid/list/masonry/compact)
- [ ] Layout preference persists
- [ ] Navigate to Tags view
- [ ] Change Tags view settings
- [ ] No validation errors in console
- [ ] Settings save successfully

**Notes**:
```
_________________________________________________
_________________________________________________
```

---

## 2. Core Features

### 2.1 Card Operations 🔴
- [ ] Create new bookmark (paste URL in omnibar)
- [ ] Edit existing bookmark (title, notes, tags)
- [ ] Delete bookmark
- [ ] Restore deleted bookmark from trash
- [ ] All operations sync to server (check Network tab)
- [ ] No errors in console

**Notes**:
```
_________________________________________________
_________________________________________________
```

---

### 2.2 Collections/Pawkits
- [ ] Create new collection
- [ ] Add card to collection
- [ ] Remove card from collection
- [ ] Delete collection
- [ ] Private collection (The Den) works
- [ ] Collection cards filter correctly

**Notes**:
```
_________________________________________________
_________________________________________________
```

---

### 2.3 Search & Filters
- [ ] Search by title works
- [ ] Search by URL works
- [ ] Search by tags works
- [ ] Search by content works
- [ ] Filter by content type works
- [ ] Combined search + filter works

**Notes**:
```
_________________________________________________
_________________________________________________
```

---

### 2.4 Tags
- [ ] Add tag to card
- [ ] Remove tag from card
- [ ] Tags view shows all tags
- [ ] Click tag filters cards
- [ ] Tags autocomplete works
- [ ] Hashtags in content create tags

**Notes**:
```
_________________________________________________
_________________________________________________
```

---

### 2.5 Notes
- [ ] Create markdown note
- [ ] Create text note
- [ ] Edit note content
- [ ] Notes save properly
- [ ] Notes sync to server
- [ ] Notes appear in Notes view

**Notes**:
```
_________________________________________________
_________________________________________________
```

---

## 3. Multi-Session Detection 🔴

### 3.1 Multi-Tab Detection
- [ ] Open app in two browser tabs
- [ ] Second tab shows "Another tab is active" banner
- [ ] First tab remains active (no banner)
- [ ] Banner shows on correct tab

**Notes**:
```
_________________________________________________
_________________________________________________
```

---

### 3.2 Take Control Feature
- [ ] Click "Take Control" in second tab
- [ ] Second tab becomes active
- [ ] First tab now shows banner
- [ ] Can edit in second tab
- [ ] First tab is read-only (or shows warning)

**Notes**:
```
_________________________________________________
_________________________________________________
```

---

### 3.3 Session Switching
- [ ] Switch back to first tab
- [ ] Click "Take Control"
- [ ] First tab becomes active again
- [ ] Banner disappears from first tab
- [ ] Banner appears in second tab

**Notes**:
```
_________________________________________________
_________________________________________________
```

---

## 4. Multi-Device Testing

### 4.1 Cross-Device Sync 🔴
- [ ] Login on Device 1 (e.g., Desktop Chrome)
- [ ] Login on Device 2 (e.g., Mobile Safari)
- [ ] Create card on Device 1
- [ ] Refresh Device 2 - card appears
- [ ] Edit card on Device 2
- [ ] Refresh Device 1 - changes appear
- [ ] Settings sync between devices

**Notes**:
```
Device 1: _____________________________________
Device 2: _____________________________________
Sync delay: ___________________________________
```

---

### 4.2 Multi-Device Settings
- [ ] Change display name on Device 1
- [ ] Login on Device 2 (after change)
- [ ] Display name shows correctly on Device 2
- [ ] Change theme on Device 2
- [ ] Refresh Device 1
- [ ] Theme updates on Device 1

**Notes**:
```
_________________________________________________
_________________________________________________
```

---

## 5. Edge Cases & Error Handling

### 5.1 Offline Behavior
- [ ] Disconnect internet (airplane mode or disable network)
- [ ] App still works locally
- [ ] Can create cards offline
- [ ] Can edit cards offline
- [ ] Cards marked as "needs sync"
- [ ] Reconnect internet
- [ ] Offline changes sync to server
- [ ] No data loss

**Notes**:
```
_________________________________________________
_________________________________________________
```

---

### 5.2 Network Errors
- [ ] Simulate slow network (Chrome DevTools)
- [ ] Operations still complete (local-first)
- [ ] UI shows loading states appropriately
- [ ] Timeout handled gracefully
- [ ] Error messages are user-friendly
- [ ] Can retry failed operations

**Notes**:
```
_________________________________________________
_________________________________________________
```

---

### 5.3 Server Unreachable
- [ ] Block server in hosts file (optional)
- [ ] App loads (from cache/local)
- [ ] Can view existing data
- [ ] Can edit existing data
- [ ] Changes saved locally
- [ ] Unblock server
- [ ] Changes sync when server returns

**Notes**:
```
_________________________________________________
_________________________________________________
```

---

### 5.4 Rapid Edits in Multiple Tabs
- [ ] Open same card in two tabs
- [ ] Edit in tab 1
- [ ] Edit in tab 2 simultaneously
- [ ] No data corruption
- [ ] Conflict resolution works correctly
- [ ] Latest change wins (or appropriate strategy)

**Notes**:
```
_________________________________________________
_________________________________________________
```

---

### 5.5 SSR Compatibility 🔴
- [ ] Hard refresh page (Ctrl+Shift+R)
- [ ] No "localStorage is not defined" errors in console
- [ ] Multi-session detector works after page load
- [ ] No hydration mismatch warnings
- [ ] All features work after SSR load

**Notes**:
```
_________________________________________________
_________________________________________________
```

---

## 6. Database & API Verification 🔴

### 6.1 API Routes
- [ ] All API routes return 200 (not 401/500)
- [ ] PATCH /api/user works (display name save)
- [ ] GET /api/user/settings works
- [ ] PATCH /api/user/settings works
- [ ] GET /api/user/view-settings works
- [ ] PATCH /api/user/view-settings works
- [ ] No database connection errors in server logs

**Notes**:
```
Server logs check:
_________________________________________________
_________________________________________________
```

---

### 6.2 Database Migration
- [ ] Run: `npx prisma migrate dev --name add-user-settings`
- [ ] Migration succeeds without errors
- [ ] Run: `npx prisma generate`
- [ ] Prisma client regenerated
- [ ] UserSettings table created in database
- [ ] User relation to UserSettings works

**Notes**:
```
Migration output:
_________________________________________________
_________________________________________________
```

---

### 6.3 Server Logs Review
- [ ] Check server terminal for errors
- [ ] No "FATAL: Tenant or user not found" errors
- [ ] No "fetch failed" errors
- [ ] Connection pool initialized correctly
- [ ] All requests show appropriate status codes
- [ ] No unexpected errors

**Notes**:
```
_________________________________________________
_________________________________________________
```

---

## 7. Performance & UX

### 7.1 Performance
- [ ] Page loads in < 2 seconds
- [ ] Search results appear instantly
- [ ] Card operations feel snappy
- [ ] No lag when typing in notes
- [ ] Layout changes are smooth
- [ ] No console warnings about performance

**Notes**:
```
Load time: ________________________________________
Search time: _______________________________________
```

---

### 7.2 UI/UX Polish
- [ ] No broken layouts
- [ ] All modals open/close smoothly
- [ ] Tooltips show correctly
- [ ] Icons load properly
- [ ] Glass morphism effects work
- [ ] Purple glow on interactions works
- [ ] Dark theme looks good
- [ ] No visual glitches

**Notes**:
```
_________________________________________________
_________________________________________________
```

---

## 8. Browser Compatibility

### 8.1 Chrome/Edge
- [ ] All features work
- [ ] No console errors
- [ ] Multi-session detection works
- [ ] localStorage/indexedDB work

**Notes**:
```
Version: __________________________________________
```

---

### 8.2 Firefox
- [ ] All features work
- [ ] No console errors
- [ ] Multi-session detection works
- [ ] localStorage/indexedDB work

**Notes**:
```
Version: __________________________________________
```

---

### 8.3 Safari (if available)
- [ ] All features work
- [ ] No console errors
- [ ] Multi-session detection works
- [ ] localStorage/indexedDB work

**Notes**:
```
Version: __________________________________________
```

---

## Summary

### Test Statistics

- Total Tests: ~90
- **Tests Passed**: ______ / 90
- **Tests Failed**: ______ / 90
- **Tests Skipped**: ______ / 90

### Critical Tests (🔴)
- **Passed**: ______ / 12
- **Failed**: ______ / 12

### Pass Rate
- Overall: ______%
- Critical: ______%

### Ready to Merge?

**Minimum Requirements**:
- ✓ All critical tests (🔴) must pass (100%)
- ✓ Overall pass rate ≥ 80%
- ✓ No blocking bugs found
- ✓ Database migration successful
- ✓ SSR compatibility verified

**Decision**: [ ] YES, READY TO MERGE  |  [ ] NO, NEEDS WORK

---

## Issues Found

### High Priority Issues
```
1. _______________________________________________
   Status: [ ] Fixed  [ ] In Progress  [ ] Pending

2. _______________________________________________
   Status: [ ] Fixed  [ ] In Progress  [ ] Pending
```

### Medium Priority Issues
```
1. _______________________________________________
   Status: [ ] Fixed  [ ] In Progress  [ ] Pending
```

### Low Priority Issues
```
1. _______________________________________________
   Status: [ ] Fixed  [ ] In Progress  [ ] Pending
```

---

## Sign-Off

**Tester Name**: _____________________
**Date**: ___________________________
**Time Spent**: ______________________

**Approval**: [ ] APPROVED  |  [ ] REJECTED  |  [ ] CONDITIONAL

**Conditions (if conditional)**:
```
_________________________________________________
_________________________________________________
_________________________________________________
```

---

**Next Steps**:
1. [ ] Address any high-priority issues
2. [ ] Retest failed scenarios
3. [ ] Remove debug console.log statements
4. [ ] Final git diff review
5. [ ] Merge to main

---

End of Manual Testing Checklist
