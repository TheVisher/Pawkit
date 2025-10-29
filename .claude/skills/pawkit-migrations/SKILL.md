# Pawkit Migrations & Deployment Patterns

**Purpose**: Document safe deployment and data migration patterns to prevent data loss

**Status**: Den→Private Pawkits migration completed October 2025

**Key Principle**: Never lose user data. Always have a rollback plan. Test on production data copy.

---

## DEPLOYMENT PHILOSOPHY

### Core Principles

1. **Never Lose User Data** - Data is sacred, make no compromises
2. **Always Have Rollback Plan** - Be able to revert quickly
3. **Test on Production Data Copy** - Staging should mirror production
4. **Gradual Migrations** - Migrate data incrementally, not all at once
5. **Keep Old Fields Temporarily** - Don't drop columns immediately
6. **Idempotent Operations** - Safe to run migrations multiple times
7. **Monitor Everything** - Watch for errors 24-48 hours post-deploy

---

## DATABASE MIGRATION PATTERNS

### Rule 1: Backup Before Migration

**ALWAYS backup database before running migrations**

```bash
# Before deploying
# Backup production database
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql

# Verify backup
ls -lh backup-*.sql

# Store backup securely
aws s3 cp backup-*.sql s3://pawkit-backups/
```

---

### Rule 2: Test on Staging First

**NEVER run migrations directly on production without testing**

```bash
# 1. Restore production backup to staging
psql $STAGING_DATABASE_URL < backup-production.sql

# 2. Run migration on staging
cd staging
npm run prisma:migrate:deploy

# 3. Test app thoroughly
npm run test:integration
npm run test:smoke

# 4. Verify data integrity
npm run verify:migration

# 5. If all pass, deploy to production
```

---

### Rule 3: Use Prisma Migrations (Not Raw SQL)

**❌ WRONG: Raw SQL migrations**
```sql
-- migrations/manual.sql
ALTER TABLE cards ADD COLUMN is_private BOOLEAN DEFAULT FALSE;
UPDATE cards SET is_private = TRUE WHERE in_den = TRUE;
ALTER TABLE cards DROP COLUMN in_den;
```

**Problems**:
- No version tracking
- No rollback capability
- No type safety
- Not tracked by Prisma

**✅ CORRECT: Prisma migrations**
```bash
# Generate migration from schema changes
npx prisma migrate dev --name add_private_field

# Review generated SQL
cat prisma/migrations/*/migration.sql

# Test on staging
npx prisma migrate deploy

# Deploy to production
npm run prisma:migrate:deploy
```

**Benefits**:
- Version tracked in git
- Automatic rollback on failure
- Type-safe schema
- Prisma client regenerated automatically

---

### Rule 4: Keep Old Fields Temporarily

**Pattern**: Add new field, keep old field, drop old field after verification

**❌ WRONG: Immediate drop**
```prisma
// Old schema
model Card {
  id     String @id
  inDen  Boolean @default(false)
}

// New schema - WRONG!
model Card {
  id        String @id
  isPrivate Boolean @default(false)
  // ❌ inDen dropped immediately - risky!
}
```

**✅ CORRECT: Gradual migration**

**Step 1: Add new field, keep old**
```prisma
// Week 1: Add new field
model Card {
  id        String   @id
  inDen     Boolean  @default(false)  // Keep old field
  isPrivate Boolean? @default(false)  // Add new field (nullable)
}
```

**Step 2: Migrate data**
```tsx
// Migration script
async function migrateInDenToPrivate() {
  const cardsWithInDen = await prisma.card.findMany({
    where: { inDen: true }
  });

  for (const card of cardsWithInDen) {
    await prisma.card.update({
      where: { id: card.id },
      data: { isPrivate: true }
    });
  }
}
```

**Step 3: Update code to use new field**
```tsx
// Update all code to use isPrivate
const cards = await prisma.card.findMany({
  where: { isPrivate: false }  // Use new field
});
```

**Step 4: Drop old field (after 1-2 weeks)**
```prisma
// Week 3: Drop old field
model Card {
  id        String  @id
  isPrivate Boolean @default(false)
  // ✅ inDen dropped after verification
}
```

