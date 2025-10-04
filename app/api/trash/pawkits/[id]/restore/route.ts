import { NextRequest, NextResponse } from "next/server";
import { restoreCollection } from "@/lib/server/collections";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(_request: NextRequest, segmentData: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await segmentData.params;
    await restoreCollection(user.id, params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
