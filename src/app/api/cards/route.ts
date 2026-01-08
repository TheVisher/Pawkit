/**
 * Card API Routes
 *
 * GET  /api/cards - List cards for a workspace (with optional filters)
 * POST /api/cards - Create a new card
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@/generated/prisma';
import {
  createCardSchema,
  listCardsQuerySchema,
} from '@/lib/validations/card';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('CardsAPI');

/**
 * GET /api/cards
 *
 * List cards for a workspace with optional filtering.
 *
 * Query params:
 * - workspaceId (required): Filter by workspace
 * - since (optional): Return cards updated after this timestamp (ISO 8601)
 * - deleted (optional): Include soft-deleted cards (default: false)
 * - type (optional): Filter by card type
 * - limit (optional): Max results (default: 100, max: 100)
 * - offset (optional): Pagination offset (default: 0)
 */
export async function GET(request: Request) {
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

    // 2. Parse and validate query params
    const { searchParams } = new URL(request.url);
    const queryResult = listCardsQuerySchema.safeParse({
      workspaceId: searchParams.get('workspaceId'),
      since: searchParams.get('since'),
      deleted: searchParams.get('deleted'),
      type: searchParams.get('type'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    });

    if (!queryResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: queryResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { workspaceId, since, deleted, type, limit, offset } = queryResult.data;

    // Handle null values from searchParams (null coalescing, not default values)
    const effectiveLimit = limit ?? 100;
    const effectiveOffset = offset ?? 0;

    // 3. Verify workspace belongs to user
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        userId: user.id,
      },
    });

    if (!workspace) {
      // Return 404 to not leak workspace existence
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    // 4. Build query
    const cards = await prisma.card.findMany({
      where: {
        workspaceId,
        // Only include deleted if explicitly requested
        ...(deleted !== true && { deleted: false }),
        // Filter by updatedAt for delta sync
        ...(since && {
          updatedAt: { gt: new Date(since) },
        }),
        // Filter by type if specified
        ...(type && { type }),
      },
      orderBy: { updatedAt: 'desc' },
      take: effectiveLimit,
      skip: effectiveOffset,
    });

    // 5. Return cards
    return NextResponse.json({
      cards,
      meta: {
        count: cards.length,
        limit: effectiveLimit,
        offset: effectiveOffset,
      },
    });
  } catch (error) {
    log.error('GET /api/cards error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cards
 *
 * Create a new card in a workspace.
 * Client can provide their own ID for offline-first sync.
 */
export async function POST(request: Request) {
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

    // 2. Parse and validate request body
    const body = await request.json();
    const validationResult = createCardSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const cardData = validationResult.data;

    // 3. Verify workspace belongs to user
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: cardData.workspaceId,
        userId: user.id,
      },
    });

    if (!workspace) {
      // Return 404 to not leak workspace existence
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    // 4. Check if card with this ID already exists (for sync idempotency)
    if (cardData.id) {
      const existing = await prisma.card.findFirst({
        where: {
          id: cardData.id,
          workspaceId: cardData.workspaceId,
        },
      });

      if (existing) {
        // If existing card is soft-deleted, restore it with the new data
        if (existing.deleted) {
          const restored = await prisma.card.update({
            where: { id: existing.id },
            data: {
              deleted: false,
              deletedAt: null,
              // Update with any new data from the create request
              title: cardData.title ?? existing.title,
              content: cardData.content ?? existing.content,
              updatedAt: new Date(),
            },
          });
          return NextResponse.json({ card: restored }, { status: 200 });
        }
        // Return existing card (idempotent create)
        return NextResponse.json({ card: existing }, { status: 200 });
      }
    }

    // 5. Create the card
    const card = await prisma.card.create({
      data: {
        // Use client ID if provided, otherwise Prisma generates one
        ...(cardData.id && { id: cardData.id }),
        workspaceId: cardData.workspaceId,
        type: cardData.type,
        url: cardData.url,
        title: cardData.title,
        description: cardData.description,
        content: cardData.content,
        notes: cardData.notes,
        domain: cardData.domain,
        image: cardData.image,
        favicon: cardData.favicon,
        metadata: cardData.metadata as Prisma.InputJsonValue | undefined,
        status: cardData.status,
        tags: cardData.tags,
        // collections field removed - Pawkit membership now uses tags
        pinned: cardData.pinned,
        scheduledDate: cardData.scheduledDate
          ? new Date(cardData.scheduledDate)
          : null,
        scheduledStartTime: cardData.scheduledStartTime,
        scheduledEndTime: cardData.scheduledEndTime,
        articleContent: cardData.articleContent,
        summary: cardData.summary,
        summaryType: cardData.summaryType,
        transcriptSegments: cardData.transcriptSegments,
        structuredData: cardData.structuredData as Prisma.InputJsonValue | undefined,
        source: cardData.source as Prisma.InputJsonValue | undefined,
        isFileCard: cardData.isFileCard,
        fileId: cardData.fileId,
        cloudId: cardData.cloudId,
        cloudProvider: cardData.cloudProvider,
        cloudSyncedAt: cardData.cloudSyncedAt
          ? new Date(cardData.cloudSyncedAt)
          : null,
        convertedToTodo: cardData.convertedToTodo,
        dismissedTodoSuggestion: cardData.dismissedTodoSuggestion,
      },
    });

    // 6. Return created card
    return NextResponse.json({ card }, { status: 201 });
  } catch (error) {
    log.error('POST /api/cards error:', error);

    // Handle unique constraint violations
    if (
      error instanceof Error &&
      error.message.includes('Unique constraint')
    ) {
      return NextResponse.json(
        { error: 'Card with this ID already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
