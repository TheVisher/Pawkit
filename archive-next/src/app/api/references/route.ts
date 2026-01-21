/**
 * Reference API Routes
 *
 * GET  /api/references - List references for a workspace (with optional filters)
 * POST /api/references - Create a new reference
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db/prisma';
import {
  createReferenceSchema,
  listReferencesQuerySchema,
} from '@/lib/validations/reference';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('ReferencesAPI');

/**
 * GET /api/references
 *
 * List references for a workspace with optional filtering.
 *
 * Query params:
 * - workspaceId (required): Filter by workspace
 * - since (optional): Return references updated after this timestamp (ISO 8601)
 * - deleted (optional): Include soft-deleted references (default: false)
 * - sourceId (optional): Filter by source card ID
 * - targetId (optional): Filter by target ID
 * - targetType (optional): Filter by target type (card, pawkit, date)
 * - limit (optional): Max results (default: 100, max: 500)
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
    const queryResult = listReferencesQuerySchema.safeParse({
      workspaceId: searchParams.get('workspaceId'),
      since: searchParams.get('since'),
      deleted: searchParams.get('deleted'),
      sourceId: searchParams.get('sourceId'),
      targetId: searchParams.get('targetId'),
      targetType: searchParams.get('targetType'),
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

    const { workspaceId, since, deleted, sourceId, targetId, targetType, limit, offset } = queryResult.data;

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
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    // 4. Build query
    const references = await prisma.reference.findMany({
      where: {
        workspaceId,
        // Only include deleted if explicitly requested
        ...(deleted !== true && { deleted: false }),
        // Filter by updatedAt for delta sync
        ...(since && {
          updatedAt: { gt: new Date(since) },
        }),
        // Optional filters
        ...(sourceId && { sourceId }),
        ...(targetId && { targetId }),
        ...(targetType && { targetType }),
      },
      orderBy: { updatedAt: 'desc' },
      take: effectiveLimit,
      skip: effectiveOffset,
    });

    // 5. Return references
    return NextResponse.json({
      references,
      meta: {
        count: references.length,
        limit: effectiveLimit,
        offset: effectiveOffset,
      },
    });
  } catch (error) {
    log.error('GET /api/references error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/references
 *
 * Create a new reference in a workspace.
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
    const validationResult = createReferenceSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const referenceData = validationResult.data;

    // 3. Verify workspace belongs to user
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: referenceData.workspaceId,
        userId: user.id,
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    // 4. Check if reference with this ID already exists (for sync idempotency)
    if (referenceData.id) {
      const existing = await prisma.reference.findFirst({
        where: {
          id: referenceData.id,
          workspaceId: referenceData.workspaceId,
        },
      });

      if (existing) {
        // If existing reference is soft-deleted, restore it with the new data
        if (existing.deleted) {
          const restored = await prisma.reference.update({
            where: { id: existing.id },
            data: {
              deleted: false,
              deletedAt: null,
              // Update with any new data from the create request
              targetId: referenceData.targetId,
              targetType: referenceData.targetType,
              linkText: referenceData.linkText,
              updatedAt: new Date(),
            },
          });
          return NextResponse.json({ reference: restored }, { status: 200 });
        }
        // Return existing reference (idempotent create)
        return NextResponse.json({ reference: existing }, { status: 200 });
      }
    }

    // 5. Create the reference
    const reference = await prisma.reference.create({
      data: {
        // Use client ID if provided, otherwise Prisma generates one
        ...(referenceData.id && { id: referenceData.id }),
        workspaceId: referenceData.workspaceId,
        sourceId: referenceData.sourceId,
        targetId: referenceData.targetId,
        targetType: referenceData.targetType,
        linkText: referenceData.linkText,
      },
    });

    // 6. Return created reference
    return NextResponse.json({ reference }, { status: 201 });
  } catch (error) {
    log.error('POST /api/references error:', error);

    // Handle unique constraint violations
    if (
      error instanceof Error &&
      error.message.includes('Unique constraint')
    ) {
      return NextResponse.json(
        { error: 'Reference with this ID already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
