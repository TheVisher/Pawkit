import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";
import { prisma } from "@/lib/server/prisma";
import { unauthorized, success } from "@/lib/utils/api-responses";

// PATCH /api/todos/[id] - Update todo
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  let user;
  let body;
  try {
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

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
    const updateData: any = {};
    if (body.text !== undefined) updateData.text = body.text.trim();
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
  { params }: { params: { id: string } }
) {
  let user;
  try {
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

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
