# Migration: Convert Den to Private Collection

**Migration ID:** `20251028000000_migrate_den_to_collection`
**Type:** Data Migration
**Idempotent:** ✅ Yes
**Safe to Rollback:** ⚠️ Partial (see main docs)

---

## Quick Summary

Converts the deprecated `inDen` boolean flag to the new private collections system:

1. ✅ Creates "The Den" private collection for affected users
2. ✅ Adds `'the-den'` to collections array for all Den cards
3. ✅ Sets `inDen=false` on migrated cards

---

## Testing

Before running:
```bash
npx tsx scripts/test-den-migration.ts
```

This shows:
- How many users/cards will be affected
- Sample before/after preview
- Safety validation

---

## Running

```bash
npm run prisma:migrate:deploy
```

Or manually:
```bash
psql $DATABASE_URL -f migration.sql
```

---

## What It Does

### For each user with `inDen=true` cards:

**Creates Collection:**
```sql
INSERT INTO Collection (
  id: "den_" + userId,
  name: "The Den",
  slug: "the-den",
  isPrivate: true
)
```

**Updates Cards:**
```
Card { collections: ["personal"] }
  ↓
Card { collections: ["personal", "the-den"], inDen: false }

Card { collections: null }
  ↓
Card { collections: ["the-den"], inDen: false }
```

---

## Idempotency

Safe to run multiple times:
- ✅ Checks if collection exists before creating
- ✅ Checks if card already has 'the-den' before adding
- ✅ No duplicate collections created
- ✅ No duplicate collection entries in arrays

---

## Safety

- ✅ No data deletion
- ✅ Preserves existing collections
- ✅ Handles NULL/empty arrays
- ✅ Validates JSON before updating
- ✅ Uses JSONB operators for safety

---

## Full Documentation

See: `/DEN_TO_COLLECTION_MIGRATION.md`

For detailed information on:
- Testing procedures
- Rollback instructions
- Troubleshooting
- Code migration examples
- Verification steps
