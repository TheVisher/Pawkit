import { NextRequest, NextResponse } from "next/server";
import { permanentlyDeleteCard } from "@/lib/server/cards";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";
import { unauthorized, success } from "@/lib/utils/api-responses";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function DELETE(_request: NextRequest, segmentData: RouteParams) {
  let user;
  try {
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const params = await segmentData.params;
    await permanentlyDeleteCard(user.id, params.id);
    return success({ ok: true, message: 'Card permanently deleted' });
  } catch (error) {
    return handleApiError(error, { route: '/api/trash/cards/[id]', userId: user?.id });
  }
}
