import { NextRequest, NextResponse } from "next/server";
import { quickAccessCards } from "@/lib/server/cards";
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
    const parsedLimit = Number.parseInt(searchParams.get("limit") ?? "8", 10);
    const limit = Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 8 : parsedLimit;
    const cards = await quickAccessCards(user.id, limit);
    return success(cards);
  } catch (error) {
    return handleApiError(error, { route: '/api/cards/quick-access', userId: user?.id });
  }
}
