import { NextRequest } from "next/server";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";
import { prisma } from "@/lib/server/prisma";
import { unauthorized, success, notFound, validationError } from "@/lib/utils/api-responses";

// GET /api/note-folders/[id] - Get a single folder
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try {
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const { id } = await params;

    const folder = await prisma.noteFolder.findFirst({
      where: { id, userId: user.id },
    });

    if (!folder) {
      return notFound('Folder not found');
    }

    return success(folder);
  } catch (error) {
    return handleApiError(error, { route: '/api/note-folders/[id]', userId: user?.id });
  }
}

// PATCH /api/note-folders/[id] - Update a folder (rename, move)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try {
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const { id } = await params;
    const body = await request.json();

    // Check folder exists and belongs to user
    const folder = await prisma.noteFolder.findFirst({
      where: { id, userId: user.id },
    });

    if (!folder) {
      return notFound('Folder not found');
    }

    const updateData: { name?: string; parentId?: string | null; position?: number } = {};

    // Rename
    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0) {
        return validationError('Folder name is required');
      }
      updateData.name = body.name.trim();
    }

    // Move to new parent
    if (body.parentId !== undefined) {
      const newParentId = body.parentId || null;

      // Prevent moving to self
      if (newParentId === id) {
        return validationError('Cannot move folder into itself');
      }

      // Prevent moving to descendant
      if (newParentId) {
        const isDescendant = await checkIsDescendant(id, newParentId, user.id);
        if (isDescendant) {
          return validationError('Cannot move folder into its own descendant');
        }

        // Validate new parent exists
        const parentFolder = await prisma.noteFolder.findFirst({
          where: { id: newParentId, userId: user.id },
        });
        if (!parentFolder) {
          return validationError('Parent folder not found');
        }
      }

      updateData.parentId = newParentId;

      // Get new position at end of siblings
      const siblings = await prisma.noteFolder.findMany({
        where: { userId: user.id, parentId: newParentId },
        select: { position: true },
      });
      updateData.position = siblings.length > 0
        ? Math.max(...siblings.map(s => s.position)) + 1
        : 0;
    }

    // Update position only (for reordering)
    if (body.position !== undefined && body.parentId === undefined) {
      updateData.position = body.position;
    }

    const updatedFolder = await prisma.noteFolder.update({
      where: { id },
      data: updateData,
    });

    return success(updatedFolder);
  } catch (error) {
    return handleApiError(error, { route: '/api/note-folders/[id]', userId: user?.id });
  }
}

// DELETE /api/note-folders/[id] - Delete a folder
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try {
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const { id } = await params;

    // Check folder exists and belongs to user
    const folder = await prisma.noteFolder.findFirst({
      where: { id, userId: user.id },
    });

    if (!folder) {
      return notFound('Folder not found');
    }

    // Notes in this folder will have noteFolderId set to null (ON DELETE SET NULL)
    // Child folders will be cascade deleted (ON DELETE CASCADE)
    await prisma.noteFolder.delete({
      where: { id },
    });

    return success({ deleted: true });
  } catch (error) {
    return handleApiError(error, { route: '/api/note-folders/[id]', userId: user?.id });
  }
}

// Helper to check if targetId is a descendant of folderId
async function checkIsDescendant(folderId: string, targetId: string, userId: string): Promise<boolean> {
  const children = await prisma.noteFolder.findMany({
    where: { parentId: folderId, userId },
    select: { id: true },
  });

  for (const child of children) {
    if (child.id === targetId) {
      return true;
    }
    const isDescendant = await checkIsDescendant(child.id, targetId, userId);
    if (isDescendant) {
      return true;
    }
  }

  return false;
}