---

### Rule 5: Don't Drop Columns Immediately

**Timeline for column removal**:

```
Week 0: Deploy new field
    ↓
Week 1: Migrate data
    ↓
Week 1: Update code to use new field
    ↓
Week 2: Monitor for issues
    ↓
Week 3: Verify no issues
    ↓
Week 3: Drop old field
```

**Why wait 2-3 weeks?**
- Time to discover bugs
- Time for rollback if needed
- Time for users to report issues
- Time to verify migration success

---

## MIGRATION PROCESS

### Safe Migration Pattern

**Example: Migrating `inDen` → `isPrivate` on Collections**

#### Step 1: Add New Field (Keep Old)

**Schema change**:
```prisma
// prisma/schema.prisma

model Collection {
  id        String   @id @default(cuid())
  slug      String   @unique
  name      String
  inDen     Boolean  @default(false)  // OLD FIELD - Keep for now
  isPrivate Boolean? @default(false)  // NEW FIELD - Nullable initially
  userId    String
  cards     Card[]
}
```

**Generate migration**:
```bash
npx prisma migrate dev --name add_is_private_to_collection
```

**Review migration SQL**:
```sql
-- Migration: add_is_private_to_collection
ALTER TABLE "Collection" ADD COLUMN "isPrivate" BOOLEAN DEFAULT false;
```

---

#### Step 2: Migrate Data Gradually

**Create migration route**:
```tsx
// app/api/migrate/den-to-private/route.ts

export async function POST(request: Request) {
  let user: User | null = null;

  try {
    user = await getServerUser(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // Migrate this user's data
    await migrateUserDenToPrivate(user.id);

    return NextResponse.json({
      success: true,
      message: 'Migration completed'
    });
  } catch (error) {
    console.error('Migration error for user:', user?.id, error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'MIGRATION_ERROR',
          message: 'Migration failed'
        }
      },
      { status: 500 }
    );
  }
}

// Migration function (idempotent)
async function migrateUserDenToPrivate(userId: string) {
  // 1. Find user's collections with inDen=true
  const denCollections = await prisma.collection.findMany({
    where: {
      userId,
      inDen: true,
      isPrivate: null  // Not yet migrated
    }
  });

  if (denCollections.length === 0) {
    console.log('No collections to migrate for user:', userId);
    return;
  }

  // 2. Update collections to use isPrivate
  for (const collection of denCollections) {
    await prisma.collection.update({
      where: { id: collection.id },
      data: {
        isPrivate: true,
        // Keep inDen for now (will drop later)
      }
    });
  }

  // 3. Update cards in private collections
  for (const collection of denCollections) {
    await prisma.card.updateMany({
      where: { collectionSlug: collection.slug },
      data: { isPrivate: true }
    });
  }

  console.log(`Migrated ${denCollections.length} collections for user ${userId}`);
}
```

**Run per user on login**:
```tsx
// components/providers/auth-provider.tsx

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // Run migration for this user (idempotent - safe to run multiple times)
      fetch('/api/migrate/den-to-private', {
        method: 'POST'
      }).catch(err => {
        console.error('Migration failed:', err);
        // Non-blocking - app still works
      });
    }
  }, [user?.id]);

  return <>{children}</>;
}
```

---

#### Step 3: Update Code to Use New Field

**Update all queries**:
```tsx
// ❌ OLD: Using inDen
const denCards = await prisma.card.findMany({
  where: { inDen: true }
});

// ✅ NEW: Using isPrivate
const privateCards = await prisma.card.findMany({
  where: { isPrivate: true }
});
```

**Update all filters**:
```tsx
// Library view - exclude private cards
const libraryCards = await prisma.card.findMany({
  where: {
    userId: user.id,
    isPrivate: false,  // Use new field
    deletedAt: null
  }
});
```

**Update all mutations**:
```tsx
// Creating private collection
const collection = await prisma.collection.create({
  data: {
    name: 'Secret Project',
    isPrivate: true,  // Use new field
    userId: user.id
  }
});
```

