# Error Message Improvement Examples

This document shows concrete before/after examples for improving error messages in Pawkit.

## Example 1: Profile Save Error

### BEFORE (Bad)
```typescript
// /components/modals/profile-modal.tsx:148-150
try {
  const response = await fetch('/api/user', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName: name }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to save profile');
  }
} catch (error) {
  console.error('Error saving profile:', error);
  alert(`Failed to save profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
  //     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Shows raw error message!
  setSaving(false);
}
```

**Problems:**
- Shows raw error message (could be "ValidationError: displayName must be <= 50 chars")
- Uses blocking alert() instead of toast
- No recovery suggestion
- Bad user experience: "Uh oh, 'ValidationError'???"

### AFTER (Good)
```typescript
// Helper function at top of file or in utils
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Log technical error for debugging
    console.error('Technical error details:', error.message);
    
    // Return user-friendly message
    if (error.message.includes('validation')) {
      return "Please check your input and try again.";
    }
    if (error.message.includes('offline') || error.message.includes('connection')) {
      return "Connection error. Check your internet and try again.";
    }
    if (error.message.includes('timeout')) {
      return "The request took too long. Please try again.";
    }
  }
  return "Couldn't save your changes. Please try again.";
}

// In component:
const { error: showError } = useToast();

try {
  const response = await fetch('/api/user', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName: name }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to save profile');
  }
  setDisplayName(name);
  onClose();
} catch (error) {
  const userMessage = getErrorMessage(error);
  showError(userMessage); // ✓ User-friendly toast
  //                          ✓ Non-blocking
  //                          ✓ Consistent with rest of app
}
```

**Improvements:**
- User sees: "Couldn't save your changes. Please try again." (friendly!)
- Technical error logged for debugging
- Non-blocking toast notification
- Consistent error handling pattern

---

## Example 2: Storage Initialization Error

### BEFORE (Critical Issue)
```typescript
// /app/(dashboard)/layout.tsx:379-396
if (error) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-4 max-w-md p-6">
        <div className="text-red-500 text-4xl">⚠️</div>
        <h2 className="text-xl font-semibold">Storage Initialization Error</h2>
        <p className="text-muted-foreground">{error}</p>  {/* RAW ERROR EXPOSED! */}
        <button onClick={() => router.push('/login')}>Return to Login</button>
      </div>
    </div>
  );
}
```

**Real-world example of what users might see:**
```
Storage Initialization Error
InvalidStateError: A mutation operation was attempted on a database that did not 
allow mutations
```

**User reaction:** "Uh... what?" Complete confusion.

### AFTER (Good)
```typescript
// Helper function to translate technical errors
function getUserFriendlyStorageError(error: string): string {
  // Log the technical error for debugging
  console.error('[Storage Error]', error);
  
  // Return friendly message based on error type
  if (error.includes('quota') || error.includes('QuotaExceeded')) {
    return "Your browser's storage is full. Try clearing your cache and refresh.";
  }
  if (error.includes('InvalidState') || error.includes('mutation')) {
    return "Try opening Pawkit in a private/incognito window.";
  }
  if (error.includes('NotFound') || error.includes('NotAllowedError')) {
    return "Please allow Pawkit to use browser storage in your browser settings.";
  }
  // Generic fallback
  return "We're having trouble starting up. Try refreshing the page or clearing your browser cache.";
}

// In component:
if (error) {
  const userMessage = getUserFriendlyStorageError(error);
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-4 max-w-md p-6">
        <div className="text-red-500 text-4xl">⚠️</div>
        <h2 className="text-xl font-semibold">Couldn't Start Pawkit</h2>
        <p className="text-muted-foreground">{userMessage}</p>  {/* USER-FRIENDLY! */}
        <div className="space-y-2 pt-4">
          <button 
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-accent text-accent-foreground rounded"
          >
            Try Again
          </button>
          <button 
            onClick={() => {
              // Clear storage and reload
              localStorage.clear();
              sessionStorage.clear();
              window.location.reload();
            }}
            className="w-full px-4 py-2 bg-gray-700 text-gray-100 rounded"
          >
            Clear Cache & Reload
          </button>
          <button 
            onClick={() => router.push('/login')}
            className="w-full px-4 py-2 bg-gray-800 text-gray-200 rounded"
          >
            Return to Login
          </button>
        </div>
      </div>
    </div>
  );
}
```

**What user sees now:**
```
Couldn't Start Pawkit
We're having trouble starting up. Try refreshing the page or 
clearing your browser cache.

