import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { prisma } from "@/lib/server/prisma";

export async function POST() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Reset displayOverrides to null for all cards belonging to this user
    await prisma.card.updateMany({
      where: {
        userId: user.id,
        deleted: false
      },
      data: {
        displayOverrides: null
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to reset display overrides:", error);
    return NextResponse.json(
      { error: "Failed to reset display overrides" },
      { status: 500 }
    );
  }
}
