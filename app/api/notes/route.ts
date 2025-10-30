import { NextRequest, NextResponse } from "next/server";
import { listCards } from "@/lib/server/cards";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";
import { unauthorized, success } from "@/lib/utils/api-responses";

export async function GET(request: NextRequest) {
  let user;
  try {
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
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

    return success({ items: allNotes });
  } catch (error) {
    return handleApiError(error, { route: '/api/notes', userId: user?.id });
  }
}
