import { NextRequest, NextResponse } from "next/server";
import { getDigUpCards, type DigUpFilterMode } from "@/lib/server/cards";
import { handleApiError } from "@/lib/utils/api-error";
import { unauthorized, success } from "@/lib/utils/api-responses";
import { getCurrentUser } from "@/lib/auth/get-user";

export async function GET(request: NextRequest) {
  let user;
  try {
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") || "uncategorized";
    const cursor = searchParams.get("cursor") || undefined;
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await getDigUpCards({
      userId: user.id,
      filterMode: mode as DigUpFilterMode,
      cursor,
      limit
    });

    return success(result);
  } catch (error) {
    return handleApiError(error, { route: '/api/distill', userId: user?.id });
  }
}
