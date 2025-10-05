import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";
import { prisma } from "@/lib/server/prisma";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile from database
    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true, displayName: true }
    });

    return NextResponse.json({
      email: user.email,
      displayName: profile?.displayName || null
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { displayName } = body;

    // Update user profile
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { displayName: displayName || null },
      select: { email: true, displayName: true }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
