import { NextRequest, NextResponse } from "next/server";
import { exportData, importData } from "@/lib/server/import";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";
import { unauthorized, success } from "@/lib/utils/api-responses";

export async function GET(request: NextRequest) {
  let user;
  try {
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const includeDen = searchParams.get('includeDen') === 'true';

    const data = await exportData(user.id, includeDen);
    return success(data);
  } catch (error) {
    return handleApiError(error, { route: '/api/import', userId: user?.id });
  }
}

export async function POST(request: NextRequest) {
  let user;
  try {
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const body = await request.json();
    const result = await importData(user.id, body);
    return success(result);
  } catch (error) {
    return handleApiError(error, { route: '/api/import', userId: user?.id });
  }
}
