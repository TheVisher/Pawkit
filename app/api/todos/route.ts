import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";
import { prisma } from "@/lib/server/prisma";
import { unauthorized, success, rateLimited, validationError } from "@/lib/utils/api-responses";
import { rateLimit } from "@/lib/utils/rate-limit";
import { todoCreateSchema } from "@/lib/validators/todo";

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
        { completed: 'asc' },   // Incomplete first
        { dueDate: 'asc' },     // Then by due date (nulls last for backlog)
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

    // Validate with Zod schema
    const parseResult = todoCreateSchema.safeParse(body);
    if (!parseResult.success) {
      const message = parseResult.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
      return validationError(message);
    }

    const validated = parseResult.data;

    const todo = await prisma.todo.create({
      data: {
        userId: user.id,
        text: validated.text,
        completed: validated.completed,
        dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
      }
    });

    return success(todo);
  } catch (error) {
    return handleApiError(error, { route: '/api/todos', userId: user?.id });
  }
}
