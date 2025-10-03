import { NextResponse } from "next/server";
import { countCards } from "@/lib/server/cards";

export async function GET() {
  try {
    const counts = await countCards();
    return NextResponse.json(counts);
  } catch (error) {
    console.error("Failed to count cards:", error);
    return NextResponse.json({ error: "Failed to count cards" }, { status: 500 });
  }
}
