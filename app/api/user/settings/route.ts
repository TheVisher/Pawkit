import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";
import { prisma } from "@/lib/server/prisma";
import { unauthorized, success, rateLimited } from "@/lib/utils/api-responses";
import { rateLimit } from "@/lib/utils/rate-limit";
import { logger } from "@/lib/utils/logger";

// Recent history item type for user settings
interface RecentHistoryItem {
  id: string;
  title: string;
  type: "card" | "note";
  url?: string;
  image?: string;
  timestamp: number;
}

// Settings with optional recentHistory field (may not exist in older records)
interface SettingsWithHistory {
  recentHistory?: string | null;
  [key: string]: unknown;
}

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

    logger.debug('[API GET /api/user/settings] Settings from DB:', {
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
    let displaySettings: Record<string, unknown> = {};
    let pinnedNoteIds: string[] = [];
    let recentHistory: RecentHistoryItem[] = [];

    try {
      displaySettings = settings.displaySettings ? JSON.parse(settings.displaySettings) : {};
    } catch {
      displaySettings = {};
    }

    try {
      pinnedNoteIds = settings.pinnedNoteIds ? JSON.parse(settings.pinnedNoteIds) : [];
    } catch {
      pinnedNoteIds = [];
    }

    try {
      // Safe parsing for recentHistory - field might not exist if migration not run
      const settingsWithHistory = settings as SettingsWithHistory;
      recentHistory = settingsWithHistory.recentHistory ? JSON.parse(settingsWithHistory.recentHistory) : [];
    } catch {
      recentHistory = [];
    }

    logger.debug('[API GET /api/user/settings] Parsed data:', {
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

    // If server sync is disabled and this is NOT just an onboarding-related update,
    // return success without saving (settings will only be stored in localStorage)
    // Exception: onboarding flags must always be saved to prevent re-seeding and track banner/tour state
    const onboardingKeys = ['onboardingSeeded', 'onboardingBannerDismissed', 'onboardingTourCompleted'];
    const bodyKeys = Object.keys(body);
    const isOnlyOnboardingUpdate = bodyKeys.length > 0 && bodyKeys.every(key => onboardingKeys.includes(key));
    if (!userProfile?.serverSync && !isOnlyOnboardingUpdate) {
      return success({ message: 'Settings not synced (server sync disabled)' });
    }

    // Prepare data for update
    const updateData: Record<string, unknown> = {};

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

    // Onboarding flags
    if (body.onboardingSeeded !== undefined) updateData.onboardingSeeded = body.onboardingSeeded;
    if (body.onboardingBannerDismissed !== undefined) updateData.onboardingBannerDismissed = body.onboardingBannerDismissed;
    if (body.onboardingTourCompleted !== undefined) updateData.onboardingTourCompleted = body.onboardingTourCompleted;

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
      logger.debug('[API PATCH /api/user/settings] Updating pinnedNoteIds:', notes);
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
    let displaySettings: Record<string, unknown> = {};
    let pinnedNoteIds: string[] = [];
    let recentHistory: RecentHistoryItem[] = [];

    try {
      displaySettings = settings.displaySettings ? JSON.parse(settings.displaySettings) : {};
    } catch {
      displaySettings = {};
    }

    try {
      pinnedNoteIds = settings.pinnedNoteIds ? JSON.parse(settings.pinnedNoteIds) : [];
    } catch {
      pinnedNoteIds = [];
    }

    try {
      const settingsWithHistory = settings as SettingsWithHistory;
      recentHistory = settingsWithHistory.recentHistory ? JSON.parse(settingsWithHistory.recentHistory) : [];
    } catch {
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
