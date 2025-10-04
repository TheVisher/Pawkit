import { NextResponse } from "next/server";
import { countCards } from "@/lib/server/cards";
import { getCurrentUser } from "@/lib/auth/get-user";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const counts = await countCards(user.id);
    return NextResponse.json(counts);
  } catch (error) {
    console.error("Failed to count cards:", error);
    return NextResponse.json({ error: "Failed to count cards" }, { status: 500 });
  }
}
