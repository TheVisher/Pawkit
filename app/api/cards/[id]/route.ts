import { NextRequest, NextResponse } from "next/server";
import { deleteCard, getCard, updateCard } from "@/lib/server/cards";

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const card = await getCard(params.id);
    if (!card) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }
    return NextResponse.json(card);
  } catch (error) {
    return NextResponse.json({ message: (error as Error).message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json();
    const card = await updateCard(params.id, body);
    return NextResponse.json(card);
  } catch (error) {
    return NextResponse.json({ message: (error as Error).message }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    await deleteCard(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ message: (error as Error).message }, { status: 400 });
  }
}
