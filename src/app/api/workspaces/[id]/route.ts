/**
 * Workspace API Routes - Single Workspace Operations
 *
 * GET    /api/workspaces/[id] - Get a single workspace
 * PATCH  /api/workspaces/[id] - Update a workspace
 * DELETE /api/workspaces/[id] - Delete a workspace
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db/prisma';
import { updateWorkspaceSchema } from '@/lib/validations/workspace';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Helper to verify workspace ownership
 * Returns the workspace if found and owned, null otherwise
 */
async function getOwnedWorkspace(workspaceId: string, userId: string) {
  const workspace = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      userId: userId,
    },
  });

  return workspace;
}

/**
 * GET /api/workspaces/[id]
 *
 * Fetch a single workspace by ID.
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

    // 2. Get workspace ID from params
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: 'Workspace ID is required' },
        { status: 400 }
      );
    }

    // 3. Find workspace and verify ownership
    const workspace = await getOwnedWorkspace(id, user.id);

    if (!workspace) {
      // Return 404 to not leak existence
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    // 4. Return workspace
    return NextResponse.json({ workspace });
  } catch (error) {
    console.error('GET /api/workspaces/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/workspaces/[id]
 *
 * Update an existing workspace.
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

    // 2. Get workspace ID from params
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: 'Workspace ID is required' },
        { status: 400 }
      );
    }

    // 3. Verify ownership BEFORE parsing body
    const existingWorkspace = await getOwnedWorkspace(id, user.id);

    if (!existingWorkspace) {
      // Return 404 to not leak existence
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    // 4. Parse and validate request body
    const body = await request.json();
    const validationResult = updateWorkspaceSchema.safeParse(body);

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

    // 5. If setting as default, unset any existing default
    if (updates.isDefault === true && !existingWorkspace.isDefault) {
      await prisma.workspace.updateMany({
        where: {
          userId: user.id,
          isDefault: true,
          NOT: { id: id },
        },
        data: {
          isDefault: false,
        },
      });
    }

    // 6. Build update data
    const updateData: Record<string, unknown> = {};

    if (updates.name !== undefined) updateData.name = updates.name;
    if ('icon' in updates) updateData.icon = updates.icon;
    if (updates.isDefault !== undefined) updateData.isDefault = updates.isDefault;
    if ('preferences' in updates) {
      // Merge with existing preferences to avoid losing data
      const existingPrefs = (existingWorkspace.preferences as Record<string, unknown>) || {};
      updateData.preferences = { ...existingPrefs, ...updates.preferences };
    }

    // 7. Update the workspace
    const workspace = await prisma.workspace.update({
      where: { id },
      data: updateData,
    });

    // 8. Return updated workspace
    return NextResponse.json({ workspace });
  } catch (error) {
    console.error('PATCH /api/workspaces/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workspaces/[id]
 *
 * Delete a workspace (hard delete - cascades to all content).
 * Cannot delete the default workspace if it's the only one.
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

    // 2. Get workspace ID from params
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: 'Workspace ID is required' },
        { status: 400 }
      );
    }

    // 3. Verify ownership BEFORE deleting
    const existingWorkspace = await getOwnedWorkspace(id, user.id);

    if (!existingWorkspace) {
      // Return 404 to not leak existence
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    // 4. Check if this is the only workspace
    const workspaceCount = await prisma.workspace.count({
      where: { userId: user.id },
    });

    if (workspaceCount === 1) {
      return NextResponse.json(
        { error: 'Cannot delete your only workspace' },
        { status: 400 }
      );
    }

    // 5. If deleting default workspace, make another one default
    if (existingWorkspace.isDefault) {
      const anotherWorkspace = await prisma.workspace.findFirst({
        where: {
          userId: user.id,
          NOT: { id: id },
        },
        orderBy: { createdAt: 'asc' },
      });

      if (anotherWorkspace) {
        await prisma.workspace.update({
          where: { id: anotherWorkspace.id },
          data: { isDefault: true },
        });
      }
    }

    // 6. Delete the workspace (cascades to all content via Prisma schema)
    await prisma.workspace.delete({
      where: { id },
    });

    // 7. Return success
    return NextResponse.json({
      success: true,
      deletedId: id,
    });
  } catch (error) {
    console.error('DELETE /api/workspaces/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