---

#### Step 4: Verify Migration (After 1-2 Weeks)

**Verification script**:
```tsx
// scripts/verify-den-migration.ts

async function verifyDenMigration() {
  // Check 1: No collections should have inDen=true and isPrivate=null
  const unmigrated = await prisma.collection.findMany({
    where: {
      inDen: true,
      isPrivate: null
    }
  });

  if (unmigrated.length > 0) {
    console.error(`⚠️  ${unmigrated.length} unmigrated collections found!`);
    return false;
  }

  // Check 2: All collections with inDen=true should have isPrivate=true
  const denCollections = await prisma.collection.findMany({
    where: { inDen: true }
  });

  const mismatch = denCollections.filter(c => !c.isPrivate);

  if (mismatch.length > 0) {
    console.error(`⚠️  ${mismatch.length} collections have inDen=true but isPrivate=false!`);
    return false;
  }

  // Check 3: All cards in private collections should be private
  const privateCollections = await prisma.collection.findMany({
    where: { isPrivate: true },
    include: { cards: true }
  });

  let invalidCards = 0;
  for (const collection of privateCollections) {
    const nonPrivateCards = collection.cards.filter(c => !c.isPrivate);
    invalidCards += nonPrivateCards.length;
  }

  if (invalidCards > 0) {
    console.error(`⚠️  ${invalidCards} cards in private collections are not marked private!`);
    return false;
  }

  console.log('✅ All checks passed!');
  console.log(`- ${denCollections.length} collections with inDen=true`);
  console.log(`- All have isPrivate=true`);
  console.log(`- All cards in private collections are private`);

  return true;
}

// Run verification
verifyDenMigration().then(success => {
  process.exit(success ? 0 : 1);
});
```

**Run verification**:
```bash
npx tsx scripts/verify-den-migration.ts
```

---

#### Step 5: Drop Old Field (After 2-3 Weeks)

**Final cleanup**:
```prisma
// prisma/schema.prisma

model Collection {
  id        String  @id @default(cuid())
  slug      String  @unique
  name      String
  // ✅ inDen removed (after verification)
  isPrivate Boolean @default(false)  // Make non-nullable
  userId    String
  cards     Card[]
}
```

**Generate cleanup migration**:
```bash
npx prisma migrate dev --name remove_in_den_field
```

**Review cleanup SQL**:
```sql
-- Migration: remove_in_den_field
ALTER TABLE "Collection" DROP COLUMN "inDen";
ALTER TABLE "Collection" ALTER COLUMN "isPrivate" SET NOT NULL;
```

---

## IDEMPOTENT DATA MIGRATIONS

### Make Migrations Safe to Run Multiple Times

**❌ WRONG: Not idempotent**
```tsx
// Will fail if run twice
async function migrate() {
  const collection = await prisma.collection.create({
    data: { slug: 'the-den', name: 'The Den', isPrivate: true }
  });
}
```

**✅ CORRECT: Idempotent**
```tsx
async function migrate() {
  // Check if already migrated
  const existing = await prisma.collection.findUnique({
    where: { slug: 'the-den' }
  });

  if (existing) {
    console.log('Collection already exists, updating...');
    await prisma.collection.update({
      where: { slug: 'the-den' },
      data: { isPrivate: true }
    });
    return;
  }

  // Create if doesn't exist
  await prisma.collection.create({
    data: { slug: 'the-den', name: 'The Den', isPrivate: true }
  });
}
```

**Pattern**:
1. Check if migration already ran
2. If yes, update or skip
3. If no, perform migration
4. Safe to run multiple times

---

## DEN MIGRATION EXAMPLE (OCTOBER 2025)

### Complete Migration Implementation

**Goal**: Migrate `inDen` field to `isPrivate` on Collections and Cards

**Timeline**:
- **Oct 15**: Add `isPrivate` field, keep `inDen`
- **Oct 16**: Deploy migration route
- **Oct 17-30**: Users migrated gradually on login
- **Nov 1**: Verify migration (100% success)
- **Nov 5**: Drop `inDen` field

---

