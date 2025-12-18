import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";
import { prisma } from "@/lib/server/prisma";
import { unauthorized, success, rateLimited } from "@/lib/utils/api-responses";
import { rateLimit } from "@/lib/utils/rate-limit";
import { logger } from "@/lib/utils/logger";

// Recent History validation
const RecentHistoryItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(['card', 'note']),
  url: z.string().optional(),
  image: z.string().optional(),
  timestamp: z.number(),
});

const RecentHistorySchema = z.array(RecentHistoryItemSchema).max(20);

// Display Settings validation - partial with defaults for backwards compatibility
const DisplaySettingsValueSchema = z.object({
  showCardTitles: z.boolean().default(true),
  showCardUrls: z.boolean().default(true),
  showCardTags: z.boolean().default(true),
  cardPadding: z.number().min(0).max(4).default(2),
}).partial().passthrough();

const AreaSchema = z.enum(['library', 'home', 'den', 'pawkit', 'notes']);
const DisplaySettingsSchema = z.record(AreaSchema, DisplaySettingsValueSchema);

// Pinned Note IDs validation
const PinnedNoteIdsSchema = z.array(z.string()).max(10);

// Recent history item type for user settings (kept for type inference)
type RecentHistoryItem = z.infer<typeof RecentHistoryItemSchema>;

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

    // Parse and validate displaySettings
    try {
      const displaySettingsParsed = settings.displaySettings ? JSON.parse(settings.displaySettings) : {};
      const displaySettingsResult = DisplaySettingsSchema.safeParse(displaySettingsParsed);
      displaySettings = displaySettingsResult.success ? displaySettingsResult.data : {};
      if (!displaySettingsResult.success) {
        console.error('[API GET /api/user/settings] Invalid display settings:', displaySettingsResult.error);
      }
    } catch {
      displaySettings = {};
    }

    // Parse and validate pinnedNoteIds
    try {
      const pinnedNoteIdsParsed = settings.pinnedNoteIds ? JSON.parse(settings.pinnedNoteIds) : [];
      const pinnedNoteIdsResult = PinnedNoteIdsSchema.safeParse(pinnedNoteIdsParsed);
      pinnedNoteIds = pinnedNoteIdsResult.success ? pinnedNoteIdsResult.data : [];
      if (!pinnedNoteIdsResult.success) {
        console.error('[API GET /api/user/settings] Invalid pinned note IDs:', pinnedNoteIdsResult.error);
      }
    } catch {
      pinnedNoteIds = [];
    }

    // Parse and validate recentHistory
    try {
      const settingsWithHistory = settings as SettingsWithHistory;
      const recentHistoryParsed = settingsWithHistory.recentHistory ? JSON.parse(settingsWithHistory.recentHistory) : [];
      const recentHistoryResult = RecentHistorySchema.safeParse(recentHistoryParsed);
      recentHistory = recentHistoryResult.success ? recentHistoryResult.data : [];
      if (!recentHistoryResult.success) {
        console.error('[API GET /api/user/settings] Invalid recent history:', recentHistoryResult.error);
      }
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
    if (body.uiStyle !== undefined) updateData.uiStyle = body.uiStyle;
    if (body.surfaceTint !== undefined) updateData.surfaceTint = body.surfaceTint;
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

    // Sidebar visibility settings
    if (body.showSyncStatusInSidebar !== undefined) updateData.showSyncStatusInSidebar = body.showSyncStatusInSidebar;
    if (body.showKeyboardShortcutsInSidebar !== undefined) updateData.showKeyboardShortcutsInSidebar = body.showKeyboardShortcutsInSidebar;

    // Default view preferences
    if (body.defaultView !== undefined) updateData.defaultView = body.defaultView;
    if (body.defaultSort !== undefined) updateData.defaultSort = body.defaultSort;

    // JSON fields - validate with Zod before stringify
    if (body.displaySettings !== undefined) {
      const result = DisplaySettingsSchema.safeParse(body.displaySettings);
      if (!result.success) {
        console.error('[API PATCH] Invalid displaySettings:', result.error);
        return NextResponse.json({ error: 'Invalid display settings format' }, { status: 400 });
      }
      updateData.displaySettings = JSON.stringify(result.data);
    }

    if (body.pinnedNoteIds !== undefined) {
      const result = PinnedNoteIdsSchema.safeParse(body.pinnedNoteIds);
      if (!result.success) {
        console.error('[API PATCH] Invalid pinnedNoteIds:', result.error);
        return NextResponse.json({ error: 'Invalid pinned note IDs format' }, { status: 400 });
      }
      updateData.pinnedNoteIds = JSON.stringify(result.data);
      logger.debug('[API PATCH /api/user/settings] Updating pinnedNoteIds:', result.data);
    }

    if (body.recentHistory !== undefined) {
      const result = RecentHistorySchema.safeParse(body.recentHistory);
      if (!result.success) {
        console.error('[API PATCH] Invalid recentHistory:', result.error);
        return NextResponse.json({ error: 'Invalid recent history format' }, { status: 400 });
      }
      updateData.recentHistory = JSON.stringify(result.data);
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

    // Parse JSON fields for response with Zod validation
    let displaySettings: Record<string, unknown> = {};
    let pinnedNoteIds: string[] = [];
    let recentHistory: RecentHistoryItem[] = [];

    // Parse and validate displaySettings
    try {
      const displaySettingsParsed = settings.displaySettings ? JSON.parse(settings.displaySettings) : {};
      const displaySettingsResult = DisplaySettingsSchema.safeParse(displaySettingsParsed);
      displaySettings = displaySettingsResult.success ? displaySettingsResult.data : {};
      if (!displaySettingsResult.success) {
        console.error('[API PATCH /api/user/settings] Invalid display settings:', displaySettingsResult.error);
      }
    } catch {
      displaySettings = {};
    }

    // Parse and validate pinnedNoteIds
    try {
      const pinnedNoteIdsParsed = settings.pinnedNoteIds ? JSON.parse(settings.pinnedNoteIds) : [];
      const pinnedNoteIdsResult = PinnedNoteIdsSchema.safeParse(pinnedNoteIdsParsed);
      pinnedNoteIds = pinnedNoteIdsResult.success ? pinnedNoteIdsResult.data : [];
      if (!pinnedNoteIdsResult.success) {
        console.error('[API PATCH /api/user/settings] Invalid pinned note IDs:', pinnedNoteIdsResult.error);
      }
    } catch {
      pinnedNoteIds = [];
    }

    // Parse and validate recentHistory
    try {
      const settingsWithHistory = settings as SettingsWithHistory;
      const recentHistoryParsed = settingsWithHistory.recentHistory ? JSON.parse(settingsWithHistory.recentHistory) : [];
      const recentHistoryResult = RecentHistorySchema.safeParse(recentHistoryParsed);
      recentHistory = recentHistoryResult.success ? recentHistoryResult.data : [];
      if (!recentHistoryResult.success) {
        console.error('[API PATCH /api/user/settings] Invalid recent history:', recentHistoryResult.error);
      }
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
