import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";
import { prisma } from "@/lib/server/prisma";
import { unauthorized, success, rateLimited } from "@/lib/utils/api-responses";
import { rateLimit } from "@/lib/utils/rate-limit";

// GET /api/user/settings - Get user settings
export async function GET() {
  let user;
  try {
    user = await getCurrentUser();

    if (!user) {
      return unauthorized();
    }

    // Rate limit: 100 requests per minute per user
    const limitResult = rateLimit({
      identifier: user.id,
      limit: 100,
      windowMs: 60000,
    });

    if (!limitResult.allowed) {
      return rateLimited();
    }

    // Get user settings from database
    let settings = await prisma.userSettings.findUnique({
      where: { userId: user.id }
    });

    console.log('[API GET /api/user/settings] Settings from DB:', {
      exists: !!settings,
      pinnedNoteIds: settings?.pinnedNoteIds,
      recentHistory: settings?.recentHistory
    });

    // If no settings exist, create default settings
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId: user.id
        }
      });
    }

    // Parse JSON fields with safe fallbacks
    let displaySettings = {};
    let pinnedNoteIds: string[] = [];
    let recentHistory: any[] = [];

    try {
      displaySettings = settings.displaySettings ? JSON.parse(settings.displaySettings) : {};
    } catch (e) {
      displaySettings = {};
    }

    try {
      pinnedNoteIds = settings.pinnedNoteIds ? JSON.parse(settings.pinnedNoteIds) : [];
    } catch (e) {
      pinnedNoteIds = [];
    }

    try {
      // Safe parsing for recentHistory - field might not exist if migration not run
      recentHistory = (settings as any).recentHistory ? JSON.parse((settings as any).recentHistory) : [];
    } catch (e) {
      recentHistory = [];
    }

    console.log('[API GET /api/user/settings] Parsed data:', {
      pinnedNoteIds,
      pinnedNotesCount: pinnedNoteIds.length,
      recentHistoryCount: recentHistory.length
    });

    return success({
      ...settings,
      displaySettings,
      pinnedNoteIds,
      recentHistory
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

    // Rate limit: 30 requests per minute per user (stricter for writes)
    const limitResult = rateLimit({
      identifier: user.id,
      limit: 30,
      windowMs: 60000,
    });

    if (!limitResult.allowed) {
      return rateLimited();
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

    // Validate preview service URL if provided
    if (body.previewServiceUrl !== undefined) {
      if (body.previewServiceUrl !== null && body.previewServiceUrl !== '') {
        try {
          const url = new URL(body.previewServiceUrl);
          // Only allow https in production
          if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
            return NextResponse.json(
              { error: 'Preview service URL must use HTTPS in production' },
              { status: 400 }
            );
          }
          updateData.previewServiceUrl = body.previewServiceUrl;
        } catch (e) {
          return NextResponse.json(
            { error: 'Invalid preview service URL format' },
            { status: 400 }
          );
        }
      } else {
        // Allow clearing the URL
        updateData.previewServiceUrl = body.previewServiceUrl;
      }
    }

    if (body.theme !== undefined) updateData.theme = body.theme;
    if (body.accentColor !== undefined) updateData.accentColor = body.accentColor;
    if (body.notifications !== undefined) updateData.notifications = body.notifications;
    if (body.autoSave !== undefined) updateData.autoSave = body.autoSave;
    if (body.compactMode !== undefined) updateData.compactMode = body.compactMode;
    if (body.showPreviews !== undefined) updateData.showPreviews = body.showPreviews;
    if (body.autoSyncOnReconnect !== undefined) updateData.autoSyncOnReconnect = body.autoSyncOnReconnect;
    if (body.cardSize !== undefined) updateData.cardSize = body.cardSize;

    // Note: showSyncStatusInSidebar, showKeyboardShortcutsInSidebar, defaultView, defaultSort
    // are localStorage-only fields and intentionally not synced to server

    // JSON fields - stringify them
    if (body.displaySettings !== undefined) {
      updateData.displaySettings = JSON.stringify(body.displaySettings);
    }
    if (body.pinnedNoteIds !== undefined) {
      // Validate and limit to max 3 items
      const notes = Array.isArray(body.pinnedNoteIds) ? body.pinnedNoteIds.slice(0, 3) : [];
      updateData.pinnedNoteIds = JSON.stringify(notes);
      console.log('[API PATCH /api/user/settings] Updating pinnedNoteIds:', notes);
    }
    if (body.recentHistory !== undefined) {
      // Validate and limit to max 20 items
      const history = Array.isArray(body.recentHistory) ? body.recentHistory.slice(0, 20) : [];
      updateData.recentHistory = JSON.stringify(history);
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

    // Parse JSON fields for response with safe fallbacks
    let displaySettings = {};
    let pinnedNoteIds: string[] = [];
    let recentHistory: any[] = [];

    try {
      displaySettings = settings.displaySettings ? JSON.parse(settings.displaySettings) : {};
    } catch (e) {
      displaySettings = {};
    }

    try {
      pinnedNoteIds = settings.pinnedNoteIds ? JSON.parse(settings.pinnedNoteIds) : [];
    } catch (e) {
      pinnedNoteIds = [];
    }

    try {
      recentHistory = (settings as any).recentHistory ? JSON.parse((settings as any).recentHistory) : [];
    } catch (e) {
      recentHistory = [];
    }

    return success({
      ...settings,
      displaySettings,
      pinnedNoteIds,
      recentHistory
    });
  } catch (error) {
    return handleApiError(error, { route: '/api/user/settings', userId: user?.id });
  }
}
