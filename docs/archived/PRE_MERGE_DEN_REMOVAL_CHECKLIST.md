# Pre-Merge Den Removal Checklist

**Purpose:** Prepare codebase for Den → Private Pawkits migration
**When:** Complete these changes BEFORE merging to main
**Migration:** Will run AFTER deployment via `npm run prisma:migrate:deploy`

---

## ✅ What You're Doing

Converting from:
- `inDen: true` flag on cards → Cards in a private collection
- `inDen: true` flag on collections → `isPrivate: true` on collections

**After migration:**
- Old: `Card { inDen: true }`
- New: `Card { collections: ["the-den"], inDen: false }` + `Collection { slug: "the-den", isPrivate: true }`

---

## 📋 Changes Required BEFORE Merge

### 1. Delete Den-Specific API Routes

**Delete these directories:**
```bash
rm -rf app/api/cards/[id]/move-to-den
rm -rf app/api/cards/[id]/remove-from-den
```

**Why:** These routes set `inDen=true/false` directly. After migration, use collection-based API instead.

**Replacement:** Use existing collection endpoints:
- `POST /api/cards/[id]/collections` - Add card to collection
- `DELETE /api/cards/[id]/collections` - Remove card from collection

---

### 2. Update Library Filtering

**File:** `app/(dashboard)/library/page.tsx`

**Find (line 105):**
```typescript
if (card.inDen) return false;
```

**Replace with:**
```typescript
// Filter out cards in private collections
if (card.collections?.some(slug => {
  // Check if any collection is private
  // For now, just exclude 'the-den' (can be enhanced later)
  return slug === 'the-den';
})) return false;
```

**Or better (if you have access to collection data):**
```typescript
// Filter out cards in any private collection
const privateCollectionSlugs = collections
  .filter(c => c.isPrivate)
  .map(c => c.slug);

if (card.collections?.some(slug => privateCollectionSlugs.includes(slug))) {
  return false;
}
```

---

### 3. Update Library Controls Tag Filtering

**File:** `components/control-panel/library-controls.tsx`

**Find (lines 86-92):**
```typescript
// Exclude cards in private pawkits (inDen: true)
const allTags = useMemo(() => {
  const tagMap = new Map<string, number>();

  cards.forEach((card) => {
    // Skip cards in private pawkits
    if (card.inDen) return;
```

**Replace with:**
```typescript
// Exclude cards in private pawkits (cards with 'the-den' or other private collections)
const allTags = useMemo(() => {
  const tagMap = new Map<string, number>();

  cards.forEach((card) => {
    // Skip cards in private collections
    const isInPrivateCollection = card.collections?.some(slug =>
      slug === 'the-den' // or check against list of private collections
    );
    if (isInPrivateCollection) return;
```

**Also find (lines 104-107):**
```typescript
// Skip 'den-' prefixed collections
if (!collection.startsWith('den-')) {
  tagMap.set(collection, (tagMap.get(collection) || 0) + 1);
}
```

**Replace with:**
```typescript
// Skip private collections (like 'the-den')
if (collection !== 'the-den') {
  tagMap.set(collection, (tagMap.get(collection) || 0) + 1);
}
```

---

### 4. Update Card Refresh Logic (Optional)

**File:** `app/api/cards/refresh-expired-images/route.ts`

**Find (line 32):**
```typescript
inDen: false,
```

**This is fine to keep** - newly refreshed cards default to not being in private collections.

---

### 5. Remove Den-Specific Search/Filter Code

**File:** `lib/utils/search-operators.ts`

Check if there are any `inDen` references and update them to use collection-based filtering.

---

### 6. Update Type Definitions (if any)

If you have TypeScript types that reference `inDen`, update them:

**Before:**
```typescript
interface Card {
  inDen: boolean;
  collections?: string[];
}
```

**After (inDen becomes optional/deprecated):**
```typescript
interface Card {
  inDen?: boolean; // Deprecated, will be false after migration
  collections?: string[]; // Array of collection slugs
}
```

---

