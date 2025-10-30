# Private Pawkits Migration

## Overview

This document describes the architectural shift from "The Den" to "Private Pawkits" - a more flexible and intuitive privacy system.

## What Changed

### Before: The Den Architecture
- Separate `/den` view with isolated UI
- Separate API endpoints (`/api/den/pawkits`, `/api/den/cards`)
- `inDen` flag on both Cards and Collections
- Den Pawkits completely separate from regular Pawkits
- Required context switching between areas

### After: Private Pawkits
- **Single unified Pawkits view** - all pawkits in one place
- **Lock icon (🔒) indicator** for private pawkits vs folder (📁) for public
- **Toggle privacy** via pawkit actions menu
- **Flexible privacy** - any pawkit at any level can be private
- **Isolated content** - cards in private pawkits hidden from Library/Timeline/Search
- **Future-ready** - foundation for per-pawkit password protection

## Database Schema Changes

### Added Fields to `Collection` Model
```prisma
isPrivate Boolean @default(false)  // Private pawkits isolate their cards
passwordHash String?               // Future: per-pawkit passwords
```

### Kept for Migration
```prisma
inDen Boolean @default(false)      // DEPRECATED: kept temporarily for data migration
```

### `Card.inDen` Field
- **Repurposed**: Now means "card is in a private pawkit"
- **Managed automatically**: When pawkit privacy is toggled, all its cards' `inDen` flags update

## Data Migration

### Migration Script: `scripts/migrate-den-to-private-pawkits.ts`

Run with:
```bash
npx tsx scripts/migrate-den-to-private-pawkits.ts
```

**What it does:**
1. **Converts Den Pawkits** → Regular pawkits with `isPrivate=true, inDen=false`
2. **Handles Orphaned Cards** → Creates "Private Items" pawkit for Den cards not in any pawkit
3. **Updates Card Flags** → Ensures all cards in private pawkits have `inDen=true`

**Safe to run multiple times** - idempotent design

### Migration Strategy for Existing Users

When you push to production:
1. Deploy the new code
2. Run the migration script on production database
3. Existing Den users will see their Den Pawkits as Private Pawkits
4. Orphaned Den cards will be organized into "Private Items" pawkit
5. All privacy behavior maintained - no data loss

## Implementation Status

### ✅ Completed (Part 1)

#### Schema & Database
- [x] Add `isPrivate` and `passwordHash` fields to Collection model
- [x] Generate Prisma client with new schema
- [x] Create comprehensive data migration script

#### API Layer
- [x] Update `/lib/validators/collection.ts` to accept `isPrivate`
- [x] Modify `updateCollection()` in `/lib/server/collections.ts`:
  - Accepts `isPrivate` in updates
  - Automatically updates all cards' `inDen` flags when pawkit privacy changes
  - Uses raw SQL for efficient JSONB queries

#### UI - Pawkits Grid
- [x] Show lock icon 🔒 for private pawkits (vs folder 📁 for public)
- [x] Pass `isPrivate` through component hierarchy
- [x] Update type definitions for `CollectionPreviewCard`

#### UI - Pawkit Actions
- [x] Add "Mark as Private" / "Mark as Public" toggle button
- [x] Implement `handlePrivateToggle` with optimistic UI updates
- [x] Add `isPrivate` prop and state management

### 🚧 In Progress / Remaining (Part 2)

#### UI - Tree Navigation
- [ ] Update sidebar tree navigation to show lock icons for private pawkits
- [ ] File: `/components/sidebar/pawkits-tree.tsx` (or similar)
- [ ] Show 🔒 next to private pawkit names in sidebar

#### Card Movement Logic
- [ ] Update card context menu to handle private pawkits
- [ ] When adding card to private pawkit → set `inDen=true`
- [ ] When removing card from last private pawkit → set `inDen=false`
- [ ] Files to update:
  - `/components/cards/card-context-menu.tsx`
  - Card update handlers throughout the app

#### Cleanup - Remove Den Infrastructure
- [ ] Delete `/app/(dashboard)/den` directory and page
- [ ] Delete `/app/api/den` directory (pawkits, cards endpoints)
- [ ] Delete `/components/den` directory
- [ ] Delete `/lib/stores/den-store.ts`
- [ ] Update sidebar navigation - remove Den link
- [ ] Remove Den icon component if it exists
- [ ] Search codebase for "den" references and clean up

#### Testing & Validation
- [ ] Test creating private pawkits
- [ ] Test toggling pawkit privacy
- [ ] Test that cards in private pawkits are hidden from Library/Timeline/Search
- [ ] Test nested private pawkits (sub-pawkits)
- [ ] Test moving cards to/from private pawkits
- [ ] Run migration script on test data
- [ ] Verify orphaned card handling

## Key Files Modified

### Schema & Migration
- `prisma/schema.prisma` - Added isPrivate, passwordHash
- `scripts/migrate-den-to-private-pawkits.ts` - Data migration script

### API & Server Logic
- `lib/validators/collection.ts` - Accept isPrivate in updates
- `lib/server/collections.ts` - Handle isPrivate toggle, sync card flags