### Step 1: Schema Changes

**Added `isPrivate` to Collection and Card models**:
```prisma
model Collection {
  id        String  @id
  slug      String  @unique
  inDen     Boolean @default(false)  // Keep temporarily
  isPrivate Boolean @default(false)  // Add new field
}

model Card {
  id              String  @id
  collectionSlug  String?
  inDen           Boolean @default(false)  // Keep temporarily
  isPrivate       Boolean @default(false)  // Add new field
}
```

---

### Step 2: Migration Route

**Created `/api/migrate/den/route.ts`**:
```tsx
export async function POST(request: Request) {
  const user = await getServerUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Create 'the-den' collection if doesn't exist
  const denCollection = await prisma.collection.upsert({
    where: { slug: 'the-den', userId: user.id },
    create: {
      slug: 'the-den',
      name: 'The Den',
      isPrivate: true,
      userId: user.id
    },
    update: {
      isPrivate: true
    }
  });

  // Migrate cards with inDen=true
  const denCards = await prisma.card.findMany({
    where: {
      userId: user.id,
      inDen: true
    }
  });

  for (const card of denCards) {
    await prisma.card.update({
      where: { id: card.id },
      data: {
        collectionSlug: 'the-den',
        isPrivate: true
      }
    });
  }

  return NextResponse.json({
    success: true,
    migrated: denCards.length
  });
}
```

---

### Step 3: Trigger on Login

**Run migration when user logs in**:
```tsx
useEffect(() => {
  if (user) {
    fetch('/api/migrate/den', { method: 'POST' })
      .catch(err => console.error('Migration failed:', err));
  }
}, [user?.id]);
```

---

### Step 4: Verification

**After 2 weeks, verified**:
```bash
npx tsx scripts/verify-den-migration.ts

# Output:
✅ All checks passed!
- 0 cards with inDen=true (all migrated)
- 'the-den' collection exists for all users
- All cards in 'the-den' are private
- No orphaned inDen cards
```

---

### Step 5: Cleanup

**After verification, dropped old fields**:
```prisma
model Collection {
  id        String  @id
  slug      String  @unique
  isPrivate Boolean @default(false)
  // inDen removed ✅
}

model Card {
  id              String  @id
  collectionSlug  String?
  isPrivate       Boolean @default(false)
  // inDen removed ✅
}
```

---

## DEPLOYMENT CHECKLIST

### Pre-Deployment

**Before deploying to production**:

- [ ] Backup production database
  ```bash
  pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
  ```

- [ ] Test on staging with production data copy
  ```bash
  psql $STAGING_DB < backup-production.sql
  npm run prisma:migrate:deploy
  npm run test:smoke
  ```

- [ ] Review all migrations
  ```bash
  ls prisma/migrations/
  cat prisma/migrations/*/migration.sql
  ```

- [ ] Create rollback plan (document below)

- [ ] Notify team of deployment window

---

### During Deployment

**Deployment steps**:

1. **Deploy code**
   ```bash
   git checkout main
   git pull origin main
   vercel deploy --prod
   ```

2. **Run Prisma migrations**
   ```bash
   npm run prisma:migrate:deploy
   ```

3. **Verify app loads**
   ```bash
   curl https://pawkit.app
   # Should return 200
   ```

4. **Check critical routes**
   ```bash
   # Test authentication
   curl https://pawkit.app/api/auth/session

   # Test cards endpoint
   curl https://pawkit.app/api/cards -H "Authorization: Bearer $TOKEN"

   # Test collections endpoint
   curl https://pawkit.app/api/pawkits -H "Authorization: Bearer $TOKEN"
   ```

5. **Regenerate Prisma client** (if schema changed)
   ```bash
   npm run prisma:generate
   ```

---

### Post-Deployment (First 24 Hours)

**Monitor for issues**:

- [ ] Check error logs
  ```bash
  vercel logs --prod
  # Look for 500 errors, database errors
  ```

- [ ] Monitor error rate in Sentry/LogRocket
  - Target: <1% error rate
  - Alert if >5% error rate

- [ ] Check API response times
  - Target: <500ms p95
  - Alert if >2s p95

