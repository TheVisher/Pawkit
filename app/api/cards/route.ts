import { NextRequest, NextResponse } from "next/server";
import { createCard, listCards, fetchAndUpdateCardMetadata } from "@/lib/server/cards";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getUserByExtensionToken, extractTokenFromHeader } from "@/lib/auth/extension-auth";

// CORS headers for extension requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

async function getAuthenticatedUser(request: NextRequest) {
  // Try extension token first (from Authorization header)
  const authHeader = request.headers.get('Authorization')
  if (authHeader) {
    const token = extractTokenFromHeader(authHeader)
    if (token) {
      const user = await getUserByExtensionToken(token)
      if (user) {
        return user
      }
    }
  }

  // Fall back to session auth
  return getCurrentUser()
}

// Handle preflight requests
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
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
    return NextResponse.json(result, { headers: corsHeaders });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    const body = await request.json();
    const card = await createCard(user.id, body);

    // Auto-fetch metadata for URL cards created via extension
    if (body.source === 'webext' && card.type === 'url' && card.url) {
      // Trigger metadata fetch in background (don't await to avoid blocking response)
      fetchAndUpdateCardMetadata(card.id, card.url).catch(err => {
        console.error('Background metadata fetch failed:', err);
      });
    }

    return NextResponse.json(card, { status: 201, headers: corsHeaders });
  } catch (error) {
    return handleApiError(error);
  }
}
