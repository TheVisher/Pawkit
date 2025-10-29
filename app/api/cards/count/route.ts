import { NextResponse } from "next/server";
import { countCards } from "@/lib/server/cards";
import { getCurrentUser } from "@/lib/auth/get-user";
import { handleApiError } from "@/lib/utils/api-error";
import { unauthorized, success } from "@/lib/utils/api-responses";

export async function GET() {
  let user;
  try {
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const counts = await countCards(user.id);
    return success(counts);
  } catch (error) {
    return handleApiError(error, { route: '/api/cards/count', userId: user?.id });
  }
}
