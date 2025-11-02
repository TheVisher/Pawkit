// @ts-nocheck
/**
 * Migration script to convert collection IDs to slugs in cards
 * Run with: npx tsx scripts/migrate-collection-ids-to-slugs.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting migration: Converting collection IDs to slugs...');

  // Get all collections to build ID -> slug map
  const collections = await prisma.collection.findMany({
    select: { id: true, slug: true }
  });

  const idToSlugMap = new Map<string, string>();
  collections.forEach((c: any) => {
    idToSlugMap.set(c.id, c.slug);
  });

  console.log(`Found ${collections.length} collections`);

  // Get all cards
  const cards = await prisma.card.findMany({
    select: { id: true, collections: true }
  });

  console.log(`Found ${cards.length} cards to check`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const card of cards) {
    // Parse collections if it's stored as JSON
    const collectionsArray = Array.isArray(card.collections)
      ? card.collections
      : (typeof card.collections === 'string' ? JSON.parse(card.collections) : []);

    if (!collectionsArray || collectionsArray.length === 0) {
      skippedCount++;
      continue;
    }

    // Check if any collection value is an ID (long random string)
    const needsUpdate = collectionsArray.some((c: string) => c.length > 20 && c.startsWith('cm'));

    if (needsUpdate) {
      // Convert IDs to slugs
      const newCollections = collectionsArray.map((c: string) => {
        if (idToSlugMap.has(c)) {
          console.log(`  Converting "${c}" -> "${idToSlugMap.get(c)}"`);
          return idToSlugMap.get(c)!;
        }
        return c; // Keep as-is if already a slug or not found
      });

      // Remove duplicates
      const uniqueCollections = Array.from(new Set(newCollections));

      await prisma.card.update({
        where: { id: card.id },
        data: { collections: JSON.stringify(uniqueCollections) }
      });

      console.log(`Updated card ${card.id}: [${collectionsArray.join(', ')}] -> [${uniqueCollections.join(', ')}]`);
      updatedCount++;
    } else {
      skippedCount++;
    }
  }

  console.log('\nMigration complete!');
  console.log(`Updated: ${updatedCount} cards`);
  console.log(`Skipped: ${skippedCount} cards (already using slugs or no collections)`);
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
