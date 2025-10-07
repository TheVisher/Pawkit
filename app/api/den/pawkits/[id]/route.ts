import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { prisma } from "@/lib/server/prisma";
import { handleApiError } from "@/lib/utils/api-error";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// PATCH /api/den/pawkits/[id] - Update a Den Pawkit
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { name } = body;

    // Verify ownership and that it's a Den Pawkit
    const existing = await prisma.collection.findUnique({
      where: { id }
    });

    if (!existing || existing.userId !== user.id || !existing.inDen) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.collection.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() })
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/den/pawkits/[id] - Delete a Den Pawkit
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { deleteCards } = body;

    // Verify ownership and that it's a Den Pawkit
    const existing = await prisma.collection.findUnique({
      where: { id }
    });

    if (!existing || existing.userId !== user.id || !existing.inDen) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Delete the collection
    await prisma.collection.delete({
      where: { id }
    });

    // If deleteCards is true, delete all cards in this collection
    if (deleteCards) {
      await prisma.card.deleteMany({
        where: {
          userId: user.id,
          collections: {
            contains: existing.slug
          }
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
