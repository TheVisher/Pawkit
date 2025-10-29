import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-user';
import { prisma } from '@/lib/server/prisma';
import { sessionHeartbeatSchema } from '@/lib/validators/session';
import { handleApiError } from '@/lib/utils/api-error';
import { unauthorized, success } from '@/lib/utils/api-responses';

/**
 * Session Heartbeat API
 *
 * Called periodically (every 30s) to track active device sessions.
 * Enables multi-device detection and active device preference.
 */
export async function POST(request: NextRequest) {
  let user;
  try {
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const body = await request.json();

    // Validate input
    const validated = sessionHeartbeatSchema.parse(body);
    const { deviceId, deviceName, browser, os } = validated;

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
        browser: browser || null,
        os: os || null,
      },
      create: {
        userId: user.id,
        deviceId,
        deviceName,
        browser: browser || null,
        os: os || null,
        lastActive: new Date(),
      },
    });

    return success({ success: true, session });
  } catch (error) {
    return handleApiError(error, { route: '/api/sessions/heartbeat', userId: user?.id });
  }
}

/**
 * Get all active sessions for the current user
 * Active = seen within last 2 minutes
 */
export async function GET(request: NextRequest) {
  let user;
  try {
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
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

    return success({ sessions });
  } catch (error) {
    return handleApiError(error, { route: '/api/sessions/heartbeat', userId: user?.id });
  }
}
