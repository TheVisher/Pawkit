# Pawkit Pre-Launch Checklist
> Goal: Get to main branch ASAP with core functionality working close to perfect
> Timeline: Next few days

---

## Day 1: Core Stability & Data Integrity

### Data Integrity Checks
```bash
claude-code "Review all API routes for proper error handling, input validation, and edge cases. Ensure all routes return consistent error responses"
```

```bash
claude-code "Audit the sync-service.ts for race conditions and data loss scenarios. Add defensive checks for concurrent operations"
```

```bash
claude-code "Test and fix the multi-session conflict detection on the feat/multi-session-detection branch. Ensure sessions don't overwrite each other's data"
```

```bash
claude-code "Add comprehensive validation to card and collection creation/updates. Prevent duplicate cards, invalid slugs, and orphaned references"
```

---

## Day 2: Critical User Flows

### Complete Flow Testing
```bash
claude-code "Test and fix the complete card lifecycle: create → edit → move to collection → tag → delete → restore from trash. Ensure IndexedDB and server stay in sync"
```

```bash
claude-code "Test collection (pawkit) operations: create → rename → move cards in/out → delete → restore. Fix any slug generation or reference issues"
```

```bash
claude-code "Verify the browser extension integration works correctly - saving cards, authentication, and token refresh"
```

```bash
claude-code "Test the private pawkit feature thoroughly - ensure cards stay isolated, password protection works, and they don't leak into public views"
```

---

## Day 3: Polish & Edge Cases

### User Experience Polish
```bash
claude-code "Add loading states and error messages for all async operations. Ensure users always know what's happening"
```

```bash
claude-code "Handle edge cases: offline mode, failed syncs, network interruptions, server errors. Add retry mechanisms and clear user feedback"
```

```bash
claude-code "Test with a large dataset - import 1000+ cards and ensure the UI remains performant. Add pagination or virtualization if needed"
```

```bash
claude-code "Fix any console errors and warnings. Remove debug logs. Ensure the app runs clean in production mode"
```

---

## Critical Bugs to Hunt

### Race Conditions & Edge Cases
```bash
claude-code "Search for and fix any race conditions in the Zustand store where multiple async operations could conflict"
```

```bash
claude-code "Review the IndexedDB schema versioning in local-storage.ts. Ensure migrations work correctly for existing users"
```

```bash
claude-code "Test authentication edge cases: expired tokens, logout, session refresh, extension token auth"
```

```bash
claude-code "Verify metadata fetching handles failures gracefully - timeouts, 404s, malformed HTML, CORS issues"
```

---

## Pre-Launch Testing Protocol

### Testing Scripts
```bash
claude-code "Create a production pre-flight checklist script that verifies: database connectivity, environment variables, Supabase auth, and critical API endpoints"
```

```bash
claude-code "Test the complete user onboarding flow: signup → first card → first collection → invite extension install"
```

---

## High-Risk Code Review Areas

These areas need careful review before launch:

1. **Data store mutations** - Any code that modifies `cards` or `collections` arrays
2. **Sync logic** - The reconciliation between IndexedDB and server
3. **Auth flows** - Login, logout, token refresh, extension auth
4. **Card duplication prevention** - The current branch's main feature
5. **Collection slug handling** - Ensuring slugs are unique and stable

---

## Critical Questions to Answer Before Launch

### Data Integrity
- [ ] Can users lose data in any scenario?
- [ ] What happens if IndexedDB is corrupted or cleared?
- [ ] Does the sync recover correctly from interrupted syncs?

### Multi-Session
- [ ] What happens when two tabs edit the same card simultaneously?
- [ ] Does the session detection actually prevent conflicts?
- [ ] Can users force-take-over a session safely?

### Extension
- [ ] Does the extension auth token persist correctly?
- [ ] Can users save cards from the extension reliably?
- [ ] What happens if the extension token expires?

### Performance
- [ ] Does the app work with 500+ cards?
- [ ] Are there any memory leaks in long sessions?
- [ ] Do searches complete in <1 second?

---

## Recommended Starting Point

**Begin with comprehensive audit:**
```bash
claude-code "Perform a comprehensive production-readiness audit. Check: 1) All API routes for error handling, 2) Data store for race conditions, 3) Sync service for data loss scenarios, 4) Auth flows for security issues, 5) UI for loading/error states. Create a detailed report with priority-ranked issues found."
```

---

## Progress Tracking

### Day 1 - Core Stability
- [ ] API routes audit complete (see API_AUDIT_REPORT.md)
- [ ] API routes fixes implemented
- [ ] Sync service audited
- [ ] Multi-session conflict detection tested
- [ ] Validation added to card/collection operations

### Day 2 - Critical Flows
- [ ] Card lifecycle tested end-to-end
- [ ] Collection operations tested end-to-end
- [ ] Browser extension integration verified
- [ ] Private pawkit feature tested

### Day 3 - Polish
- [ ] Loading states added throughout
- [ ] Edge case handling implemented
- [ ] Large dataset performance tested
- [ ] Console cleaned (no errors/warnings)

### Final Checks
- [ ] Production pre-flight script created and passing
- [ ] User onboarding flow tested
- [ ] All critical questions answered
- [ ] Code review of high-risk areas complete

---

**Status:** Day 1 - API Audit Complete
**Next:** Review API_AUDIT_REPORT.md and prioritize fixes
**Last Updated:** October 28, 2025
