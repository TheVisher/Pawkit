/**
 * Collection (Pawkit) API Routes
 *
 * GET  /api/collections - List collections for a workspace (with optional filters)
 * POST /api/collections - Create a new collection
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@/generated/prisma';
import {
  createCollectionSchema,
  listCollectionsQuerySchema,
} from '@/lib/validations/collection';

/**
 * GET /api/collections
 *
 * List collections for a workspace with optional filtering.
 *
 * Query params:
 * - workspaceId (required): Filter by workspace
 * - since (optional): Return collections updated after this timestamp (ISO 8601)
 * - deleted (optional): Include soft-deleted collections (default: false)
 * - parentId (optional): Filter by parent collection
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
    const queryResult = listCollectionsQuerySchema.safeParse({
      workspaceId: searchParams.get('workspaceId'),
      since: searchParams.get('since'),
      deleted: searchParams.get('deleted'),
      parentId: searchParams.get('parentId'),
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

    const { workspaceId, since, deleted, parentId, limit = 100, offset = 0 } = queryResult.data;

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
    const collections = await prisma.collection.findMany({
      where: {
        workspaceId,
        // Only include deleted if explicitly requested
        ...(deleted !== true && { deleted: false }),
        // Filter by updatedAt for delta sync
        ...(since && {
          updatedAt: { gt: new Date(since) },
        }),
        // Filter by parent if specified
        ...(parentId !== undefined && { parentId: parentId || null }),
      },
      orderBy: [
        { position: 'asc' },
        { createdAt: 'desc' },
      ],
      take: limit,
      skip: offset,
    });

    // 5. Return collections
    return NextResponse.json({
      collections,
      meta: {
        count: collections.length,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('GET /api/collections error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/collections
 *
 * Create a new collection in a workspace.
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
    const validationResult = createCollectionSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const collectionData = validationResult.data;

    // 3. Verify workspace belongs to user
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: collectionData.workspaceId,
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

    // 4. Check if collection with this ID already exists (for sync idempotency)
    if (collectionData.id) {
      const existing = await prisma.collection.findFirst({
        where: {
          id: collectionData.id,
          workspaceId: collectionData.workspaceId,
        },
      });

      if (existing) {
        // Return existing collection (idempotent create)
        return NextResponse.json({ collection: existing }, { status: 200 });
      }
    }

    // 5. Check for slug uniqueness within workspace
    const slugExists = await prisma.collection.findFirst({
      where: {
        workspaceId: collectionData.workspaceId,
        slug: collectionData.slug,
      },
    });

    if (slugExists) {
      return NextResponse.json(
        { error: 'Collection with this slug already exists' },
        { status: 409 }
      );
    }

    // 6. Verify parent collection exists (if specified)
    if (collectionData.parentId) {
      const parentExists = await prisma.collection.findFirst({
        where: {
          id: collectionData.parentId,
          workspaceId: collectionData.workspaceId,
        },
      });

      if (!parentExists) {
        return NextResponse.json(
          { error: 'Parent collection not found' },
          { status: 400 }
        );
      }
    }

    // 7. Create the collection
    const collection = await prisma.collection.create({
      data: {
        // Use client ID if provided, otherwise Prisma generates one
        ...(collectionData.id && { id: collectionData.id }),
        workspaceId: collectionData.workspaceId,
        name: collectionData.name,
        slug: collectionData.slug,
        parentId: collectionData.parentId,
        position: collectionData.position,
        coverImage: collectionData.coverImage,
        coverImagePosition: collectionData.coverImagePosition,
        icon: collectionData.icon,
        isPrivate: collectionData.isPrivate,
        isSystem: collectionData.isSystem,
        hidePreview: collectionData.hidePreview,
        useCoverAsBackground: collectionData.useCoverAsBackground,
        metadata: collectionData.metadata as Prisma.InputJsonValue | undefined,
        pinned: collectionData.pinned,
      },
    });

    // 8. Return created collection
    return NextResponse.json({ collection }, { status: 201 });
  } catch (error) {
    console.error('POST /api/collections error:', error);

    // Handle unique constraint violations
    if (
      error instanceof Error &&
      error.message.includes('Unique constraint')
    ) {
      return NextResponse.json(
        { error: 'Collection with this ID or slug already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
