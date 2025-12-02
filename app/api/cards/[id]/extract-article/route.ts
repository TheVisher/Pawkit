import { NextRequest, NextResponse } from "next/server";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { prisma } from "@/lib/server/prisma";
import { getCurrentUser } from "@/lib/auth/get-user";
import { handleApiError } from "@/lib/utils/api-error";
import { unauthorized, notFound, validationError, success, rateLimited } from "@/lib/utils/api-responses";
import { rateLimit, getRateLimitHeaders } from "@/lib/utils/rate-limit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try {
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    // Rate limiting: 20 article extractions per minute per user (CPU-intensive)
    const rateLimitResult = rateLimit({
      identifier: `extract-article:${user.id}`,
      limit: 20,
      windowMs: 60000, // 1 minute
    });

    if (!rateLimitResult.allowed) {
      const response = rateLimited('Too many article extraction requests. Please try again later.');
      Object.entries(getRateLimitHeaders(rateLimitResult)).forEach(([key, value]) => {
        response.headers.set(key, value as string);
      });
      return response;
    }

    const { id } = await params;

    // Get the card
    const card = await prisma.card.findFirst({
      where: { id, userId: user.id }
    });

    if (!card) {
      return notFound('Card');
    }

    // Fetch the HTML content from the URL
    let response;
    try {
      response = await fetch(card.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      });
    } catch (fetchError) {
      return NextResponse.json({
        error: 'Fetch Failed',
        message: 'Failed to fetch article content from the URL',
        code: 'FETCH_FAILED',
      }, { status: 500 });
    }

    if (!response.ok) {
      return NextResponse.json({
        error: 'Fetch Failed',
        message: `Failed to fetch article content (HTTP ${response.status})`,
        code: 'FETCH_FAILED',
      }, { status: 500 });
    }

    const html = await response.text();

    // Parse with JSDOM
    const dom = new JSDOM(html, { url: card.url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      return validationError(
        'Could not extract article content from this page. The page may not contain readable content.',
      );
    }

    // Update the card with the extracted content
    await prisma.card.update({
      where: { id, userId: user.id },
      data: {
        articleContent: article.content,
        // Also update title if it wasn't set
        title: card.title || article.title || card.url
      }
    });

    return success({
      success: true,
      articleContent: article.content,
      title: article.title
    });
  } catch (error) {
    return handleApiError(error, { route: '/api/cards/[id]/extract-article', userId: user?.id });
  }
}
