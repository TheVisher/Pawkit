# ADR 0001: Tags as Canonical Pawkit Membership

## Status

Accepted

## Context

Pawkit needed to track which cards belong to which collections (Pawkits). We had two competing approaches:

1. **collectionNotes-canonical**: Use the `collectionNotes` table as the source of truth
2. **tags-canonical**: Use the card's `tags` array as the source of truth

### The Problem

The original implementation was ambiguous about which system was canonical, leading to:
- Duplicated filtering logic across multiple files
- A critical bug: renaming a Pawkit changed its slug, but cards kept the old slug tag, orphaning them
- Inconsistency when `addCard`/`removeCard` mutations only updated `collectionNotes` but not tags

## Decision

**Tags are canonical for Pawkit membership.** A card belongs to a Pawkit if and only if the card's `tags` array contains the Pawkit's `slug`.

The `collectionNotes` table is retained **solely for card ordering** within a Pawkit.

## Consequences

### Positive

1. **Single source of truth**: No ambiguity about whether a card is in a Pawkit
2. **Privacy filtering works**: Cards in private Pawkits can be filtered by checking tags
3. **Rename safety**: When a Pawkit's slug changes, card tags are migrated inline
4. **Simpler queries**: No need to join with `collectionNotes` to determine membership

### Negative

1. **Reserved tags**: Pawkit slugs are reserved. Users cannot modify them through the tag manager (enforced in UI and server)
2. **Migration cost**: Renaming a Pawkit requires O(n) scan of all cards. Fine for most accounts, may need batching for very large accounts.

## Implementation Details

### Helper Functions

All membership checks use centralized helpers in `src/lib/utils/pawkit-membership.ts`:

```typescript
isCardInPawkit(card, slug)       // Single Pawkit check
isCardInAnyPawkit(card, slugs)   // Set-based check
getDescendantSlugs(slug, cols)   // For leaf-only display
getCardsInPawkit(cards, slug, cols, opts?) // Full filtering
buildPawkitSlugSet(collections)  // Build slug Set
filterNonPrivateCards(cards, privateSlugs) // Privacy filtering
```

### Backend Changes (convex/collections.ts)

1. **Rename migration**: The `update` mutation calls `migrateTagsForSlugChange()` inline when slug changes
2. **addCard**: Also adds the collection slug to `card.tags`
3. **removeCard**: Also removes the collection slug from `card.tags`

### Why Inline Migration (Not Scheduled)

When a Pawkit is renamed, the tag migration runs **inline** (synchronously) rather than as a scheduled job. This is critical for privacy:

If migration were scheduled, there would be a window where cards still have the old slug tag. If the old Pawkit was private and the new one is not (or vice versa), cards could briefly appear in/disappear from non-private views, creating a privacy leak.

### Migration Edge Cases

The migration handles these edge cases:

1. **Deleted/trashed cards**: Migration includes ALL cards (active and deleted) so that restoring a trashed card doesn't leave it orphaned with the old slug tag.

2. **Duplicate tags**: If a card somehow already has the new slug tag, the migration deduplicates after replacement to avoid duplicate entries.

### Pawkit Slug Protection

Pawkit slugs are **reserved tags** that can only be modified through the Pawkit UI (add to Pawkit, remove from Pawkit). This is enforced at two levels:

1. **Server-side (convex/cards.ts)**:
   - `update` mutation: Preserves existing Pawkit slug tags, strips new Pawkit slugs from tag updates
   - `bulkUpdateTags` mutation: Filters out Pawkit slugs from both `addTags` and `removeTags`

2. **UI-side (src/pages/tags.tsx)**:
   - Blocks renaming tags that are Pawkit slugs with message: "Use Pawkit settings to rename"
   - Blocks deleting tags that are Pawkit slugs with message: "Use Pawkit settings to manage membership"
   - Blocks renaming a tag TO a Pawkit slug name with inline validation

This prevents accidental membership changes through the tag manager and ensures all membership changes flow through `collections.addCard`/`removeCard`, keeping `collectionNotes` (ordering) in sync with tags (membership).

### Leaf-Only Display

When viewing a Pawkit's contents, we use "leaf-only" logic: if a card is tagged with both a parent Pawkit and a child Pawkit, it appears only in the child. This prevents duplication when navigating the hierarchy.

## Files Changed

| File | Change |
|------|--------|
| `src/lib/utils/pawkit-membership.ts` | New - centralized helpers |
| `convex/collections.ts` | Tag migration + sync in mutations |
| `convex/cards.ts` | Pawkit slug protection in `update` and `bulkUpdateTags` |
| `src/pages/tags.tsx` | UI blocking for Pawkit slug modifications |
| `src/pages/pawkit-detail.tsx` | Use helpers |
| `src/components/pawkits/pawkit-card.tsx` | Use helpers |
| `src/pages/library.tsx` | Use helpers |
| `src/lib/contexts/convex-data-context.tsx` | Use helpers |
| `src/components/context-menus/add-to-pawkit-submenu.tsx` | Route through addCardToCollection/removeCardFromCollection |
| `src/components/pawkits/cards-drag-handler.tsx` | Route through addCardToCollection |
| `src/components/layout/right-sidebar/CardDetailsPanel.tsx` | Use helpers and mutations |
| `src/pages/pawkits.tsx` | Use buildPawkitSlugSet helper |
| `src/components/layout/mobile-view-options.tsx` | Use helpers |

## Future Considerations

1. **Batch migration**: For accounts with 1000+ cards, consider batching the slug migration via an action to avoid mutation timeouts
2. **Remove collectionNotes**: If card ordering becomes less important or handled differently, `collectionNotes` could potentially be removed entirely

## References

- `src/lib/utils/pawkit-membership.ts` - Helper functions
- `convex/collections.ts` - Backend mutations with tag sync
