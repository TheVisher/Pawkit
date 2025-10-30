import { NextRequest, NextResponse } from "next/server";
import { createCollection, listCollections } from "@/lib/server/collections";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";
import { unauthorized, success, created } from "@/lib/utils/api-responses";

export async function GET() {
  let user;
  try {
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const result = await listCollections(user.id);
    return success(result);
  } catch (error) {
    return handleApiError(error, { route: '/api/pawkits', userId: user?.id });
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
    const collection = await createCollection(user.id, body);
    return created(collection);
  } catch (error) {
    return handleApiError(error, { route: '/api/pawkits', userId: user?.id });
  }
}
