import { NextRequest, NextResponse } from "next/server";
import { deleteCollection, updateCollection } from "@/lib/server/collections";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";
import { unauthorized, success } from "@/lib/utils/api-responses";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function PATCH(request: NextRequest, segmentData: RouteParams) {
  let user;
  try {
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const params = await segmentData.params;
    const body = await request.json();
    const collection = await updateCollection(user.id, params.id, body);
    return success(collection);
  } catch (error) {
    return handleApiError(error, { route: '/api/pawkits/[id]', userId: user?.id });
  }
}

export async function DELETE(request: NextRequest, segmentData: RouteParams) {
  let user;
  try {
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const params = await segmentData.params;
    const { searchParams } = new URL(request.url);
    const deleteCards = searchParams.get('deleteCards') === 'true';
    const deleteSubPawkits = searchParams.get('deleteSubPawkits') === 'true';

    await deleteCollection(user.id, params.id, deleteCards, deleteSubPawkits);
    return success({ ok: true });
  } catch (error) {
    return handleApiError(error, { route: '/api/pawkits/[id]', userId: user?.id });
  }
}
