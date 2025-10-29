import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";
import { prisma } from "@/lib/server/prisma";
import { userUpdateSchema } from "@/lib/validators/user";
import { unauthorized, success } from "@/lib/utils/api-responses";

export async function GET() {
  let user;
  try {
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    // Get user profile from database
    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true, displayName: true, serverSync: true }
    });

    return success({
      email: user.email,
      displayName: profile?.displayName || null,
      serverSync: profile?.serverSync ?? true
    });
  } catch (error) {
    return handleApiError(error, { route: '/api/user', userId: user?.id });
  }
}

export async function PATCH(request: Request) {
  let user;
  try {
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const body = await request.json();

    // Validate input
    const validated = userUpdateSchema.parse(body);

    // Build update data object
    const updateData: any = {};
    if (validated.displayName !== undefined) {
      updateData.displayName = validated.displayName || null;
    }
    if (validated.serverSync !== undefined) {
      updateData.serverSync = validated.serverSync;
    }

    // Update user profile
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: { email: true, displayName: true, serverSync: true }
    });

    return success(updated);
  } catch (error) {
    return handleApiError(error, { route: '/api/user', userId: user?.id });
  }
}
