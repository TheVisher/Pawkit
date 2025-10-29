import { NextRequest, NextResponse } from "next/server";
import { restoreCollection } from "@/lib/server/collections";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";
import { unauthorized, success } from "@/lib/utils/api-responses";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(_request: NextRequest, segmentData: RouteParams) {
  let user;
  try {
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const params = await segmentData.params;
    const result = await restoreCollection(user.id, params.id);
    return success({
      ok: true,
      message: 'Pawkit restored successfully',
      restoredToRoot: result.restoredToRoot
    });
  } catch (error) {
    return handleApiError(error, { route: '/api/trash/pawkits/[id]/restore', userId: user?.id });
  }
}
