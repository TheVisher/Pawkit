/**
 * Workspace API Routes
 *
 * GET  /api/workspaces - List workspaces for the current user
 * POST /api/workspaces - Create a new workspace
 */

import { NextResponse } from 'next/server';
import { createClient, getAuthUserFromRequest } from '@/lib/supabase/server';
import { prisma } from '@/lib/db/prisma';
import {
  createWorkspaceSchema,
  listWorkspacesQuerySchema,
} from '@/lib/validations/workspace';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('WorkspacesAPI');

/**
 * GET /api/workspaces
 *
 * List all workspaces for the authenticated user.
 *
 * Query params:
 * - since (optional): Return workspaces updated after this timestamp (ISO 8601)
 * - limit (optional): Max results (default: 100, max: 100)
 * - offset (optional): Pagination offset (default: 0)
 */
export async function GET(request: Request) {
  try {
    // 1. Authenticate (supports both cookies and Bearer token)
    const user = await getAuthUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse and validate query params
    const { searchParams } = new URL(request.url);
    const queryResult = listWorkspacesQuerySchema.safeParse({
      since: searchParams.get('since'),
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

    const { since, limit, offset } = queryResult.data;
    const effectiveLimit = limit ?? 100;
    const effectiveOffset = offset ?? 0;

    // 3. Fetch workspaces for user
    const workspaces = await prisma.workspace.findMany({
      where: {
        userId: user.id,
        // Filter by updatedAt for delta sync
        ...(since && {
          updatedAt: { gt: new Date(since) },
        }),
      },
      orderBy: [
        { isDefault: 'desc' }, // Default workspace first
        { createdAt: 'asc' },
      ],
      take: effectiveLimit,
      skip: effectiveOffset,
    });

    // 4. Return workspaces
    return NextResponse.json({
      workspaces,
      meta: {
        count: workspaces.length,
        limit: effectiveLimit,
        offset: effectiveOffset,
      },
    });
  } catch (error) {
    log.error('GET /api/workspaces error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workspaces
 *
 * Create a new workspace for the authenticated user.
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

    // 2. Ensure User record exists in database (sync from Supabase Auth)
    await prisma.user.upsert({
      where: { id: user.id },
      update: { email: user.email ?? '' },
      create: {
        id: user.id,
        email: user.email ?? '',
        displayName: user.user_metadata?.full_name ?? null,
      },
    });

    // 3. Parse and validate request body
    const body = await request.json();
    const validationResult = createWorkspaceSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const workspaceData = validationResult.data;

    // 4. Check if workspace with this ID already exists (for sync idempotency)
    if (workspaceData.id) {
      const existing = await prisma.workspace.findFirst({
        where: {
          id: workspaceData.id,
          userId: user.id,
        },
      });

      if (existing) {
        // Return existing workspace (idempotent create)
        return NextResponse.json({ workspace: existing }, { status: 200 });
      }
    }

    // 5. If this is being set as default, unset any existing default
    if (workspaceData.isDefault) {
      await prisma.workspace.updateMany({
        where: {
          userId: user.id,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    // 6. Check if this is the user's first workspace (make it default)
    const existingCount = await prisma.workspace.count({
      where: { userId: user.id },
    });
    const shouldBeDefault = existingCount === 0 || workspaceData.isDefault;

    // 7. Create the workspace
    const workspace = await prisma.workspace.create({
      data: {
        // Use client ID if provided, otherwise Prisma generates one
        ...(workspaceData.id && { id: workspaceData.id }),
        userId: user.id,
        name: workspaceData.name,
        icon: workspaceData.icon,
        isDefault: shouldBeDefault,
      },
    });

    // 8. Return created workspace
    return NextResponse.json({ workspace }, { status: 201 });
  } catch (error) {
    log.error('POST /api/workspaces error:', error);

    // Handle unique constraint violations
    if (
      error instanceof Error &&
      error.message.includes('Unique constraint')
    ) {
      return NextResponse.json(
        { error: 'Workspace with this ID already exists' },
        { status: 409 }
      );
    }

    // Return detailed error in development
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