[Try Again] [Clear Cache & Reload] [Return to Login]
```

**Improvements:**
- Friendly, non-technical language
- Explains what to try
- Multiple recovery options
- Technical error still logged for debugging
- User feels empowered to solve the problem

---

## Example 3: Generic Error → Context-Aware Error

### BEFORE (Generic)
```typescript
// /components/pawkits/pawkits-header.tsx:79-82
try {
  if (parentId) {
    await deleteCollection(parentId);
  }
  router.push("/pawkits");
} catch (err) {
  alert("Failed to delete Pawkit");  // Too generic!
  setLoading(false);
}
```

**User sees:** "Failed to delete Pawkit" - Why? What can they do?

### AFTER (Context-Aware)
```typescript
try {
  if (parentId) {
    await deleteCollection(parentId);
  }
  router.push("/pawkits");
} catch (err) {
  const { error: showError } = useToast();
  
  // Provide context and guidance
  let errorMessage = "Couldn't delete this Pawkit. Please try again.";
  
  if (err instanceof Error) {
    if (err.message.includes('has children') || err.message.includes('not empty')) {
      errorMessage = "This Pawkit has sub-pawkits or cards. Delete them first.";
    } else if (err.message.includes('in use')) {
      errorMessage = "This Pawkit is being used by another tab. Please refresh and try again.";
    } else if (err.message.includes('permission')) {
      errorMessage = "You don't have permission to delete this Pawkit.";
    }
  }
  
  showError(errorMessage);
  setLoading(false);
}
```

**Improvements:**
- Message explains the specific problem
- Guides user on what to do next
- Uses toast instead of alert
- Non-blocking UI
- Multiple error scenarios handled

---

## Example 4: Silent Failure → User Feedback

### BEFORE (Silent Failure)
```typescript
// /lib/stores/data-store.ts:570-573
try {
  const response = await fetch(`/api/cards/${card.id}`, { 
    method: 'POST', 
    body: JSON.stringify(card) 
  });
  if (!response.ok) throw new Error('Sync failed');
} catch (error) {
  console.error('[DataStore V2] Failed to sync card to server:', error);
  // User sees NO notification that sync failed!
}
```

**Problem:** User thinks their changes were saved, but they weren't synced to server.

### AFTER (User Notification)
```typescript
// In component using the data store
const { error: showError } = useToast();

try {
  await updateCard(cardId, updates);
} catch (error) {
  console.error('[DataStore] Failed to update card:', error);
  
  // Show user what happened
  showError("We saved your changes locally, but couldn't sync to the server. Will retry automatically.");
  
  // Then retry in background
  setTimeout(() => {
    try {
      updateCard(cardId, updates).then(() => {
        showSuccess("Changes synced!");
      });
    } catch (retryError) {
      showError("Still having trouble syncing. Please check your connection.");
    }
  }, 3000);
}
```

**Improvements:**
- User knows what happened
- Knows changes are saved locally (not lost!)
- Knows app will retry automatically
- Knows what to do if sync keeps failing

---

## Quick Reference: Error Message Patterns

### Pattern 1: Simple User-Friendly Wrap
```typescript
try {
  await operation();
} catch (error) {
  console.error('Technical:', error);
  showError("Couldn't complete that action. Please try again.");
}
```

### Pattern 2: Context-Aware Based on Error Type
```typescript
try {
  await operation();
} catch (error) {
  if (error.message.includes('offline')) {
    showError("You're offline. Changes will sync when you reconnect.");
  } else if (error.message.includes('timeout')) {
    showError("Taking too long. Check your connection and retry.");
  } else {
    showError("Couldn't complete that. Please try again.");
  }
}
```

### Pattern 3: With Recovery Action
```typescript
try {
  await operation();
  showSuccess("Done!");
} catch (error) {
  showError({
    title: "Couldn't save",
    message: "Check your internet connection.",
    action: { label: "Retry", onClick: () => operation() }
  });
}
```

### Pattern 4: Silent Failure With Retry
```typescript
const syncWithFallback = async (data) => {
  try {
    await syncToServer(data);
    showSuccess("Changes synced!");
  } catch (error) {
    console.error('Sync failed:', error);
    showInfo("Saving locally. Will sync when you reconnect.", "info");
    
    // Queue for retry
    addToSyncQueue(data);
  }
};
```

---

## Checklist for Reviewing Error Messages

When you see an error message, ask:

- [ ] Would a non-technical user understand this message?
- [ ] Does it explain what went wrong?
- [ ] Does it suggest what to do next?
- [ ] Does it expose technical jargon or internal details?
- [ ] Is it using alert() (should probably be toast)?
- [ ] Is there a recovery action available?
- [ ] Does it acknowledge what WAS saved (if anything)?
- [ ] Is the technical error logged for debugging?