## 🚫 DO NOT Change (Keep As-Is)

### ❌ Do NOT remove `inDen` from schema yet
The field must exist until migration runs. Keep it in:
- `prisma/schema.prisma` - Keep `inDen Boolean @default(false)` on Card model
- Database - Don't drop the column

### ❌ Do NOT remove migration files
Keep:
- `prisma/migrations/20251028000000_migrate_den_to_collection/`
- `scripts/test-den-migration.ts`

### ❌ Do NOT update the database
Changes are code-only. Database changes happen via migration AFTER deployment.

---

## ✅ Testing Before Merge

After making code changes:

### 1. Verify App Compiles
```bash
npm run build
```

### 2. Test Library View
- Open `/library`
- Verify Den cards are still filtered out
- Verify UI doesn't reference "Den" anymore

### 3. Test API Routes
- Verify `/api/cards/[id]/move-to-den` returns 404 (deleted)
- Verify collection APIs still work

### 4. Check for `inDen` References
```bash
# Search for remaining inDen references
grep -r "inDen" app/ components/ lib/ --exclude-dir=node_modules
```

**Expected remaining references:**
- None in UI components ✅
- None in API routes ✅
- Only in migration scripts (OK to keep)

---

## 📅 Deployment Timeline

### Before Merge (Now)
1. ✅ Make code changes above
2. ✅ Test locally
3. ✅ Commit and merge to main

### After Deployment
1. ✅ Run migration: `npm run prisma:migrate:deploy`
2. ✅ Verify migration: `npx tsx scripts/test-den-migration.ts`
3. ✅ Check database:
   ```sql
   SELECT * FROM "Collection" WHERE slug = 'the-den';
   SELECT COUNT(*) FROM "Card" WHERE "inDen" = true; -- Should be 0
   ```
4. ✅ Test UI: Navigate to `/pawkits/the-den` (if route exists)

### Future (1+ week after migration)
1. Remove `inDen` field from schema
2. Drop database column
3. Remove migration test scripts

---

## 🔗 How Collections Work Now

### Private Collection System

**Collections (Pawkits):**
```typescript
Collection {
  slug: "the-den",
  isPrivate: true,  // ← This makes it private
  name: "The Den"
}
```

**Cards:**
```typescript
Card {
  collections: ["work", "the-den"],  // ← Array of collection slugs
  // Cards in "the-den" are filtered from Library
}
```

### To Add Card to Private Collection

**Using existing API:**
```typescript
// POST /api/cards/[cardId]/collections
// Body: { slug: "the-den" }
```

This will:
1. Add "the-den" to card's collections array
2. Card automatically becomes private (hidden from Library)

### To Remove Card from Private Collection

**Using existing API:**
```typescript
// DELETE /api/cards/[cardId]/collections
// Body: { slug: "the-den" }
```

This will:
1. Remove "the-den" from collections array
2. Card becomes visible in Library (if not in other private collections)

---

## 🐛 Troubleshooting

### After making changes, build fails

**Check:**
1. Did you replace all `inDen` references in UI?
2. Are TypeScript types updated?
3. Did you accidentally remove `inDen` from schema?

### Cards still showing in Library after merge

**Cause:** Filtering logic not updated correctly

**Fix:** Review library filtering code (section 2-3 above)

### API routes still exist

**Cause:** Directories not deleted

**Fix:** `rm -rf app/api/cards/[id]/*-den`

---

## ✅ Checklist Summary

- [ ] Delete Den API routes (`move-to-den`, `remove-from-den`)
- [ ] Update library page filtering (`app/(dashboard)/library/page.tsx`)
- [ ] Update library controls filtering (`components/control-panel/library-controls.tsx`)
- [ ] Search for remaining `inDen` references (should be none in UI)
- [ ] Test app compiles (`npm run build`)
- [ ] Test library view (Den cards filtered out)
- [ ] Commit and merge to main
- [ ] After deployment: Run migration
- [ ] After migration: Verify results

---

**Next Step:** Make these changes, test, then merge to main ✅
