import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/server/prisma";
import { getCurrentUser } from "@/lib/auth/get-user";
import { handleApiError } from "@/lib/utils/api-error";
import { unauthorized, notFound, validationError, success, rateLimited } from "@/lib/utils/api-responses";
import { rateLimit, getRateLimitHeaders } from "@/lib/utils/rate-limit";
import { SUMMARIZE_PROMPT } from "@/lib/ai/kit-prompts";
import { getModel } from "@/lib/ai/kit-config";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

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

    // Rate limiting: 30 summarizations per minute per user
    const rateLimitResult = rateLimit({
      identifier: `summarize:${user.id}`,
      limit: 30,
      windowMs: 60000, // 1 minute
    });

    if (!rateLimitResult.allowed) {
      const response = rateLimited('Too many summarization requests. Please try again later.');
      Object.entries(getRateLimitHeaders(rateLimitResult)).forEach(([key, value]) => {
        response.headers.set(key, value as string);
      });
      return response;
    }

    const { id } = await params;
    const body = await request.json();
    const { content: providedContent } = body;

    // Get the card
    const card = await prisma.card.findFirst({
      where: { id, userId: user.id }
    });

    if (!card) {
      return notFound('Card');
    }

    // Use provided content or build from card data
    let contentToSummarize = providedContent;

    if (!contentToSummarize) {
      // Build content based on card type
      if (card.articleContent) {
        contentToSummarize = card.articleContent;
      } else if (card.content) {
        contentToSummarize = card.content;
      } else {
        contentToSummarize = [card.title, card.description].filter(Boolean).join('\n\n');
      }
    }

    if (!contentToSummarize || contentToSummarize.trim().length < 20) {
      return validationError('Not enough content to summarize. Try extracting the article first or adding some notes.');
    }

    // Build the prompt
    const userMessage = `Title: ${card.title || 'Untitled'}
${card.url ? `URL: ${card.url}` : ''}

Content to summarize:
${contentToSummarize.slice(0, 6000)}${contentToSummarize.length > 6000 ? '\n\n[Content truncated...]' : ''}`;

    // Call Anthropic API
    const response = await anthropic.messages.create({
      model: getModel('fast'),
      max_tokens: 300,
      system: SUMMARIZE_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const summary = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('');

    // Save summary to the card
    await prisma.card.update({
      where: { id, userId: user.id },
      data: { summary }
    });

    return success({
      summary,
      cardId: id,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      }
    });
  } catch (error) {
    return handleApiError(error, { route: '/api/cards/[id]/summarize', userId: user?.id });
  }
}
