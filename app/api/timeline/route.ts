import { NextRequest, NextResponse } from "next/server";
import { getTimelineCards } from "@/lib/server/cards";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";
import { unauthorized, success } from "@/lib/utils/api-responses";

export async function GET(request: NextRequest) {
  let user;
  try {
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30", 10);

    // Validate days parameter
    const validDays = [7, 30, 90, 180, 365];
    const selectedDays = validDays.includes(days) ? days : 30;

    const groups = await getTimelineCards(user.id, selectedDays);

    return success({ groups });
  } catch (error) {
    return handleApiError(error, { route: '/api/timeline', userId: user?.id });
  }
}
