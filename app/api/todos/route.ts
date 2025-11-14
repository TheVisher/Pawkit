import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";
import { prisma } from "@/lib/server/prisma";
import { unauthorized, success, rateLimited } from "@/lib/utils/api-responses";
import { rateLimit } from "@/lib/utils/rate-limit";

// GET /api/todos - Get all todos for current user
export async function GET() {
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

    // Rate limit: 50 requests per minute per user (stricter for writes)
    const limitResult = rateLimit({
      identifier: user.id,
      limit: 50,
      windowMs: 60000,
    });

    if (!limitResult.allowed) {
      return rateLimited();
    }

    body = await request.json();

    // Validate required fields
    if (!body.text || typeof body.text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required and must be a string' },
        { status: 400 }
      );
    }

    // Validate length (max 500 characters)
    if (body.text.trim().length > 500) {
      return NextResponse.json(
        { error: 'Text must be 500 characters or less' },
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
