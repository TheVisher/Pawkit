/**
 * Collection (Pawkit) API Routes - Single Collection Operations
 *
 * GET    /api/collections/[id] - Get a single collection
 * PATCH  /api/collections/[id] - Update a collection
 * DELETE /api/collections/[id] - Soft delete a collection
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@/generated/prisma';
import { updateCollectionSchema } from '@/lib/validations/collection';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Helper to verify collection ownership
 * Returns the collection if found and owned, null otherwise
 */
async function getOwnedCollection(collectionId: string, userId: string) {
  const collection = await prisma.collection.findFirst({
    where: {
      id: collectionId,
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

  return collection;
}

/**
 * GET /api/collections/[id]
 *
 * Fetch a single collection by ID.
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

    // 2. Get collection ID from params
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: 'Collection ID is required' },
        { status: 400 }
      );
    }

    // 3. Find collection and verify ownership
    const collection = await getOwnedCollection(id, user.id);

    if (!collection) {
      // Return 404 to not leak existence
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    // 4. Remove internal fields and return
    const { workspace, ...collectionData } = collection;
    return NextResponse.json({ collection: collectionData });
  } catch (error) {
    console.error('GET /api/collections/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/collections/[id]
 *
 * Update an existing collection.
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

    // 2. Get collection ID from params
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: 'Collection ID is required' },
        { status: 400 }
      );
    }

    // 3. Verify ownership BEFORE parsing body
    const existingCollection = await getOwnedCollection(id, user.id);

    if (!existingCollection) {
      // Return 404 to not leak existence
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    // 4. Parse and validate request body
    const body = await request.json();
    const validationResult = updateCollectionSchema.safeParse(body);

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

    // 5. Check slug uniqueness if being updated
    if (updates.slug && updates.slug !== existingCollection.slug) {
      const slugExists = await prisma.collection.findFirst({
        where: {
          workspaceId: existingCollection.workspaceId,
          slug: updates.slug,
          NOT: { id: id },
        },
      });

      if (slugExists) {
        return NextResponse.json(
          { error: 'Collection with this slug already exists' },
          { status: 409 }
        );
      }
    }

    // 6. Verify parent collection exists if being updated
    if (updates.parentId !== undefined && updates.parentId !== null) {
      // Prevent self-reference
      if (updates.parentId === id) {
        return NextResponse.json(
          { error: 'Collection cannot be its own parent' },
          { status: 400 }
        );
      }

      const parentExists = await prisma.collection.findFirst({
        where: {
          id: updates.parentId,
          workspaceId: existingCollection.workspaceId,
        },
      });

      if (!parentExists) {
        return NextResponse.json(
          { error: 'Parent collection not found' },
          { status: 400 }
        );
      }
    }

    // 7. Build update data
    const updateData: Record<string, unknown> = {};

    // Only include fields that are explicitly provided
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.slug !== undefined) updateData.slug = updates.slug;
    if ('parentId' in updates) updateData.parentId = updates.parentId;
    if (updates.position !== undefined) updateData.position = updates.position;

    // Display settings
    if ('coverImage' in updates) updateData.coverImage = updates.coverImage;
    if ('coverImagePosition' in updates) updateData.coverImagePosition = updates.coverImagePosition;
    if ('icon' in updates) updateData.icon = updates.icon;

    // Flags
    if (updates.isPrivate !== undefined) updateData.isPrivate = updates.isPrivate;
    if (updates.hidePreview !== undefined) updateData.hidePreview = updates.hidePreview;
    if (updates.useCoverAsBackground !== undefined) updateData.useCoverAsBackground = updates.useCoverAsBackground;

    // Board/Kanban config
    if ('metadata' in updates) updateData.metadata = updates.metadata as Prisma.InputJsonValue ?? undefined;

    // Pinning
    if (updates.pinned !== undefined) updateData.pinned = updates.pinned;

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

    // 8. Update the collection
    const collection = await prisma.collection.update({
      where: { id },
      data: updateData,
    });

    // 9. Return updated collection
    return NextResponse.json({ collection });
  } catch (error) {
    console.error('PATCH /api/collections/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/collections/[id]
 *
 * Soft delete a collection (set deleted: true, deletedAt: now).
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

    // 2. Get collection ID from params
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: 'Collection ID is required' },
        { status: 400 }
      );
    }

    // 3. Verify ownership BEFORE deleting
    const existingCollection = await getOwnedCollection(id, user.id);

    if (!existingCollection) {
      // Return 404 to not leak existence
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    // 4. Prevent deletion of system collections
    if (existingCollection.isSystem) {
      return NextResponse.json(
        { error: 'Cannot delete system collection' },
        { status: 403 }
      );
    }

    // 5. Soft delete the collection
    const collection = await prisma.collection.update({
      where: { id },
      data: {
        deleted: true,
        deletedAt: new Date(),
      },
    });

    // 6. Return success
    return NextResponse.json({
      success: true,
      collection: {
        id: collection.id,
        deleted: collection.deleted,
        deletedAt: collection.deletedAt,
      },
    });
  } catch (error) {
    console.error('DELETE /api/collections/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
