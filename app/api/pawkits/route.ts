import { NextRequest, NextResponse } from "next/server";
import { createCollection, listCollections } from "@/lib/server/collections";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await listCollections(user.id);
    return NextResponse.json(result);
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
    const collection = await createCollection(user.id, body);
    return NextResponse.json(collection, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