### UI Components
- `components/pawkits/grid.tsx` - Lock icon display
- `components/pawkits/pawkit-actions.tsx` - Privacy toggle menu
- `app/(dashboard)/pawkits/page.tsx` - Pass isPrivate to grid

## Card Privacy Logic

### How it Works
1. **Pawkit marked private** → All cards in that pawkit get `inDen=true`
2. **Cards with `inDen=true`** → Filtered from Library, Timeline, Search, Home
3. **Pawkit marked public** → All cards get `inDen=false`, become visible again
4. **Card added to private pawkit** → Automatically gets `inDen=true`
5. **Card removed from private pawkit** → Remains `inDen=true` if in other private pawkits

### Edge Cases Handled
- **Nested private pawkits** → Sub-pawkits can independently be private/public
- **Card in multiple pawkits** → If ANY pawkit is private, card stays `inDen=true`
- **Orphaned cards** → Migration creates default private pawkit for them

## Future Enhancements

### Password Protection (Phase 2)
The `passwordHash` field is already in the schema. Implementation would add:
- Password prompt when accessing private pawkit
- Per-pawkit password configuration in settings
- Encryption/decryption for sensitive data
- Session-based password caching

### Privacy Levels (Phase 3)
Could extend to multiple privacy levels:
- **Public** - Visible everywhere
- **Private** - Hidden from views but accessible directly
- **Encrypted** - Password-protected with encryption
- **Shared** - Private but shareable via link

## Migration Checklist for Production

- [ ] Test migration script thoroughly on staging database
- [ ] Back up production database
- [ ] Deploy new code with schema changes
- [ ] Run Prisma migration: `npx prisma db push` or `npx prisma migrate deploy`
- [ ] Run data migration: `npx tsx scripts/migrate-den-to-private-pawkits.ts`
- [ ] Verify all Den Pawkits converted to Private Pawkits
- [ ] Verify orphaned cards handled correctly
- [ ] Test privacy filtering (cards hidden from views)
- [ ] Monitor for any errors or edge cases
- [ ] Communicate changes to users (Den → Private Pawkits)

## Rollback Plan

If issues arise:
1. Keep the `inDen` flag on Collections temporarily
2. Can revert to showing Den Pawkits separately if needed
3. Data is not deleted, only reorganized
4. Migration script is idempotent - safe to re-run

## User-Facing Changes

### What Users Will See
1. **Den menu item removed** from sidebar
2. **Private Pawkits appear** in main Pawkits view with 🔒 icon
3. **New menu option**: "Mark as Private" / "Mark as Public"
4. **Same privacy behavior**: Cards in private pawkits hidden from views
5. **Better organization**: All pawkits in one unified interface

### Communication Template
```
🎉 New Feature: Private Pawkits

We've upgraded The Den to a more flexible "Private Pawkits" system!

What's New:
- Mark any pawkit as private with a single click
- Private pawkits show a 🔒 lock icon
- All your Den content has been automatically migrated
- Same privacy protection, better organization

Your existing Den Pawkits are now Private Pawkits in your main Pawkits view.
```

## Technical Notes

### Why Raw SQL for Card Queries?
```typescript
const cardsInCollection = await prisma.$queryRaw`
  SELECT id FROM "Card"
  WHERE "userId" = ${userId}
    AND collections::jsonb ? ${updated.slug}
`;
```

Prisma's `has` operator for JSON arrays is unreliable. PostgreSQL's native JSONB `?` operator is more efficient and reliable for checking array membership.

### Why Keep `inDen` on Cards?
The `Card.inDen` field serves a clear purpose:
- Fast filtering: `WHERE inDen = false` is indexed and instant
- No JSON parsing needed for common queries
- Backward compatibility during migration
- Could be renamed to `isPrivate` later but not necessary

### Performance Considerations
- **Indexed queries**: `@@index([userId, isPrivate])` on Collections
- **Bulk updates**: `updateMany` for card flag changes
- **Cached collections**: Next.js cache with 60s revalidation
- **Optimistic UI**: Instant feedback, sync in background

## Questions & Troubleshooting

### Q: Will existing Den Pawkits be lost?
**A:** No! They're converted to Private Pawkits with identical functionality.

### Q: What happens to cards not in a Den Pawkit?
**A:** Migration creates a "Private Items" pawkit for them automatically.

### Q: Can sub-pawkits be private independently?
**A:** Yes! Privacy is per-pawkit, works at any nesting level.

### Q: How do I revert a pawkit to public?
**A:** Click the 3-dot menu → "🔓 Mark as Public"

### Q: Are private pawkits password-protected?
**A:** Not yet - that's Phase 2. For now, they're hidden from views but accessible by URL.

## Developer Notes

If you need to add password protection later:
1. Use `collection.passwordHash` field (already in schema)
2. Hash passwords with bcrypt
3. Add middleware to `/pawkits/[slug]/page.tsx`
4. Store unlocked pawkits in session/localStorage
5. Prompt for password on first access

---

**Status**: Part 1 Complete ✅
**Next**: Tree navigation, card movement, cleanup
**ETA**: 1-2 hours remaining work

