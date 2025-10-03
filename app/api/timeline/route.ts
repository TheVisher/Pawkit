import { NextRequest, NextResponse } from "next/server";
import { getTimelineCards } from "@/lib/server/cards";
import { handleApiError } from "@/lib/utils/api-error";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30", 10);

    // Validate days parameter
    const validDays = [7, 30, 90, 180, 365];
    const selectedDays = validDays.includes(days) ? days : 30;

    const groups = await getTimelineCards(selectedDays);

    return NextResponse.json({ groups });
  } catch (error) {
    return handleApiError(error);
  }
}
