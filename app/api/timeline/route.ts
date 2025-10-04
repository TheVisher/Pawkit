import { NextRequest, NextResponse } from "next/server";
import { getTimelineCards } from "@/lib/server/cards";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30", 10);

    // Validate days parameter
    const validDays = [7, 30, 90, 180, 365];
    const selectedDays = validDays.includes(days) ? days : 30;

    const groups = await getTimelineCards(user.id, selectedDays);

    return NextResponse.json({ groups });
  } catch (error) {
    return handleApiError(error);
  }
}
