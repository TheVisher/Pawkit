import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { prisma } from "@/lib/server/prisma";
import { viewSettingsUpdateSchema } from "@/lib/validators/user";
import { handleApiError } from "@/lib/utils/api-error";
import { unauthorized, success } from "@/lib/utils/api-responses";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    // Fetch all view settings for the user
    const settings = await prisma.userViewSettings.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        view: 'asc',
      },
    });

    return success({ settings });
  } catch (error) {
    return handleApiError(error, { route: '/api/user/view-settings' });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const body = await request.json();

    // Check if server sync is enabled
    const userProfile = await prisma.user.findUnique({
      where: { id: user.id },
      select: { serverSync: true }
    });

    // If server sync is disabled, return success without saving
    // View settings will only be stored in localStorage
    if (!userProfile?.serverSync) {
      return success({ success: true, localOnly: true, message: 'Settings not synced (server sync disabled)' });
    }

    // Validate input
    const validated = viewSettingsUpdateSchema.parse(body);
    const { view, settings } = validated;

    // Upsert view settings
    const viewSettings = await prisma.userViewSettings.upsert({
      where: {
        userId_view: {
          userId: user.id,
          view: view,
        },
      },
      update: {
        layout: settings.layout,
        cardSize: settings.cardSize,
        showTitles: settings.showTitles,
        showUrls: settings.showUrls,
        showTags: settings.showTags,
        cardPadding: settings.cardPadding,
        sortBy: settings.sortBy,
        sortOrder: settings.sortOrder,
        viewSpecific: settings.viewSpecific,
      },
      create: {
        userId: user.id,
        view: view,
        layout: settings.layout,
        cardSize: settings.cardSize,
        showTitles: settings.showTitles,
        showUrls: settings.showUrls,
        showTags: settings.showTags,
        cardPadding: settings.cardPadding,
        sortBy: settings.sortBy,
        sortOrder: settings.sortOrder,
        viewSpecific: settings.viewSpecific,
      },
    });

    return success({ success: true, settings: viewSettings });
  } catch (error) {
    return handleApiError(error, { route: '/api/user/view-settings' });
  }
}

