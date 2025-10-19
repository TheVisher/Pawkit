import { NextRequest, NextResponse } from "next/server";
import { exportData, importData } from "@/lib/server/import";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeDen = searchParams.get('includeDen') === 'true';

    const data = await exportData(user.id, includeDen);
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = await importData(user.id, body);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
