/**
 * Card API Routes - Single Card Operations
 *
 * GET    /api/cards/[id] - Get a single card
 * PATCH  /api/cards/[id] - Update a card
 * DELETE /api/cards/[id] - Soft delete a card
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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
    // 1. Authenticate
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
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
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    // 1. Authenticate
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
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

    // 3. Verify ownership BEFORE parsing body
    const existingCard = await getOwnedCard(id, user.id);

    if (!existingCard) {
      // Return 404 to not leak existence
      return NextResponse.json(
        { error: 'Card not found' },
        { status: 404 }
      );
    }

    // 4. Parse and validate request body
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

    // 5. Build update data
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

    // 6. Check for version conflict if expectedVersion provided
    if (updates.expectedVersion !== undefined) {
      if (existingCard.version > updates.expectedVersion) {
        // Version conflict! Server has a newer version than client expected
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
    }

    // 7. Update the card with version increment
    const card = await prisma.card.update({
      where: { id },
      data: {
        ...updateData,
        version: { increment: 1 }, // Always increment version on server update
      },
    });

    // 7. Return updated card
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
 * Soft delete a card (set deleted: true, deletedAt: now).
 * Returns 404 if not found or not owned by user.
 */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    // 1. Authenticate
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
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

    // 3. Verify ownership BEFORE deleting
    const existingCard = await getOwnedCard(id, user.id);

    if (!existingCard) {
      // Return 404 to not leak existence
      return NextResponse.json(
        { error: 'Card not found' },
        { status: 404 }
      );
    }

    // 4. Soft delete the card
    const card = await prisma.card.update({
      where: { id },
      data: {
        deleted: true,
        deletedAt: new Date(),
      },
    });

    // 5. Return success
    return NextResponse.json({
      success: true,
      card: {
        id: card.id,
        deleted: card.deleted,
        deletedAt: card.deletedAt,
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
