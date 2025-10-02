import { NextRequest, NextResponse } from "next/server";
import { createCollection, listCollections } from "@/lib/server/collections";
import { handleApiError } from "@/lib/utils/api-error";

export async function GET() {
  try {
    const result = await listCollections();
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const collection = await createCollection(body);
    return NextResponse.json(collection, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
