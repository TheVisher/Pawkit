/**
 * Test script to verify the Den to Collection migration
 *
 * This script:
 * 1. Checks how many users have cards with inDen=true
 * 2. Shows sample cards that will be affected
 * 3. Verifies the migration is safe to run
 *
 * Run with: npx tsx scripts/test-den-migration.ts
 */

import { prisma } from '../lib/server/prisma';

async function testMigration() {
  console.log('🔍 Testing Den to Collection Migration\n');
  console.log('=' .repeat(60));

  // Step 1: Find users with Den cards
  console.log('\n📊 Step 1: Finding users with Den cards...\n');

  const usersWithDenCards = await prisma.user.findMany({
    where: {
      cards: {
        some: {
          inDen: true,
          deleted: false,
        },
      },
    },
    select: {
      id: true,
      email: true,
      _count: {
        select: {
          cards: {
            where: {
              inDen: true,
              deleted: false,
            },
          },
        },
      },
    },
  });

  console.log(`Found ${usersWithDenCards.length} user(s) with Den cards:`);
  usersWithDenCards.forEach(user => {
    console.log(`  - ${user.email}: ${user._count.cards} Den card(s)`);
  });

  // Step 2: Check for existing "the-den" collections
  console.log('\n📦 Step 2: Checking for existing "the-den" collections...\n');

  for (const user of usersWithDenCards) {
    const existingDenCollection = await prisma.collection.findFirst({
      where: {
        userId: user.id,
        slug: 'the-den',
      },
    });

    if (existingDenCollection) {
      console.log(`  ✅ User ${user.email} already has "the-den" collection (${existingDenCollection.id})`);
    } else {
      console.log(`  ➕ User ${user.email} needs "the-den" collection created`);
    }
  }

  // Step 3: Show sample cards that will be updated
  console.log('\n📝 Step 3: Sample cards that will be updated...\n');

  const sampleDenCards = await prisma.card.findMany({
    where: {
      inDen: true,
      deleted: false,
    },
    take: 5,
    select: {
      id: true,
      title: true,
      url: true,
      collections: true,
      inDen: true,
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  if (sampleDenCards.length === 0) {
    console.log('  ℹ️  No cards with inDen=true found. Migration not needed.');
  } else {
    console.log(`  Showing ${sampleDenCards.length} sample card(s):`);
    sampleDenCards.forEach((card, index) => {
      console.log(`\n  Card ${index + 1}:`);
      console.log(`    ID: ${card.id}`);
      console.log(`    User: ${card.user.email}`);
      console.log(`    Title: ${card.title || '(no title)'}`);
      console.log(`    URL: ${card.url}`);
      console.log(`    Current collections: ${card.collections || '(none)'}`);
      console.log(`    inDen: ${card.inDen}`);

      // Parse collections to show what it will become
      try {
        const currentCollections = card.collections
          ? JSON.parse(card.collections)
          : [];

        const hasTheDen = currentCollections.includes('the-den');

        if (hasTheDen) {
          console.log(`    ✅ Already has 'the-den' in collections`);
        } else {
          const newCollections = [...currentCollections, 'the-den'];
          console.log(`    ➡️  Will become: ${JSON.stringify(newCollections)}`);
        }
      } catch (error) {
        console.log(`    ⚠️  Invalid JSON in collections: ${card.collections}`);
        console.log(`    ➡️  Will become: ["the-den"]`);
      }
    });
  }

  // Step 4: Count total affected cards
  console.log('\n📈 Step 4: Total impact summary...\n');

  const totalDenCards = await prisma.card.count({
    where: {
      inDen: true,
      deleted: false,
    },
  });

  console.log(`  Total cards that will be updated: ${totalDenCards}`);
  console.log(`  Collections that will be created: ${usersWithDenCards.filter(async (user) => {
    const existing = await prisma.collection.findFirst({
      where: { userId: user.id, slug: 'the-den' },
    });
    return !existing;
  }).length}`);

  // Step 5: Safety checks
  console.log('\n🔒 Step 5: Safety checks...\n');

  let allSafe = true;

  // Check for cards with invalid JSON in collections
  const cardsWithInvalidJson = await prisma.card.findMany({
    where: {
      inDen: true,
      deleted: false,
      collections: {
        not: null,
      },
    },
    select: {
      id: true,
      collections: true,
    },
  });

  let invalidJsonCount = 0;
  for (const card of cardsWithInvalidJson) {
    try {
      if (card.collections) {
        JSON.parse(card.collections);
      }
    } catch (error) {
      invalidJsonCount++;
      console.log(`  ⚠️  Card ${card.id} has invalid JSON: ${card.collections}`);
      allSafe = false;
    }
  }

  if (invalidJsonCount === 0) {
    console.log('  ✅ All cards have valid JSON in collections field');
  } else {
    console.log(`  ⚠️  Found ${invalidJsonCount} card(s) with invalid JSON`);
    console.log(`     These will be reset to ["the-den"]`);
  }

  // Check for slug conflicts
  const slugConflicts = await prisma.collection.groupBy({
    by: ['userId', 'slug'],
    where: {
      slug: 'the-den',
    },
    _count: true,
    having: {
      slug: {
        _count: {
          gt: 1,
        },
      },
    },
  });

  if (slugConflicts.length > 0) {
    console.log(`  ⚠️  Found ${slugConflicts.length} user(s) with duplicate 'the-den' slugs`);
    allSafe = false;
  } else {
    console.log('  ✅ No slug conflicts detected');
  }

  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('\n📋 Migration Summary:\n');
  console.log(`  Users affected: ${usersWithDenCards.length}`);
  console.log(`  Cards to update: ${totalDenCards}`);
  console.log(`  Safety status: ${allSafe ? '✅ SAFE TO RUN' : '⚠️  NEEDS ATTENTION'}`);

  if (allSafe && totalDenCards > 0) {
    console.log('\n✅ Migration is ready to run!');
    console.log('\n   Run with: npm run prisma:migrate:deploy');
    console.log('   Or apply manually: psql < prisma/migrations/20251028000000_migrate_den_to_collection/migration.sql\n');
  } else if (totalDenCards === 0) {
    console.log('\n✅ No migration needed - no cards with inDen=true found.');
  } else {
    console.log('\n⚠️  Please review and fix issues before running migration.');
  }

  console.log('');
}

testMigration()
  .catch((error) => {
    console.error('❌ Error running test:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
