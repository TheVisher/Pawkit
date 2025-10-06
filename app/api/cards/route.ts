import { NextRequest, NextResponse } from "next/server";
import { createCard, listCards, fetchAndUpdateCardMetadata } from "@/lib/server/cards";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getUserByExtensionToken, extractTokenFromHeader } from "@/lib/auth/extension-auth";
import { rateLimit, getRateLimitHeaders } from "@/lib/utils/rate-limit";

/**
 * Generate CORS headers based on request origin
 * Only allows requests from the same origin or browser extensions
 */
function getCorsHeaders(request: NextRequest): HeadersInit {
  const origin = request.headers.get('origin') || '';
  const requestUrl = new URL(request.url);

  // Allow same-origin requests (web app)
  if (origin === requestUrl.origin) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    };
  }

  // Allow browser extension requests (chrome-extension:// or moz-extension://)
  if (origin.startsWith('chrome-extension://') || origin.startsWith('moz-extension://')) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
  }

  // Default: no CORS for unknown origins (will fail in browser)
  return {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
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
  const corsHeaders = getCorsHeaders(request);
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function GET(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);

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
  const corsHeaders = getCorsHeaders(request);

  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    // Rate limiting: 60 card creations per minute per user
    const rateLimitResult = rateLimit({
      identifier: `card-create:${user.id}`,
      limit: 60,
      windowMs: 60000, // 1 minute
    });

    const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: { ...corsHeaders, ...rateLimitHeaders }
        }
      );
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

    return NextResponse.json(card, {
      status: 201,
      headers: { ...corsHeaders, ...rateLimitHeaders }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
