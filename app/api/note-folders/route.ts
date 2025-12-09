import { NextRequest } from "next/server";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";
import { prisma } from "@/lib/server/prisma";
import { unauthorized, success, created, rateLimited, validationError } from "@/lib/utils/api-responses";
import { rateLimit, getRateLimitHeaders } from "@/lib/utils/rate-limit";

// GET /api/note-folders - List all note folders for the user
export async function GET() {
  let user;
  try {
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const folders = await prisma.noteFolder.findMany({
      where: { userId: user.id },
      orderBy: [{ parentId: 'asc' }, { position: 'asc' }],
    });

    return success(folders);
  } catch (error) {
    return handleApiError(error, { route: '/api/note-folders', userId: user?.id });
  }
}

// POST /api/note-folders - Create a new folder
export async function POST(request: NextRequest) {
  let user;
  try {
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    // Rate limiting: 30 folder creations per minute per user
    const rateLimitResult = rateLimit({
      identifier: `note-folder-create:${user.id}`,
      limit: 30,
      windowMs: 60000,
    });

    if (!rateLimitResult.allowed) {
      const response = rateLimited('Too many folder creations. Please try again later.');
      Object.entries(getRateLimitHeaders(rateLimitResult)).forEach(([key, value]) => {
        response.headers.set(key, value as string);
      });
      return response;
    }

    const body = await request.json();
    const { name, parentId } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return validationError('Folder name is required');
    }

    // Validate parentId if provided
    if (parentId) {
      const parentFolder = await prisma.noteFolder.findFirst({
        where: { id: parentId, userId: user.id },
      });
      if (!parentFolder) {
        return validationError('Parent folder not found');
      }
    }

    // Get max position for ordering
    const siblings = await prisma.noteFolder.findMany({
      where: { userId: user.id, parentId: parentId || null },
      select: { position: true },
    });
    const maxPosition = siblings.length > 0
      ? Math.max(...siblings.map(s => s.position)) + 1
      : 0;

    const folder = await prisma.noteFolder.create({
      data: {
        userId: user.id,
        name: name.trim(),
        parentId: parentId || null,
        position: maxPosition,
      },
    });

    return created(folder);
  } catch (error) {
    return handleApiError(error, { route: '/api/note-folders', userId: user?.id });
  }
}
