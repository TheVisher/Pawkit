/**
 * Endpoint to refresh expired TikTok image URLs
 * Finds cards with expiring URLs and refetches their metadata
 *
 * Usage: POST /api/cards/refresh-expired-images
 */

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-user';
import { prisma } from '@/lib/server/prisma';
import { fetchAndUpdateCardMetadata } from '@/lib/server/cards';
import { isExpiringImageUrl, isStoredImageUrl } from '@/lib/server/image-storage';
import { handleApiError } from '@/lib/utils/api-error';
import { unauthorized, success } from '@/lib/utils/api-responses';
import type { PrismaCard } from '@/lib/types';

export async function POST() {
  let user;
  try {
    user = await getCurrentUser();
    if (!user?.id) {
      return unauthorized();
    }

    const userId = user.id;

    // Find all cards with expiring URLs that haven't been stored yet
    const cards = await prisma.card.findMany({
      where: {
        userId,
        deleted: false,
        inDen: false,
        image: { not: null }
      }
    });

    const cardsToRefresh = cards.filter((card: PrismaCard) => {
      if (!card.image) return false;
      return isExpiringImageUrl(card.image) && !isStoredImageUrl(card.image);
    });

    console.log(`[RefreshExpiredImages] Found ${cardsToRefresh.length} cards with expiring URLs`);

    // Refresh metadata for each card (this will download and store the images)
    const results = await Promise.allSettled(
      cardsToRefresh.map(async (card: PrismaCard) => {
        if (!card.url) return null;
        console.log(`[RefreshExpiredImages] Refreshing card ${card.id}: ${card.title}`);
        return fetchAndUpdateCardMetadata(card.id, card.url);
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return success({
      message: `Image refresh completed: ${successful} successful, ${failed} failed out of ${cardsToRefresh.length} total`,
      total: cardsToRefresh.length,
      successful,
      failed,
      cards: cardsToRefresh.map((c: PrismaCard) => ({ id: c.id, title: c.title, url: c.url }))
    });

  } catch (error) {
    return handleApiError(error, { route: '/api/cards/refresh-expired-images', userId: user?.id });
  }
}
