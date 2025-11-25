import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";
import { prisma } from "@/lib/server/prisma";
import { unauthorized, success, rateLimited } from "@/lib/utils/api-responses";
import { rateLimit } from "@/lib/utils/rate-limit";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// PATCH /api/todos/[id] - Update todo
export async function PATCH(
  request: Request,
  segmentData: RouteParams
) {
  let user;
  let body;
  try {
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    // Rate limit: 100 requests per minute per user
    const limitResult = rateLimit({
      identifier: user.id,
      limit: 100,
      windowMs: 60000,
    });

    if (!limitResult.allowed) {
      return rateLimited();
    }

    const params = await segmentData.params;
    body = await request.json();

    // Check todo exists and belongs to user
    const existingTodo = await prisma.todo.findFirst({
      where: {
        id: params.id,
        userId: user.id
      }
    });

    if (!existingTodo) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      );
    }

    // Update todo
    const updateData: { text?: string; completed?: boolean } = {};
    if (body.text !== undefined) {
      const trimmedText = body.text.trim();
      // Validate length (max 500 characters)
      if (trimmedText.length > 500) {
        return NextResponse.json(
          { error: 'Text must be 500 characters or less' },
          { status: 400 }
        );
      }
      updateData.text = trimmedText;
    }
    if (body.completed !== undefined) updateData.completed = body.completed;

    const todo = await prisma.todo.update({
      where: { id: params.id },
      data: updateData
    });

    return success(todo);
  } catch (error) {
    return handleApiError(error, { route: '/api/todos/[id]', userId: user?.id });
  }
}

// DELETE /api/todos/[id] - Delete todo
export async function DELETE(
  request: Request,
  segmentData: RouteParams
) {
  let user;
  try {
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    // Rate limit: 100 requests per minute per user
    const limitResult = rateLimit({
      identifier: user.id,
      limit: 100,
      windowMs: 60000,
    });

    if (!limitResult.allowed) {
      return rateLimited();
    }

    const params = await segmentData.params;

    // Check todo exists and belongs to user
    const existingTodo = await prisma.todo.findFirst({
      where: {
        id: params.id,
        userId: user.id
      }
    });

    if (!existingTodo) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      );
    }

    await prisma.todo.delete({
      where: { id: params.id }
    });

    return success({ message: 'Todo deleted successfully' });
  } catch (error) {
    return handleApiError(error, { route: '/api/todos/[id]', userId: user?.id });
  }
}