- [ ] Monitor database connections
  - Check for connection pool exhaustion
  - Watch for slow queries

- [ ] Test critical user flows manually
  - [ ] Create card
  - [ ] Edit card
  - [ ] Move card to collection
  - [ ] Search cards
  - [ ] Create private collection
  - [ ] Verify private cards not in Library

---

### Post-Deployment (24-48 Hours)

**Verify migrations**:

- [ ] Run migration verification script
  ```bash
  npm run verify:migration
  ```

- [ ] Check user reports
  - Zero data loss reports?
  - Any unexpected behavior?

- [ ] Verify data integrity
  ```bash
  # Check for orphaned records
  npm run verify:data-integrity
  ```

- [ ] Review analytics
  - Any drop in usage?
  - Any increase in errors?

---

### Post-Deployment (After 1-2 Weeks)

**Cleanup**:

- [ ] Verify migration 100% complete
  ```bash
  npm run verify:migration
  ```

- [ ] Drop old fields if safe
  ```bash
  npx prisma migrate dev --name remove_old_fields
  npm run prisma:migrate:deploy
  ```

- [ ] Archive old backups
  ```bash
  aws s3 mv backup-*.sql s3://pawkit-backups/archive/
  ```

- [ ] Update documentation
  - Document migration completion
  - Update schema diagrams
  - Archive migration plan

---

## ROLLBACK PLAN

### Quick Rollback (Code Only)

**If new code has bugs but database is fine**:

1. **Revert to previous deployment**
   ```bash
   # Find previous deployment
   vercel list

   # Promote previous deployment
   vercel promote <previous-deployment-url>
   ```

2. **Verify app works**
   ```bash
   curl https://pawkit.app
   # Should return 200
   ```

3. **Time to rollback**: ~2 minutes

---

### Full Rollback (Code + Database)

**If database migration caused issues**:

1. **Take emergency backup**
   ```bash
   pg_dump $DATABASE_URL > emergency-backup-$(date +%Y%m%d-%H%M%S).sql
   ```

2. **Restore previous backup**
   ```bash
   # DANGER: This deletes current data
   psql $DATABASE_URL < backup-pre-deployment.sql
   ```

3. **Revert code**
   ```bash
   vercel promote <previous-deployment-url>
   ```

4. **Verify app works**
   ```bash
   npm run test:smoke
   ```

5. **Time to rollback**: ~10-15 minutes

---

### Partial Rollback (Feature Flag)

**Best approach: Use feature flags**:

```tsx
// lib/feature-flags.ts

export const FeatureFlags = {
  PRIVATE_PAWKITS: process.env.NEXT_PUBLIC_FEATURE_PRIVATE_PAWKITS === 'true',
  DEN_MIGRATION: process.env.NEXT_PUBLIC_FEATURE_DEN_MIGRATION === 'true'
};

// Usage
function CardList() {
  const cards = useCards();

  // Filter private cards only if feature enabled
  const filteredCards = FeatureFlags.PRIVATE_PAWKITS
    ? cards.filter(c => !c.isPrivate)
    : cards;

  return <div>{filteredCards.map(c => <Card {...c} />)}</div>;
}
```

**Disable feature without code deploy**:
```bash
# Disable feature via environment variable
vercel env rm NEXT_PUBLIC_FEATURE_PRIVATE_PAWKITS production
vercel env add NEXT_PUBLIC_FEATURE_PRIVATE_PAWKITS production
# Enter: false
```

**Time to rollback**: Instant

---

## STAGING ENVIRONMENT

### Staging Setup

**Requirements**:
- Separate database (copy of production)
- Same environment variables as production
- Same infrastructure (Vercel, Supabase, etc.)

**Setup staging**:
```bash
# Create staging database
createdb pawkit_staging

# Restore production backup to staging
pg_dump $PRODUCTION_DATABASE_URL | psql $STAGING_DATABASE_URL

# Deploy to staging
vercel deploy --target=preview

# Set staging environment variables
vercel env add DATABASE_URL preview
# Enter: <staging-database-url>
```

