/**
 * Todo API Routes - Single Todo Operations
 *
 * GET    /api/todos/[id] - Get a single todo
 * PATCH  /api/todos/[id] - Update a todo
 * DELETE /api/todos/[id] - Soft delete a todo
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db/prisma';
import { updateTodoSchema } from '@/lib/validations/todo';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Helper to verify todo ownership
 * Returns the todo if found and owned, null otherwise
 */
async function getOwnedTodo(todoId: string, userId: string) {
  const todo = await prisma.todo.findFirst({
    where: {
      id: todoId,
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

  return todo;
}

/**
 * GET /api/todos/[id]
 *
 * Fetch a single todo by ID.
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

    // 2. Get todo ID from params
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: 'Todo ID is required' },
        { status: 400 }
      );
    }

    // 3. Find todo and verify ownership
    const todo = await getOwnedTodo(id, user.id);

    if (!todo) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      );
    }

    // 4. Remove internal fields and return
    const { workspace, ...todoData } = todo;
    return NextResponse.json({ todo: todoData });
  } catch (error) {
    console.error('GET /api/todos/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/todos/[id]
 *
 * Update an existing todo.
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

    // 2. Get todo ID from params
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: 'Todo ID is required' },
        { status: 400 }
      );
    }

    // 3. Verify ownership BEFORE parsing body
    const existingTodo = await getOwnedTodo(id, user.id);

    if (!existingTodo) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      );
    }

    // 4. Parse and validate request body
    const body = await request.json();
    const validationResult = updateTodoSchema.safeParse(body);

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

    // 5. Verify linked card exists if being updated
    if (updates.linkedCardId !== undefined && updates.linkedCardId !== null) {
      const cardExists = await prisma.card.findFirst({
        where: {
          id: updates.linkedCardId,
          workspaceId: existingTodo.workspaceId,
        },
      });

      if (!cardExists) {
        return NextResponse.json(
          { error: 'Linked card not found' },
          { status: 400 }
        );
      }
    }

    // 6. Build update data
    const updateData: Record<string, unknown> = {};

    // Task content
    if (updates.text !== undefined) updateData.text = updates.text;

    // Completion - auto-set completedAt when marking complete
    if (updates.completed !== undefined) {
      updateData.completed = updates.completed;
      if (updates.completed && !existingTodo.completed) {
        // Just became completed, set completedAt
        updateData.completedAt = new Date();
      } else if (!updates.completed) {
        // Marked incomplete, clear completedAt
        updateData.completedAt = null;
      }
    }
    // Allow explicit completedAt override
    if ('completedAt' in updates) {
      updateData.completedAt = updates.completedAt
        ? new Date(updates.completedAt)
        : null;
    }

    // Scheduling
    if ('dueDate' in updates) {
      updateData.dueDate = updates.dueDate
        ? new Date(updates.dueDate)
        : null;
    }

    // Priority
    if ('priority' in updates) updateData.priority = updates.priority;

    // Linked card
    if ('linkedCardId' in updates) updateData.linkedCardId = updates.linkedCardId;

    // 7. Update the todo
    const todo = await prisma.todo.update({
      where: { id },
      data: updateData,
    });

    // 8. Return updated todo
    return NextResponse.json({ todo });
  } catch (error) {
    console.error('PATCH /api/todos/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/todos/[id]
 *
 * Soft delete a todo (set deleted: true, deletedAt: now).
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

    // 2. Get todo ID from params
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: 'Todo ID is required' },
        { status: 400 }
      );
    }

    // 3. Verify ownership BEFORE deleting
    const existingTodo = await getOwnedTodo(id, user.id);

    if (!existingTodo) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      );
    }

    // 4. Soft delete the todo
    const todo = await prisma.todo.update({
      where: { id },
      data: {
        deleted: true,
        deletedAt: new Date(),
      },
    });

    // 5. Return success
    return NextResponse.json({
      success: true,
      todo: {
        id: todo.id,
        deleted: todo.deleted,
        deletedAt: todo.deletedAt,
      },
    });
  } catch (error) {
    console.error('DELETE /api/todos/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
