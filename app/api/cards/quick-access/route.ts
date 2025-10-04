import { NextRequest, NextResponse } from "next/server";
import { quickAccessCards } from "@/lib/server/cards";
import { getCurrentUser } from "@/lib/auth/get-user";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const parsedLimit = Number.parseInt(searchParams.get("limit") ?? "8", 10);
    const limit = Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 8 : parsedLimit;
    const cards = await quickAccessCards(user.id, limit);
    return NextResponse.json(cards);
  } catch (error) {
    console.error("Failed to fetch quick access cards:", error);
    return NextResponse.json({ error: "Failed to fetch quick access cards" }, { status: 500 });
  }
}
