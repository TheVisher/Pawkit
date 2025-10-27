import { NextRequest, NextResponse } from "next/server";
import { deleteCollection, updateCollection } from "@/lib/server/collections";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function PATCH(request: NextRequest, segmentData: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await segmentData.params;
    const body = await request.json();
    const collection = await updateCollection(user.id, params.id, body);
    return NextResponse.json(collection);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, segmentData: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await segmentData.params;
    const { searchParams } = new URL(request.url);
    const deleteCards = searchParams.get('deleteCards') === 'true';
    const deleteSubPawkits = searchParams.get('deleteSubPawkits') === 'true';

    await deleteCollection(user.id, params.id, deleteCards, deleteSubPawkits);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
