import { NextRequest, NextResponse } from "next/server";
import { createCard, listCards } from "@/lib/server/cards";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());
    const statusParam = query.status;
    const status = statusParam && ["PENDING", "READY", "ERROR"].includes(statusParam) ? statusParam as "PENDING" | "READY" | "ERROR" : undefined;

    const payload = {
      q: query.q,
      collection: query.collection,
      status,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
      cursor: query.cursor
    };
    const result = await listCards(user.id, payload);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const card = await createCard(user.id, body);
    return NextResponse.json(card, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
