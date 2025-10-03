import { NextRequest, NextResponse } from "next/server";
import { recentCards } from "@/lib/server/cards";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const parsedLimit = Number.parseInt(searchParams.get("limit") ?? "6", 10);
    const limit = Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 6 : parsedLimit;
    const cards = await recentCards(limit);
    return NextResponse.json(cards);
  } catch (error) {
    console.error("Failed to fetch recent cards:", error);
    return NextResponse.json({ error: "Failed to fetch recent cards" }, { status: 500 });
  }
}
