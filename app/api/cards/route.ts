import { NextRequest, NextResponse } from "next/server";
import { createCard, listCards, fetchAndUpdateCardMetadata } from "@/lib/server/cards";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getUserByExtensionToken, extractTokenFromHeader } from "@/lib/auth/extension-auth";
import { rateLimit, getRateLimitHeaders } from "@/lib/utils/rate-limit";
import { isAllowedExtensionOrigin } from "@/lib/config/extension-config";
import { unauthorized, rateLimited, success, created, ErrorCodes } from "@/lib/utils/api-responses";

// Force Node.js runtime for Prisma compatibility
export const runtime = 'nodejs';

/**
 * Generate CORS headers based on request origin
 * Only allows requests from the same origin or authorized browser extensions
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

  // Allow authorized browser extension requests only
  if (isAllowedExtensionOrigin(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
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

/**
 * Helper to add CORS headers to a NextResponse
 */
function withCorsHeaders(response: NextResponse, headers: HeadersInit): NextResponse {
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value as string);
  });
  return response;
}

// Handle preflight requests
export async function OPTIONS(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function GET(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  let user;

  try {
    user = await getAuthenticatedUser(request);
    if (!user) {
      return withCorsHeaders(unauthorized(), corsHeaders);
    }

    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());
    const statusParam = query.status;
    const status = statusParam && ["PENDING", "READY", "ERROR"].includes(statusParam) ? statusParam as "PENDING" | "READY" | "ERROR" : undefined;

    const includeDeletedParam = query.includeDeleted;
    const includeDeleted = includeDeletedParam === 'true';

    const payload = {
      q: query.q,
      collection: query.collection,
      status,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
      cursor: query.cursor,
      includeDeleted
    };


    const result = await listCards(user.id, payload);

    return withCorsHeaders(success(result), corsHeaders);
  } catch (error) {
    return handleApiError(error, { route: '/api/cards', userId: user?.id });
  }
}

export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  let user;

  try {
    user = await getAuthenticatedUser(request);
    if (!user) {
      return withCorsHeaders(unauthorized(), corsHeaders);
    }

    // Rate limiting: 60 card creations per minute per user
    const rateLimitResult = rateLimit({
      identifier: `card-create:${user.id}`,
      limit: 60,
      windowMs: 60000, // 1 minute
    });

    const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);

    if (!rateLimitResult.allowed) {
      return withCorsHeaders(
        rateLimited('Too many card creations. Please try again later.'),
        { ...corsHeaders, ...rateLimitHeaders }
      );
    }

    const body = await request.json();
    const card = await createCard(user.id, body);

    // Auto-fetch metadata for URL cards created via extension
    if (body.source === 'webext' && card.type === 'url' && card.url) {
      // Trigger metadata fetch in background (don't await to avoid blocking response)
      fetchAndUpdateCardMetadata(card.id, card.url).catch(err => {
      });
    }

    return withCorsHeaders(created(card), { ...corsHeaders, ...rateLimitHeaders });
  } catch (error) {
    // Handle duplicate URL detection
    if (error instanceof Error && error.message?.startsWith('DUPLICATE_URL:')) {
      const cardId = error.message.split(':')[1];
      return withCorsHeaders(
        NextResponse.json(
          {
            error: 'Duplicate URL',
            code: 'DUPLICATE_URL',
            existingCardId: cardId !== 'unknown' ? cardId : undefined
          },
          { status: 409 }
        ),
        corsHeaders
      );
    }

    return handleApiError(error, { route: '/api/cards', userId: user?.id });
  }
}
