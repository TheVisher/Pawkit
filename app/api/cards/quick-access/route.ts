import { NextRequest, NextResponse } from "next/server";
import { quickAccessCards } from "@/lib/server/cards";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "8");
    const cards = await quickAccessCards(limit);
    return NextResponse.json(cards);
  } catch (error) {
    console.error("Failed to fetch quick access cards:", error);
    return NextResponse.json({ error: "Failed to fetch quick access cards" }, { status: 500 });
  }
}
