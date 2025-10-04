import { NextResponse } from "next/server";
import { getOldCards } from "@/lib/server/cards";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const oldCardsResult = await getOldCards(user.id);

    return NextResponse.json(oldCardsResult);
  } catch (error) {
    return handleApiError(error);
  }
}
