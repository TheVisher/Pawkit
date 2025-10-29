import { NextRequest, NextResponse } from "next/server";
import { recentCards } from "@/lib/server/cards";
import { getCurrentUser } from "@/lib/auth/get-user";
import { handleApiError } from "@/lib/utils/api-error";
import { unauthorized, success } from "@/lib/utils/api-responses";

export async function GET(request: NextRequest) {
  let user;
  try {
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const searchParams = request.nextUrl.searchParams;
    const parsedLimit = Number.parseInt(searchParams.get("limit") ?? "6", 10);
    const limit = Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 6 : parsedLimit;
    const cards = await recentCards(user.id, limit);
    return success(cards);
  } catch (error) {
    return handleApiError(error, { route: '/api/cards/recent', userId: user?.id });
  }
}
