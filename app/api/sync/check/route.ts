import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-user';
import { prisma } from '@/lib/server/prisma';
import { rateLimit, getRateLimitHeaders } from '@/lib/utils/rate-limit';

/**
 * Lightweight sync check endpoint
 * Returns whether there are any server changes since last sync
 * Much faster than full sync (just checks timestamps)
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting: 120 sync checks per minute per user (polling-friendly)
    const rateLimitResult = rateLimit({
      identifier: `sync-check:${user.id}`,
      limit: 120,
      windowMs: 60000, // 1 minute
    });

    if (!rateLimitResult.allowed) {
      const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);
      return NextResponse.json(
        { error: 'Too many requests', code: 'RATE_LIMITED' },
        { status: 429, headers: rateLimitHeaders }
      );
    }

    const { searchParams } = new URL(request.url);
    const lastSync = searchParams.get('lastSync');

    if (!lastSync) {
      // No last sync time provided, assume changes exist
      return NextResponse.json({
        hasChanges: true,
        serverTime: new Date().toISOString()
      });
    }

    // Check if any cards changed since last sync
    const cardsChanged = await prisma.card.count({
      where: {
        userId: user.id,
        updatedAt: {
          gt: new Date(lastSync)
        }
      },
      take: 1
    });

    // Check if any collections changed since last sync
    const collectionsChanged = await prisma.collection.count({
      where: {
        userId: user.id,
        updatedAt: {
          gt: new Date(lastSync)
        }
      },
      take: 1
    });

    const hasChanges = cardsChanged > 0 || collectionsChanged > 0;

    return NextResponse.json({
      hasChanges,
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    // On error, assume changes exist (safe fallback)
    return NextResponse.json({
      hasChanges: true,
      serverTime: new Date().toISOString()
    });
  }
}
