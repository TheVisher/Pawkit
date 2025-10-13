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

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    // Find all cards with expiring URLs that haven't been stored yet
    const cards = await prisma.card.findMany({
      where: {
        userId,
        deleted: false,
        image: { not: null }
      }
    });

    const cardsToRefresh = cards.filter(card => {
      if (!card.image) return false;
      return isExpiringImageUrl(card.image) && !isStoredImageUrl(card.image);
    });

    console.log(`[RefreshExpiredImages] Found ${cardsToRefresh.length} cards with expiring URLs`);

    // Refresh metadata for each card (this will download and store the images)
    const results = await Promise.allSettled(
      cardsToRefresh.map(async (card) => {
        if (!card.url) return null;
        console.log(`[RefreshExpiredImages] Refreshing card ${card.id}: ${card.title}`);
        return fetchAndUpdateCardMetadata(card.id, card.url);
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return NextResponse.json({
      message: 'Image refresh completed',
      total: cardsToRefresh.length,
      successful,
      failed,
      cards: cardsToRefresh.map(c => ({ id: c.id, title: c.title, url: c.url }))
    });

  } catch (error) {
    console.error('[RefreshExpiredImages] Error:', error);
    return NextResponse.json({ error: 'Failed to refresh images' }, { status: 500 });
  }
}
