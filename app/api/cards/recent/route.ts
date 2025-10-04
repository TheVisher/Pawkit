import { NextRequest, NextResponse } from "next/server";
import { recentCards } from "@/lib/server/cards";
import { getCurrentUser } from "@/lib/auth/get-user";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const parsedLimit = Number.parseInt(searchParams.get("limit") ?? "6", 10);
    const limit = Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 6 : parsedLimit;
    const cards = await recentCards(user.id, limit);
    return NextResponse.json(cards);
  } catch (error) {
    console.error("Failed to fetch recent cards:", error);
    return NextResponse.json({ error: "Failed to fetch recent cards" }, { status: 500 });
  }
}
