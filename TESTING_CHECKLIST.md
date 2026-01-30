# Pawkit Production Testing Checklist

Use this checklist before deploying to production. Items marked with 🤖 can be automated, items marked with 👤 require manual testing.

---

## 1. Authentication Flow

### Signup
- [ ] 👤 Navigate to `/signup` from landing page
- [ ] 👤 Verify password requirements are enforced (12+ chars, uppercase, lowercase, number, special char)
- [ ] 👤 Verify password mismatch shows error
- [ ] 👤 Successfully create a new account
- [ ] 👤 Verify redirect to `/home` after signup
- [ ] 👤 Verify default workspace is created automatically

### Login
- [ ] 👤 Navigate to `/login` from landing page
- [ ] 👤 Login with valid credentials
- [ ] 👤 Verify incorrect credentials show error message
- [ ] 👤 Verify redirect to `/home` after login
- [ ] 👤 Verify "Remember me" persists session

### Logout
- [ ] 👤 Click workspace menu → "Sign out"
- [ ] 👤 Verify redirect to `/login`
- [ ] 👤 Verify protected routes redirect to `/login` when logged out

---

## 2. Landing Page

- [ ] 👤 Visit `/` when logged out - should show landing page
- [ ] 👤 Visit `/` when logged in - should redirect to `/home`
- [ ] 👤 Verify particle animation renders smoothly
- [ ] 👤 Check reduced motion preference is respected
- [ ] 👤 Test all navigation links (Features, Workflow, Trust anchors)
- [ ] 👤 Test "Get Started" button → `/signup`
- [ ] 👤 Test "Sign in" button → `/login`
- [ ] 👤 Verify responsive design on mobile (< 768px)
- [ ] 👤 Verify responsive design on tablet (768-1024px)

---

## 3. Dashboard (Home)

- [ ] 👤 Verify greeting message shows correct time of day
- [ ] 👤 Verify stats display (card count, unread, in progress)
- [ ] 👤 Test Daily Log widget - add an entry
- [ ] 👤 Test Scheduled Today widget displays events
- [ ] 👤 Test Continue Reading widget shows in-progress articles
- [ ] 👤 Test Recent Cards widget shows latest saves
- [ ] 👤 Test Tasks widget - add a task
- [ ] 👤 Test widget drag and drop repositioning
- [ ] 👤 Test widget resizing
- [ ] 👤 Verify layout persists after page reload

---

## 4. Library

- [ ] 👤 Navigate to `/library`
- [ ] 👤 Verify cards load and display correctly
- [ ] 👤 Test search functionality in omnibar
- [ ] 👤 Test content type filters (links, notes, images, etc.)
- [ ] 👤 Test tag filtering
- [ ] 👤 Test sort options (date, title)
- [ ] 👤 Test card click → content panel opens
- [ ] 👤 Test infinite scroll / pagination

### Add Card Modal
- [ ] 👤 Open add card modal (+ button or keyboard shortcut)
- [ ] 👤 Add a link - verify metadata extraction
- [ ] 👤 Add a note - verify Plate editor works
- [ ] 👤 Add tags to a card
- [ ] 👤 Assign card to a Pawkit

---

## 5. Calendar

- [ ] 👤 Navigate to `/calendar`
- [ ] 👤 Verify current date is highlighted
- [ ] 👤 Navigate between months
- [ ] 👤 Click a date to see scheduled items
- [ ] 👤 Create a new event/scheduled item
- [ ] 👤 Drag and drop to reschedule (if implemented)

---

## 6. Pawkits

- [ ] 👤 Navigate to `/pawkits`
- [ ] 👤 Create a new Pawkit
- [ ] 👤 Rename a Pawkit
- [ ] 👤 Delete a Pawkit (verify confirmation)
- [ ] 👤 Verify nested Pawkit hierarchy works
- [ ] 👤 Drag card into Pawkit in sidebar
- [ ] 👤 View Pawkit detail page (`/pawkits/[slug]`)

---

## 7. Tags

- [ ] 👤 Navigate to `/tags`
- [ ] 👤 View all tags
- [ ] 👤 Click tag to filter cards
- [ ] 👤 Rename a tag
- [ ] 👤 Delete a tag (verify cards are untagged)
- [ ] 👤 Change tag color

---

## 8. Content Panel / Card Detail

