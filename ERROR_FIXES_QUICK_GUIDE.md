# Quick Fix Guide for Error Messages

## Top 3 Highest Impact Fixes

### Fix #1: Wrap Raw Error Messages (15+ instances)
**Impact:** High | **Time:** 2-3 hours

Replace all `error.message` exposures with user-friendly messages:

```typescript
// Create a helper function
function getUserFriendlyErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Log the technical error for debugging
    console.error('Technical error:', error.message);
    
    // Return user-friendly message
    if (error.message.includes('offline') || error.message.includes('connection')) {
      return "Connection error. Please check your internet.";
    }
    if (error.message.includes('timeout')) {
      return "The operation took too long. Please try again.";
    }
    if (error.message.includes('unauthorized')) {
      return "You don't have permission to do this.";
    }
    return "Something went wrong. Please try again.";
  }
  return "An unexpected error occurred.";
}

// Use it:
try {
  await saveProfile();
} catch (error) {
  showToast(getUserFriendlyErrorMessage(error), "error");
}
```

**Files to update:**
- `/components/modals/profile-modal.tsx:149, 59`
- `/components/modals/card-detail-modal.tsx:441, 515`
- `/app/(auth)/login/page.tsx:24`
- `/app/(auth)/signup/page.tsx:37`
- `/components/sync/sync-status.tsx:76`

---

### Fix #2: Replace alert() with toast() (8+ instances)
**Impact:** High | **Time:** 1-2 hours

```typescript
// BEFORE:
alert('Failed to delete Pawkit');

// AFTER:
const { error: showError } = useToast();
showError('Could not delete this Pawkit. Please try again.');
```

**Files to update:**
- `/components/trash/trash-view.tsx:198`
- `/components/pawkits/pawkits-header.tsx:80, 95, 111`
- `/components/modals/profile-modal.tsx:59, 149`
- `/components/modals/card-detail-modal.tsx:441, 515`

---

### Fix #3: Add Context to Generic Messages (10+ instances)
**Impact:** Medium | **Time:** 1-2 hours

```typescript
// BEFORE:
showToast(`Failed to restore ${type}`, "error");

// AFTER:
const messages: Record<string, string> = {
  card: data.restoredToLibrary 
    ? "Card restored to Library (original Pawkit was deleted)"
    : "Card restored successfully",
  pawkit: data.restoredToRoot
    ? "Pawkit restored to root (parent no longer exists)"
    : "Pawkit restored successfully"
};
showToast(messages[type], "success");
```

---

## Quick Checklist for New Error Messages

When adding error handling, follow this checklist:

- [ ] Message is user-friendly (no technical jargon)
- [ ] Message explains what went wrong
- [ ] Message suggests what to do next
- [ ] Message does NOT show raw error.message
- [ ] Using toast() instead of alert()
- [ ] Technical error logged to console for debugging
- [ ] Consider network/offline scenarios
- [ ] Message includes Pawkit terminology (Pawkit, not Collection)

---

## Files Needing Most Urgent Attention

1. `/app/(dashboard)/layout.tsx:386` - Shows raw technical error to user ⚠️⚠️⚠️
2. `/components/modals/profile-modal.tsx` - Multiple raw error exposures
3. `/components/modals/card-detail-modal.tsx` - Multiple alert() calls
4. `/components/pawkits/pawkits-header.tsx` - Generic error messages

---

## Error Message Template

Use this template when writing error messages:

```
[What went wrong - friendly]
[Why it happened - optional context]
[What to do - action]

Example:
"Couldn't save your changes. 
Your connection might be slow. 
Please check your internet and try again."
```

