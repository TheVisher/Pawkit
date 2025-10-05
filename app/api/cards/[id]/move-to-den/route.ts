import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";
import { prisma } from "@/lib/server/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    // Update card to be in The Den
    const updatedCard = await prisma.card.update({
      where: {
        id,
        userId: user.id
      },
      data: {
        inDen: true
      }
    });

    return NextResponse.json(updatedCard);
  } catch (error) {
    return handleApiError(error);
  }
}
