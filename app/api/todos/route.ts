import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";
import { prisma } from "@/lib/server/prisma";
import { unauthorized, success } from "@/lib/utils/api-responses";

// GET /api/todos - Get all todos for current user
export async function GET() {
  let user;
  try {
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const todos = await prisma.todo.findMany({
      where: { userId: user.id },
      orderBy: [
        { completed: 'asc' },  // Incomplete first
        { createdAt: 'desc' }   // Then by newest
      ]
    });

    return success(todos);
  } catch (error) {
    return handleApiError(error, { route: '/api/todos', userId: user?.id });
  }
}

// POST /api/todos - Create new todo
export async function POST(request: Request) {
  let user;
  let body;
  try {
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    body = await request.json();

    // Validate required fields
    if (!body.text || typeof body.text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required and must be a string' },
        { status: 400 }
      );
    }

    const todo = await prisma.todo.create({
      data: {
        userId: user.id,
        text: body.text.trim(),
        completed: body.completed || false
      }
    });

    return success(todo);
  } catch (error) {
    return handleApiError(error, { route: '/api/todos', userId: user?.id });
  }
}
