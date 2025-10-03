import { NextRequest, NextResponse } from "next/server";
import { restoreCard } from "@/lib/server/cards";
import { handleApiError } from "@/lib/utils/api-error";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(_request: NextRequest, segmentData: RouteParams) {
  try {
    const params = await segmentData.params;
    await restoreCard(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
