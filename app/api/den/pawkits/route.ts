import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { prisma } from "@/lib/server/prisma";
import { handleApiError } from "@/lib/utils/api-error";
import slugify from "slugify";

// GET /api/den/pawkits - Get all Den Pawkits
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const collections = await prisma.collection.findMany({
      where: {
        userId: user.id,
        deleted: false,
        inDen: true
      },
      orderBy: [
        { pinned: "desc" },
        { createdAt: "asc" }
      ]
    });

    return NextResponse.json({ collections });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/den/pawkits - Create a new Den Pawkit
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Generate slug from name
    const baseSlug = slugify(name, { lower: true, strict: true });
    let slug = `den-${baseSlug}`;
    let counter = 1;

    // Ensure slug is unique
    while (await prisma.collection.findUnique({ where: { slug } })) {
      slug = `den-${baseSlug}-${counter}`;
      counter++;
    }

    const collection = await prisma.collection.create({
      data: {
        name: name.trim(),
        slug,
        userId: user.id,
        inDen: true
      }
    });

    return NextResponse.json(collection, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
