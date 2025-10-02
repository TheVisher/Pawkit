import { NextRequest, NextResponse } from "next/server";
import { createCollection, listCollections } from "@/lib/server/collections";

export async function GET() {
  try {
    const result = await listCollections();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ message: (error as Error).message }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const collection = await createCollection(body);
    return NextResponse.json(collection, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: (error as Error).message }, { status: 400 });
  }
}
