import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-user';
import { prisma } from '@/lib/server/prisma';

/**
 * Session Heartbeat API
 *
 * Called periodically (every 30s) to track active device sessions.
 * Enables multi-device detection and active device preference.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { deviceId, deviceName, browser, os } = body;

    if (!deviceId || !deviceName) {
      return NextResponse.json(
        { error: 'Missing deviceId or deviceName' },
        { status: 400 }
      );
    }

    // Upsert device session (create or update lastActive)
    const session = await prisma.deviceSession.upsert({
      where: {
        userId_deviceId: {
          userId: user.id,
          deviceId: deviceId,
        },
      },
      update: {
        lastActive: new Date(),
        deviceName,
        browser,
        os,
      },
      create: {
        userId: user.id,
        deviceId,
        deviceName,
        browser,
        os,
        lastActive: new Date(),
      },
    });

    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error('[Heartbeat] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get all active sessions for the current user
 * Active = seen within last 2 minutes
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

    const sessions = await prisma.deviceSession.findMany({
      where: {
        userId: user.id,
        lastActive: {
          gte: twoMinutesAgo,
        },
      },
      orderBy: {
        lastActive: 'desc',
      },
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('[Heartbeat] Error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
