// @ts-nocheck
/**
 * Migration script to convert The Den to Private Pawkits
 * This migrates from the old "Den" architecture to the new "Private Pawkits" system
 *
 * What it does:
 * 1. Converts all Den Pawkits (inDen=true collections) to regular pawkits with isPrivate=true
 * 2. Creates a default "Private Items" pawkit for orphaned Den cards (cards with inDen=true but no collections)
 * 3. Ensures all cards in private pawkits maintain their inDen=true flag
 *
 * Run with: npx tsx scripts/migrate-den-to-private-pawkits.ts
 */

import { PrismaClient } from '@prisma/client';
import slugify from 'slugify';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Starting migration: Converting The Den to Private Pawkits...\n');

  // STEP 1: Convert Den Pawkits to Private Pawkits
  console.log('📁 Step 1: Converting Den Pawkits to Private Pawkits...');

  const denCollections = await prisma.collection.findMany({
    where: {
      inDen: true,
      deleted: false
    }
  });

  console.log(`   Found ${denCollections.length} Den Pawkits`);

  for (const collection of denCollections) {
    await prisma.collection.update({
      where: { id: collection.id },
      data: {
        isPrivate: true,
        inDen: false  // Remove from Den, now it's a regular private pawkit
      }
    });
    console.log(`   ✓ Converted "${collection.name}" to private pawkit`);
  }

  console.log(`   ✅ Converted ${denCollections.length} Den Pawkits to Private Pawkits\n`);

  // STEP 2: Handle orphaned Den cards
  console.log('🔍 Step 2: Finding orphaned Den cards...');

  const orphanedCards = await prisma.card.findMany({
    where: {
      inDen: true,
      deleted: false,
      OR: [
        { collections: null },
        { collections: '[]' },
        { collections: '' }
      ]
    }
  });

  console.log(`   Found ${orphanedCards.length} orphaned Den cards`);

  if (orphanedCards.length > 0) {
    // Group orphaned cards by userId
    const cardsByUser = new Map<string, typeof orphanedCards>();
    orphanedCards.forEach(card => {
      if (!cardsByUser.has(card.userId)) {
        cardsByUser.set(card.userId, []);
      }
      cardsByUser.get(card.userId)!.push(card);
    });

    console.log(`   Found cards from ${cardsByUser.size} users\n`);

    // Create a "Private Items" pawkit for each user with orphaned cards
    for (const [userId, userCards] of cardsByUser.entries()) {
      console.log(`   📦 Creating "Private Items" pawkit for user ${userId.substring(0, 8)}...`);

      // Check if user already has a "Private Items" pawkit
      let privateItemsPawkit = await prisma.collection.findFirst({
        where: {
          userId,
          name: 'Private Items',
          deleted: false
        }
      });

      if (!privateItemsPawkit) {
        // Create unique slug
        const baseSlug = 'private-items';
        let slug = baseSlug;
        let counter = 1;

        while (await prisma.collection.findUnique({ where: { slug } })) {
          slug = `${baseSlug}-${counter}`;
          counter++;
        }

        privateItemsPawkit = await prisma.collection.create({
          data: {
            name: 'Private Items',
            slug,
            userId,
            isPrivate: true,
            inDen: false
          }
        });
        console.log(`      ✓ Created pawkit with slug "${slug}"`);
      } else {
        // Update existing one to be private
        await prisma.collection.update({
          where: { id: privateItemsPawkit.id },
          data: { isPrivate: true, inDen: false }
        });
        console.log(`      ✓ Using existing pawkit "${privateItemsPawkit.slug}"`);
      }

      // Add all orphaned cards to this pawkit
      for (const card of userCards) {
        await prisma.card.update({
          where: { id: card.id },
          data: {
            collections: JSON.stringify([privateItemsPawkit.slug])
          }
        });
      }
      console.log(`      ✓ Added ${userCards.length} cards to "${privateItemsPawkit.name}"`);
    }

    console.log(`   ✅ Migrated ${orphanedCards.length} orphaned cards\n`);
  } else {
    console.log(`   ✅ No orphaned cards found\n`);
  }

  // STEP 3: Verify all cards in private pawkits have inDen=true
  console.log('🔍 Step 3: Verifying cards in private pawkits...');

  const allPrivatePawkits = await prisma.collection.findMany({
    where: {
      isPrivate: true,
      deleted: false
    }
  });

  console.log(`   Found ${allPrivatePawkits.length} private pawkits`);

  let cardsUpdated = 0;
  for (const pawkit of allPrivatePawkits) {
    // Find all cards that include this pawkit's slug
    const cardsInPawkit = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "Card"
      WHERE deleted = false
        AND collections::jsonb ? ${pawkit.slug}
        AND "inDen" = false
    `;

    if (cardsInPawkit.length > 0) {
      // Update these cards to have inDen=true
      await prisma.card.updateMany({
        where: {
          id: { in: cardsInPawkit.map(c => c.id) }
        },
        data: {
          inDen: true
        }
      });
      cardsUpdated += cardsInPawkit.length;
      console.log(`   ✓ Updated ${cardsInPawkit.length} cards in "${pawkit.name}"`);
    }
  }

  console.log(`   ✅ Updated ${cardsUpdated} cards to inDen=true\n`);

  // Summary
  console.log('═══════════════════════════════════════════════════');
  console.log('✅ Migration Complete!');
  console.log('═══════════════════════════════════════════════════');
  console.log(`📁 Den Pawkits converted: ${denCollections.length}`);
  console.log(`📦 Orphaned cards migrated: ${orphanedCards.length}`);
  console.log(`🔒 Cards marked as private: ${cardsUpdated}`);
  console.log('═══════════════════════════════════════════════════\n');

  console.log('Next steps:');
  console.log('1. Test the migration on your local database');
  console.log('2. Update your application code to use isPrivate instead of inDen for collections');
  console.log('3. Deploy the changes to production');
  console.log('4. Run this migration script on production database');
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
