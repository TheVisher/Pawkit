import { NextRequest, NextResponse } from "next/server";
import { listCards } from "@/lib/server/cards";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || undefined;

    // Fetch only note cards (md-note or text-note)
    const { items: mdNotes } = await listCards(user.id, {
      q,
      type: "md-note",
      limit: 50
    });

    const { items: textNotes } = await listCards(user.id, {
      q,
      type: "text-note",
      limit: 50
    });

    // Combine and sort by creation date
    const allNotes = [...mdNotes, ...textNotes].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({ items: allNotes });
  } catch (error) {
    return handleApiError(error);
  }
}
