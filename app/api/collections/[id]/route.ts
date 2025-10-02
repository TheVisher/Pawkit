import { NextRequest, NextResponse } from "next/server";
import { deleteCollection, updateCollection } from "@/lib/server/collections";

interface RouteParams {
  params: {
    id: string;
  };
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json();
    const collection = await updateCollection(params.id, body);
    return NextResponse.json(collection);
  } catch (error) {
    return NextResponse.json({ message: (error as Error).message }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    await deleteCollection(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ message: (error as Error).message }, { status: 400 });
  }
}
