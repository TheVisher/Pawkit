/**
 * Todo API Routes
 *
 * GET  /api/todos - List todos for a workspace (with optional filters)
 * POST /api/todos - Create a new todo
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db/prisma';
import {
  createTodoSchema,
  listTodosQuerySchema,
} from '@/lib/validations/todo';

/**
 * GET /api/todos
 *
 * List todos for a workspace with optional filtering.
 *
 * Query params:
 * - workspaceId (required): Filter by workspace
 * - since (optional): Return todos updated after this timestamp (ISO 8601)
 * - completed (optional): Filter by completion status
 * - priority (optional): Filter by priority (high, medium, low)
 * - dueBefore (optional): Filter todos due before this date
 * - dueAfter (optional): Filter todos due after this date
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
    const queryResult = listTodosQuerySchema.safeParse({
      workspaceId: searchParams.get('workspaceId'),
      since: searchParams.get('since'),
      deleted: searchParams.get('deleted'),
      completed: searchParams.get('completed'),
      priority: searchParams.get('priority'),
      dueBefore: searchParams.get('dueBefore'),
      dueAfter: searchParams.get('dueAfter'),
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

    const { workspaceId, since, deleted, completed, priority, dueBefore, dueAfter, limit = 100, offset = 0 } = queryResult.data;

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
    const todos = await prisma.todo.findMany({
      where: {
        workspaceId,
        // Only include deleted if explicitly requested
        ...(deleted !== true && { deleted: false }),
        // Filter by updatedAt for delta sync
        ...(since && {
          updatedAt: { gt: new Date(since) },
        }),
        // Filter by completion status
        ...(completed !== undefined && { completed }),
        // Filter by priority
        ...(priority && { priority }),
        // Filter by due date range
        ...(dueBefore && {
          dueDate: { lte: new Date(dueBefore) },
        }),
        ...(dueAfter && {
          dueDate: { gte: new Date(dueAfter) },
        }),
      },
      orderBy: [
        { completed: 'asc' }, // Incomplete first
        { dueDate: 'asc' },   // Earliest due date first
        { createdAt: 'desc' },
      ],
      take: limit,
      skip: offset,
    });

    // 5. Return todos
    return NextResponse.json({
      todos,
      meta: {
        count: todos.length,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('GET /api/todos error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/todos
 *
 * Create a new todo in a workspace.
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
    const validationResult = createTodoSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const todoData = validationResult.data;

    // 3. Verify workspace belongs to user
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: todoData.workspaceId,
        userId: user.id,
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    // 4. Check if todo with this ID already exists (for sync idempotency)
    if (todoData.id) {
      const existing = await prisma.todo.findFirst({
        where: {
          id: todoData.id,
          workspaceId: todoData.workspaceId,
        },
      });

      if (existing) {
        // Return existing todo (idempotent create)
        return NextResponse.json({ todo: existing }, { status: 200 });
      }
    }

    // 5. Verify linked card exists if specified
    if (todoData.linkedCardId) {
      const cardExists = await prisma.card.findFirst({
        where: {
          id: todoData.linkedCardId,
          workspaceId: todoData.workspaceId,
        },
      });

      if (!cardExists) {
        return NextResponse.json(
          { error: 'Linked card not found' },
          { status: 400 }
        );
      }
    }

    // 6. Create the todo
    const todo = await prisma.todo.create({
      data: {
        // Use client ID if provided, otherwise Prisma generates one
        ...(todoData.id && { id: todoData.id }),
        workspaceId: todoData.workspaceId,
        text: todoData.text,
        completed: todoData.completed,
        completedAt: todoData.completedAt ? new Date(todoData.completedAt) : null,
        dueDate: todoData.dueDate ? new Date(todoData.dueDate) : null,
        priority: todoData.priority,
        linkedCardId: todoData.linkedCardId,
      },
    });

    // 7. Return created todo
    return NextResponse.json({ todo }, { status: 201 });
  } catch (error) {
    console.error('POST /api/todos error:', error);

    // Handle unique constraint violations
    if (
      error instanceof Error &&
      error.message.includes('Unique constraint')
    ) {
      return NextResponse.json(
        { error: 'Todo with this ID already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
