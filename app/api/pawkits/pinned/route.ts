import { NextRequest, NextResponse } from "next/server";
import { pinnedCollections } from "@/lib/server/collections";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "8");
    const collections = await pinnedCollections(limit);
    return NextResponse.json(collections);
  } catch (error) {
    console.error("Failed to fetch pinned collections:", error);
    return NextResponse.json({ error: "Failed to fetch pinned collections" }, { status: 500 });
  }
}