---

### Testing on Staging

**What to test**:

1. **Run migrations**
   ```bash
   npm run prisma:migrate:deploy
   ```

2. **Smoke tests**
   ```bash
   npm run test:smoke
   ```

3. **Integration tests**
   ```bash
   npm run test:integration
   ```

4. **Manual testing**
   - Test all critical user flows
   - Test migrations with real data
   - Test rollback procedure

5. **Performance testing**
   ```bash
   npm run test:performance
   ```

---

## POST_DEPLOY_REMINDER

**From `_POST_DEPLOY_REMINDER.md`**:

### 24-48 Hours After Deploy

**Verify Den Migration**:

- [ ] Check no cards have `inDen=true`
  ```sql
  SELECT COUNT(*) FROM "Card" WHERE "inDen" = true;
  -- Should be 0
  ```

- [ ] Verify 'the-den' collection exists
  ```sql
  SELECT COUNT(*) FROM "Collection" WHERE slug = 'the-den';
  -- Should be > 0
  ```

- [ ] Test Den filtering in Library
  - Visit `/library`
  - Verify no cards from 'the-den' visible

- [ ] Test `is:den` search operator
  - Search for: `is:den`
  - Verify returns only Den cards

- [ ] Verify Den UI routes accessible
  - Visit `/den`
  - Should load without errors

**If All Checks Pass**:
```bash
# Run cleanup migration (remove inDen field)
npx prisma migrate dev --name remove_in_den_field
npm run prisma:migrate:deploy
```

---

## MIGRATION BEST PRACTICES

### DO ✅

1. **Backup before migration**
   - Always have a backup
   - Test restore procedure

2. **Test on staging**
   - Use production data copy
   - Test full migration process

3. **Make migrations idempotent**
   - Safe to run multiple times
   - Check if already migrated

4. **Keep old fields temporarily**
   - Don't drop immediately
   - Wait 1-2 weeks

5. **Gradual rollout**
   - Migrate per user on login
   - Don't migrate all at once

6. **Monitor everything**
   - Watch error rates
   - Check performance
   - Verify data integrity

7. **Have rollback plan**
   - Document rollback steps
   - Test rollback procedure
   - Use feature flags

8. **Verify before cleanup**
   - Run verification scripts
   - Check user reports
   - Confirm 100% migrated

---

### DON'T ❌

1. **Don't drop columns immediately**
   - Keep old fields 1-2 weeks
   - Allows rollback

2. **Don't skip staging**
   - Always test on staging
   - Use production data copy

3. **Don't deploy on Friday**
   - Deploy early in week
   - Time to fix issues

4. **Don't migrate all at once**
   - Gradual migration safer
   - Easier to debug

5. **Don't ignore warnings**
   - Prisma warnings matter
   - Database warnings matter

6. **Don't forget verification**
   - Always verify migration
   - Check data integrity

7. **Don't deploy without rollback plan**
   - Document rollback steps
   - Test rollback procedure

8. **Don't lose old data**
   - Keep backups 30 days
   - Archive old backups

---

## MIGRATION CHECKLIST SUMMARY

**Pre-Deployment**:
- [ ] Backup database
- [ ] Test on staging
- [ ] Review migrations
- [ ] Create rollback plan

**Deployment**:
- [ ] Deploy code
- [ ] Run migrations
- [ ] Verify app loads
- [ ] Check critical routes

**Post-Deployment (24 hours)**:
- [ ] Monitor error logs
- [ ] Check error rate (<1%)
- [ ] Test critical flows
- [ ] Monitor performance

**Post-Deployment (24-48 hours)**:
- [ ] Run verification script
- [ ] Check user reports
- [ ] Verify data integrity

**Post-Deployment (1-2 weeks)**:
- [ ] Verify 100% migrated
- [ ] Drop old fields
- [ ] Archive backups
- [ ] Update docs

---

**Last Updated**: October 29, 2025
**Den Migration**: Completed October 2025
**Status**: Zero data loss, 100% migration success

**Key Principle**: Never lose user data. Always have a rollback plan. Test on production data copy.
