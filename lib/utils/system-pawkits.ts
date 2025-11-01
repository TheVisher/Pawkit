/**
 * Utilities for managing system Pawkits (To Categorize, etc.)
 */

import { prisma } from "@/lib/server/prisma";

const SYSTEM_PAWKITS = {
  TO_CATEGORIZE: {
    slug: "to-categorize",
    name: "To Categorize",
    description: "Cards from Rediscover waiting to be organized",
  },
};

/**
 * Ensures the "To Categorize" system Pawkit exists for the user.
 * Creates it if it doesn't exist.
 *
 * @param userId - The user ID
 * @returns The "To Categorize" collection
 */
export async function ensureToCategorizePawkit(userId: string) {
  const { slug, name } = SYSTEM_PAWKITS.TO_CATEGORIZE;

  // Check if it exists
  let collection = await prisma.collection.findFirst({
    where: {
      userId,
      slug,
    },
  });

  // Create it if it doesn't exist
  if (!collection) {
    collection = await prisma.collection.create({
      data: {
        userId,
        slug,
        name,
        isSystem: true,
        pinned: true, // Pin it so it appears at the top
      },
    });
  }

  return collection;
}

/**
 * Gets the slug of the "To Categorize" system Pawkit
 */
export function getToCategorizeSlug() {
  return SYSTEM_PAWKITS.TO_CATEGORIZE.slug;
}

/**
 * Tag applied to cards in the "To Categorize" Pawkit
 */
export const NEEDS_CATEGORIZING_TAG = "needs-categorizing";
