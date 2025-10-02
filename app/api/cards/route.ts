import { NextRequest, NextResponse } from "next/server";
import { createCard, listCards } from "@/lib/server/cards";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());
    const payload = {
      q: query.q,
      collection: query.collection,
      status: query.status,
      limit: query.limit,
      cursor: query.cursor
    };
    const result = await listCards(payload);
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: (error as Error).message }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const card = await createCard(body);
    return NextResponse.json(card, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: (error as Error).message }, { status: 400 });
  }
}
