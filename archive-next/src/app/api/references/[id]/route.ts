/**
 * Reference API Routes - Single Reference Operations
 *
 * GET    /api/references/[id] - Get a single reference
 * PATCH  /api/references/[id] - Update a reference
 * DELETE /api/references/[id] - Soft delete a reference
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db/prisma';
import { updateReferenceSchema } from '@/lib/validations/reference';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('ReferenceAPI');

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Helper to verify reference ownership
 * Returns the reference if found and owned, null otherwise
 */
async function getOwnedReference(referenceId: string, userId: string) {
  const reference = await prisma.reference.findFirst({
    where: {
      id: referenceId,
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

  return reference;
}

/**
 * GET /api/references/[id]
 *
 * Fetch a single reference by ID.
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

    // 2. Get reference ID from params
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: 'Reference ID is required' },
        { status: 400 }
      );
    }

    // 3. Find reference and verify ownership
    const reference = await getOwnedReference(id, user.id);

    if (!reference) {
      return NextResponse.json(
        { error: 'Reference not found' },
        { status: 404 }
      );
    }

    // 4. Remove internal fields and return
    const { workspace, ...referenceData } = reference;
    void workspace; // Used for destructuring only
    return NextResponse.json({ reference: referenceData });
  } catch (error) {
    log.error('GET /api/references/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/references/[id]
 *
 * Update an existing reference.
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

    // 2. Get reference ID from params
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: 'Reference ID is required' },
        { status: 400 }
      );
    }

    // 3. Verify ownership BEFORE parsing body
    const existingReference = await getOwnedReference(id, user.id);

    if (!existingReference) {
      return NextResponse.json(
        { error: 'Reference not found' },
        { status: 404 }
      );
    }

    // 4. Parse and validate request body
    const body = await request.json();
    const validationResult = updateReferenceSchema.safeParse(body);

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

    // Reference fields
    if (updates.targetId !== undefined) updateData.targetId = updates.targetId;
    if (updates.targetType !== undefined) updateData.targetType = updates.targetType;
    if (updates.linkText !== undefined) updateData.linkText = updates.linkText;

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

    // 6. Update the reference
    const reference = await prisma.reference.update({
      where: { id },
      data: updateData,
    });

    // 7. Return updated reference
    return NextResponse.json({ reference });
  } catch (error) {
    log.error('PATCH /api/references/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/references/[id]
 *
 * Delete a reference. Supports two modes:
 * - Soft delete (default): Sets deleted: true, deletedAt: now
 * - Permanent delete (?permanent=true): Actually removes the row
 *
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

    // 2. Get reference ID from params and check for permanent delete flag
    const { id } = await context.params;
    const url = new URL(request.url);
    const permanent = url.searchParams.get('permanent') === 'true';

    if (!id) {
      return NextResponse.json(
        { error: 'Reference ID is required' },
        { status: 400 }
      );
    }

    if (permanent) {
      // PERMANENT DELETE - actually remove the row from the database
      const result = await prisma.reference.deleteMany({
        where: {
          id,
          workspace: {
            userId: user.id,
          },
        },
      });

      if (result.count === 0) {
        return NextResponse.json(
          { error: 'Reference not found' },
          { status: 404 }
        );
      }

      log.info(`Permanently deleted reference ${id}`);
      return NextResponse.json({
        success: true,
        permanent: true,
        reference: { id },
      });
    }

    // SOFT DELETE - mark as deleted but keep the row
    const result = await prisma.reference.updateMany({
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

    // If no rows updated, reference doesn't exist or isn't owned by user
    if (result.count === 0) {
      return NextResponse.json(
        { error: 'Reference not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      reference: {
        id,
        deleted: true,
        deletedAt: new Date(),
      },
    });
  } catch (error) {
    log.error('DELETE /api/references/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
