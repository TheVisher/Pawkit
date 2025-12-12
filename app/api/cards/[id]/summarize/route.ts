import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { YoutubeTranscript } from "youtube-transcript";
import { prisma } from "@/lib/server/prisma";
import { getCurrentUser } from "@/lib/auth/get-user";
import { handleApiError } from "@/lib/utils/api-error";
import { unauthorized, notFound, validationError, success, rateLimited } from "@/lib/utils/api-responses";
import { rateLimit, getRateLimitHeaders } from "@/lib/utils/rate-limit";
import { getModel } from "@/lib/ai/kit-config";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Summary type prompts
const CONCISE_PROMPT = `Summarize this content in 2-3 sentences. Be direct and concise. Focus on the main point and key takeaway. Do not include the title or use any markdown formatting. Write in plain text.`;

const DETAILED_PROMPT = `Provide a comprehensive summary covering the key points, main arguments, and important details. Structure your response clearly but use plain text without markdown formatting. Do not repeat the title. Aim for 4-6 sentences that capture the essential information.`;

/**
 * Fetch and extract article content from a URL using Readability
 */
async function fetchArticleContent(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Pawkit/1.0; +https://pawkit.app)',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      console.error(`Failed to fetch URL: ${response.status}`);
      return null;
    }

    const html = await response.text();
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    return article?.textContent?.trim() || null;
  } catch (error) {
    console.error('Failed to fetch article:', error);
    return null;
  }
}

/**
 * Fetch Twitter/X post content using oEmbed API
 */
async function fetchTwitterContent(url: string): Promise<string | null> {
  try {
    // Use Twitter's oEmbed endpoint
    const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true`;
    const response = await fetch(oembedUrl, {
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      console.error(`Failed to fetch tweet: ${response.status}`);
      return null;
    }

    const data = await response.json();

    // Extract text from the HTML embed
    if (data.html) {
      const dom = new JSDOM(data.html);
      const tweetText = dom.window.document.body.textContent?.trim();
      if (tweetText) {
        // Include author name for context
        return data.author_name ? `${data.author_name}: ${tweetText}` : tweetText;
      }
    }

    return null;
  } catch (error) {
    console.error('Failed to fetch tweet:', error);
    return null;
  }
}

/**
 * Check if URL is a Twitter/X URL
 */
function isTwitterUrl(url: string): boolean {
  return url.includes('twitter.com') || url.includes('x.com');
}

/**
 * Check if URL is a YouTube URL
 */
function isYouTubeUrl(url: string): boolean {
  return url.includes('youtube.com') || url.includes('youtu.be');
}

/**
 * Extract YouTube video ID from URL
 */
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Fetch YouTube video transcript
 */
async function fetchYouTubeContent(url: string): Promise<string | null> {
  try {
    // Extract video ID from URL
    const videoId = extractYouTubeId(url);
    if (!videoId) {
      console.log('[YouTube] Could not extract video ID from:', url);
      return null;
    }

    console.log('[YouTube] Fetching transcript for:', videoId);

    // Fetch transcript
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);

    if (!transcript || transcript.length === 0) {
      console.log('[YouTube] No transcript available');
      return null;
    }

    // Combine transcript segments into full text
    const fullText = transcript
      .map(segment => segment.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    console.log('[YouTube] Transcript length:', fullText.length);

    // Limit to ~8000 chars to avoid token limits
    return fullText.slice(0, 8000);
  } catch (error) {
    console.error('[YouTube] Transcript error:', error);
    return null;
  }
}

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
    const { content: providedContent, type = 'concise' } = body;

    // Validate summary type
    const summaryType = type === 'detailed' ? 'detailed' : 'concise';

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

    // If still not enough content and we have a URL, try to fetch it
    if ((!contentToSummarize || contentToSummarize.trim().length < 50) && card.url) {
      console.log(`[Summarize] Fetching content from URL: ${card.url}`);

      let fetchedContent: string | null = null;

      if (isYouTubeUrl(card.url)) {
        // Fetch YouTube transcript
        fetchedContent = await fetchYouTubeContent(card.url);
      } else if (isTwitterUrl(card.url)) {
        fetchedContent = await fetchTwitterContent(card.url);
      } else {
        fetchedContent = await fetchArticleContent(card.url);
      }

      if (fetchedContent && fetchedContent.length > 50) {
        contentToSummarize = fetchedContent;

        // Optionally save the fetched content as articleContent for future use
        await prisma.card.update({
          where: { id, userId: user.id },
          data: { articleContent: fetchedContent.slice(0, 50000) } // Limit size
        });
      }
    }

    // Fallback for YouTube videos without transcripts: use title + description
    if ((!contentToSummarize || contentToSummarize.trim().length < 20) && card.url && isYouTubeUrl(card.url)) {
      if (card.title) {
        contentToSummarize = `Video: ${card.title}${card.description ? '\n\nDescription: ' + card.description : ''}`;
        console.log('[YouTube] Using title/description fallback');
      }
    }

    if (!contentToSummarize || contentToSummarize.trim().length < 20) {
      return validationError('No content available to summarize. The page may be protected or require authentication.');
    }

    // Select prompt based on type
    const systemPrompt = summaryType === 'detailed' ? DETAILED_PROMPT : CONCISE_PROMPT;

    // Build the prompt
    const userMessage = `Title: ${card.title || 'Untitled'}
${card.url ? `URL: ${card.url}` : ''}

Content to summarize:
${contentToSummarize.slice(0, 6000)}${contentToSummarize.length > 6000 ? '\n\n[Content truncated...]' : ''}`;

    // Call Anthropic API - use more tokens for detailed summaries
    const response = await anthropic.messages.create({
      model: getModel('fast'),
      max_tokens: summaryType === 'detailed' ? 500 : 200,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const summary = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('');

    // Save summary and type to the card
    await prisma.card.update({
      where: { id, userId: user.id },
      data: { summary, summaryType }
    });

    return success({
      summary,
      summaryType,
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
