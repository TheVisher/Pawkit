/**
 * Card API Routes - Single Card Operations
 *
 * GET    /api/cards/[id] - Get a single card
 * PATCH  /api/cards/[id] - Update a card
 * DELETE /api/cards/[id] - Soft delete a card
 */

import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/server';
import { prisma } from '@/lib/db/prisma';
import { updateCardSchema } from '@/lib/validations/card';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('CardAPI');

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Helper to verify card ownership
 * Returns the card if found and owned, null otherwise
 */
async function getOwnedCard(cardId: string, userId: string) {
  const card = await prisma.card.findFirst({
    where: {
      id: cardId,
      workspace: {
        userId: userId,
      },
    },
    include: {
      workspace: {
        select: { userId: true },
      },
    },
  });

  return card;
}

/**
 * GET /api/cards/[id]
 *
 * Fetch a single card by ID.
 * Returns 404 if not found or not owned by user.
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    // 1. Authenticate (cached per request)
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Get card ID from params
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: 'Card ID is required' },
        { status: 400 }
      );
    }

    // 3. Find card and verify ownership
    const card = await getOwnedCard(id, user.id);

    if (!card) {
      // Return 404 to not leak existence
      return NextResponse.json(
        { error: 'Card not found' },
        { status: 404 }
      );
    }

    // 4. Remove internal fields and return
    const { workspace, ...cardData } = card;
    return NextResponse.json({ card: cardData });
  } catch (error) {
    log.error('GET /api/cards/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/cards/[id]
 *
 * Update an existing card.
 * Returns 404 if not found or not owned by user.
 *
 * Optimized: Combines ownership check with update in a single query.
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    // 1. Authenticate (cached per request)
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Get card ID from params
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: 'Card ID is required' },
        { status: 400 }
      );
    }

    // 3. Parse and validate request body FIRST (no DB access needed)
    const body = await request.json();
    const validationResult = updateCardSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const updates = validationResult.data;

    // 4. Build update data
    const updateData: Record<string, unknown> = {};

    // Only include fields that are explicitly provided
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.url !== undefined) updateData.url = updates.url;
    if ('title' in updates) updateData.title = updates.title;
    if ('description' in updates) updateData.description = updates.description;
    if ('content' in updates) updateData.content = updates.content;
    if ('notes' in updates) updateData.notes = updates.notes;
    if ('domain' in updates) updateData.domain = updates.domain;
    if ('image' in updates) updateData.image = updates.image;
    if ('favicon' in updates) updateData.favicon = updates.favicon;
    if ('metadata' in updates) updateData.metadata = updates.metadata ?? undefined;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    // collections field removed - Pawkit membership now uses tags
    if (updates.pinned !== undefined) updateData.pinned = updates.pinned;

    // Scheduling
    if ('scheduledDate' in updates) {
      updateData.scheduledDate = updates.scheduledDate
        ? new Date(updates.scheduledDate)
        : null;
    }
    if ('scheduledStartTime' in updates) updateData.scheduledStartTime = updates.scheduledStartTime;
    if ('scheduledEndTime' in updates) updateData.scheduledEndTime = updates.scheduledEndTime;

    // Article/Reader mode
    if ('articleContent' in updates) updateData.articleContent = updates.articleContent;
    if ('summary' in updates) updateData.summary = updates.summary;
    if ('summaryType' in updates) updateData.summaryType = updates.summaryType;

    // YouTube transcripts
    if ('transcriptSegments' in updates) updateData.transcriptSegments = updates.transcriptSegments;

    // AI fields
    if ('structuredData' in updates) updateData.structuredData = updates.structuredData ?? undefined;
    if ('source' in updates) updateData.source = updates.source ?? undefined;

    // File support
    if (updates.isFileCard !== undefined) updateData.isFileCard = updates.isFileCard;
    if ('fileId' in updates) updateData.fileId = updates.fileId;

    // Cloud sync
    if ('cloudId' in updates) updateData.cloudId = updates.cloudId;
    if ('cloudProvider' in updates) updateData.cloudProvider = updates.cloudProvider;
    if ('cloudSyncedAt' in updates) {
      updateData.cloudSyncedAt = updates.cloudSyncedAt
        ? new Date(updates.cloudSyncedAt)
        : null;
    }

    // Smart Detection
    if (updates.convertedToTodo !== undefined) updateData.convertedToTodo = updates.convertedToTodo;
    if (updates.dismissedTodoSuggestion !== undefined) updateData.dismissedTodoSuggestion = updates.dismissedTodoSuggestion;

    // Soft delete
    if (updates.deleted !== undefined) {
      updateData.deleted = updates.deleted;
      if (updates.deleted) {
        updateData.deletedAt = new Date();
      }
    }
    if ('deletedAt' in updates) {
      updateData.deletedAt = updates.deletedAt
        ? new Date(updates.deletedAt)
        : null;
    }

    // Conflict tracking
    if ('conflictWithId' in updates) updateData.conflictWithId = updates.conflictWithId;

    // 5. Handle version conflict check if expectedVersion provided
    // For version conflicts, we need to fetch the card first (required for conflict response)
    if (updates.expectedVersion !== undefined) {
      const existingCard = await getOwnedCard(id, user.id);

      if (!existingCard) {
        return NextResponse.json(
          { error: 'Card not found' },
          { status: 404 }
        );
      }

      if (existingCard.version > updates.expectedVersion) {
        return NextResponse.json(
          {
            error: 'Version conflict',
            code: 'VERSION_CONFLICT',
            serverCard: existingCard,
            serverVersion: existingCard.version,
            expectedVersion: updates.expectedVersion,
          },
          { status: 409 }
        );
      }

      // Ownership verified, version OK - proceed with update
      const card = await prisma.card.update({
        where: { id },
        data: {
          ...updateData,
          version: { increment: 1 },
        },
      });

      return NextResponse.json({ card });
    }

    // 6. No version check needed - combine ownership check + update in one query
    // Use updateMany with ownership filter, then fetch the result
    const result = await prisma.card.updateMany({
      where: {
        id,
        workspace: {
          userId: user.id,
        },
      },
      data: {
        ...updateData,
        version: { increment: 1 },
      },
    });

    // If no rows updated, card doesn't exist or isn't owned by user
    if (result.count === 0) {
      return NextResponse.json(
        { error: 'Card not found' },
        { status: 404 }
      );
    }

    // Fetch the updated card to return
    const card = await prisma.card.findUnique({
      where: { id },
    });

    return NextResponse.json({ card });
  } catch (error) {
    log.error('PATCH /api/cards/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cards/[id]
 *
 * Delete a card. Supports two modes:
 * - Soft delete (default): Sets deleted: true, deletedAt: now (triggers UPDATE event)
 * - Permanent delete (?permanent=true): Actually removes the row (triggers DELETE event)
 *
 * Returns 404 if not found or not owned by user.
 */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    // 1. Authenticate (cached per request)
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Get card ID from params and check for permanent delete flag
    const { id } = await context.params;
    const url = new URL(request.url);
    const permanent = url.searchParams.get('permanent') === 'true';

    if (!id) {
      return NextResponse.json(
        { error: 'Card ID is required' },
        { status: 400 }
      );
    }

    if (permanent) {
      // PERMANENT DELETE - actually remove the row from the database
      // This triggers a DELETE event in Supabase Realtime, syncing to other devices
      const result = await prisma.card.deleteMany({
        where: {
          id,
          workspace: {
            userId: user.id,
          },
        },
      });

      if (result.count === 0) {
        return NextResponse.json(
          { error: 'Card not found' },
          { status: 404 }
        );
      }

      log.info(`Permanently deleted card ${id}`);
      return NextResponse.json({
        success: true,
        permanent: true,
        card: { id },
      });
    }

    // SOFT DELETE - mark as deleted but keep the row
    // This triggers an UPDATE event in Supabase Realtime
    const result = await prisma.card.updateMany({
      where: {
        id,
        workspace: {
          userId: user.id,
        },
      },
      data: {
        deleted: true,
        deletedAt: new Date(),
      },
    });

    // If no rows updated, card doesn't exist or isn't owned by user
    if (result.count === 0) {
      return NextResponse.json(
        { error: 'Card not found' },
        { status: 404 }
      );
    }

    // Increment version in a separate query (updateMany doesn't support increment)
    // This ensures Supabase Realtime UPDATE events are picked up by other devices
    await prisma.card.update({
      where: { id },
      data: { version: { increment: 1 } },
    });

    return NextResponse.json({
      success: true,
      card: {
        id,
        deleted: true,
        deletedAt: new Date(),
      },
    });
  } catch (error) {
    log.error('DELETE /api/cards/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
