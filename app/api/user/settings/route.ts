import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";
import { prisma } from "@/lib/server/prisma";
import { unauthorized, success } from "@/lib/utils/api-responses";

// GET /api/user/settings - Get user settings
export async function GET() {
  let user;
  try {
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    // Get user settings from database
    let settings = await prisma.userSettings.findUnique({
      where: { userId: user.id }
    });

    // If no settings exist, create default settings
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId: user.id
        }
      });
    }

    // Parse JSON fields
    const displaySettings = JSON.parse(settings.displaySettings);
    const pinnedNoteIds = JSON.parse(settings.pinnedNoteIds);

    return success({
      ...settings,
      displaySettings,
      pinnedNoteIds
    });
  } catch (error) {
    return handleApiError(error, { route: '/api/user/settings', userId: user?.id });
  }
}

// PATCH /api/user/settings - Update user settings
export async function PATCH(request: Request) {
  let user;
  let body;
  try {
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    body = await request.json();

    // Check if server sync is enabled
    const userProfile = await prisma.user.findUnique({
      where: { id: user.id },
      select: { serverSync: true }
    });

    // If server sync is disabled, return success without saving
    // Settings will only be stored in localStorage
    if (!userProfile?.serverSync) {
      return success({ message: 'Settings not synced (server sync disabled)' });
    }

    // Prepare data for update
    const updateData: any = {};

    // Simple boolean/string/number fields
    if (body.autoFetchMetadata !== undefined) updateData.autoFetchMetadata = body.autoFetchMetadata;
    if (body.showThumbnails !== undefined) updateData.showThumbnails = body.showThumbnails;
    if (body.previewServiceUrl !== undefined) updateData.previewServiceUrl = body.previewServiceUrl;
    if (body.theme !== undefined) updateData.theme = body.theme;
    if (body.accentColor !== undefined) updateData.accentColor = body.accentColor;
    if (body.notifications !== undefined) updateData.notifications = body.notifications;
    if (body.autoSave !== undefined) updateData.autoSave = body.autoSave;
    if (body.compactMode !== undefined) updateData.compactMode = body.compactMode;
    if (body.showPreviews !== undefined) updateData.showPreviews = body.showPreviews;
    if (body.autoSyncOnReconnect !== undefined) updateData.autoSyncOnReconnect = body.autoSyncOnReconnect;
    if (body.cardSize !== undefined) updateData.cardSize = body.cardSize;

    // JSON fields - stringify them
    if (body.displaySettings !== undefined) {
      updateData.displaySettings = JSON.stringify(body.displaySettings);
    }
    if (body.pinnedNoteIds !== undefined) {
      updateData.pinnedNoteIds = JSON.stringify(body.pinnedNoteIds);
    }

    // Upsert settings (create if doesn't exist, update if it does)
    const settings = await prisma.userSettings.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        ...updateData
      },
      update: updateData
    });

    // Parse JSON fields for response
    const displaySettings = JSON.parse(settings.displaySettings);
    const pinnedNoteIds = JSON.parse(settings.pinnedNoteIds);

    return success({
      ...settings,
      displaySettings,
      pinnedNoteIds
    });
  } catch (error) {
    return handleApiError(error, { route: '/api/user/settings', userId: user?.id, body });
  }
}