- [ ] 👤 Open a link card - verify reader mode works
- [ ] 👤 Open a note card - verify editor loads
- [ ] 👤 Edit note content and save
- [ ] 👤 Add/remove tags from card
- [ ] 👤 Move card to different Pawkit
- [ ] 👤 Delete card (verify moves to trash)
- [ ] 👤 Test social media embeds (Twitter, Reddit, TikTok, Pinterest)

---

## 9. Trash

- [ ] 👤 Navigate to `/trash`
- [ ] 👤 Verify deleted items appear
- [ ] 👤 Restore an item from trash
- [ ] 👤 Permanently delete an item (verify confirmation)

---

## 10. Settings

### Workspace Settings
- [ ] 👤 Open settings panel
- [ ] 👤 Rename workspace
- [ ] 👤 Switch between workspaces
- [ ] 👤 Create new workspace
- [ ] 👤 Set default workspace
- [ ] 👤 Delete non-default workspace

### Theme Settings
- [ ] 👤 Toggle dark/light mode
- [ ] 👤 Test visual style options (glass, flat, high-contrast)
- [ ] 👤 Verify theme persists after reload

### Account Settings
- [ ] 👤 View account info (email, etc.)
- [ ] 👤 Attempt account deletion (should show "not available" toast)

---

## 11. Mobile Responsiveness

Test on actual mobile device or DevTools mobile simulation:

- [ ] 👤 Landing page renders correctly
- [ ] 👤 Login/signup forms are usable
- [ ] 👤 Bottom navigation bar appears on mobile
- [ ] 👤 Left sidebar is hidden/drawer on mobile
- [ ] 👤 Cards display in single column
- [ ] 👤 Omnibar is accessible and functional
- [ ] 👤 Touch interactions work (swipe, tap)

---

## 12. Error Handling

- [ ] 👤 Trigger a network error - verify error boundary shows
- [ ] 👤 Verify toast notifications appear for errors (not browser alerts)
- [ ] 👤 Test 404 page for invalid routes
- [ ] 👤 Test behavior when Convex is unavailable

---

## 13. Performance

- [ ] 👤 Run Lighthouse audit (aim for 90+ on Performance)
- [ ] 👤 Check Core Web Vitals (LCP, FID, CLS)
- [ ] 👤 Verify no memory leaks with extended use
- [ ] 👤 Test with large number of cards (100+)

---

## 14. Security Verification

- [ ] 👤 Verify DevTools don't appear in production build
- [ ] 👤 Check network tab for exposed credentials
- [ ] 👤 Test protected routes redirect when unauthorized
- [ ] 👤 Verify X-Frame-Options header is set (check in Network tab)
- [ ] 👤 Verify X-Content-Type-Options header is set
- [ ] 👤 Test that CORS blocks unauthorized origins

---

## 15. Browser Compatibility

Test on:
- [ ] 👤 Chrome (latest)
- [ ] 👤 Firefox (latest)
- [ ] 👤 Safari (latest)
- [ ] 👤 Edge (latest)
- [ ] 👤 Mobile Safari (iOS)
- [ ] 👤 Chrome for Android

---

## 16. Automated Test Suite

Run before each deploy:

```bash
# Run all unit tests
npm run test

# Expected: 35+ tests passing
```

Current test coverage:
- ✅ Password validation (11 tests)
- ✅ Utility functions - cn, slugify (18 tests)
- ✅ Rate limiting (6 tests)

---

## Pre-Deploy Checklist

Before deploying to production:

1. [ ] All manual tests above are passing
2. [ ] `npm run test` passes
3. [ ] `npm run build` succeeds without errors
4. [ ] Environment variables are configured in production
5. [ ] Database migrations are applied (if any)
6. [ ] Monitoring/error tracking is configured (Sentry, etc.)
7. [ ] SSL certificate is valid
8. [ ] DNS is configured correctly

---

## Post-Deploy Verification

After deploying:

1. [ ] Visit production URL - landing page loads
2. [ ] Create test account
3. [ ] Add a test card
4. [ ] Verify real-time sync works
5. [ ] Check error tracking dashboard for issues
6. [ ] Monitor server logs for errors

---

## Known Issues / Limitations

- Some existing tests in `archive-next/` folder fail due to path resolution (pre-existing, not blocking)
- DevTools console shows "React DevTools" download suggestion (harmless)
- Vite test runner shows "hanging process" warning (doesn't affect test results)

---

Last updated: January 28, 2026
