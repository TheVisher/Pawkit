import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { prisma } from "@/lib/server/prisma";
import { getCurrentUser } from "@/lib/auth/get-user";
import { handleApiError } from "@/lib/utils/api-error";
import { unauthorized, notFound, validationError, success, rateLimited } from "@/lib/utils/api-responses";
import { rateLimit, getRateLimitHeaders } from "@/lib/utils/rate-limit";
import { getModel } from "@/lib/ai/kit-config";

// Force Node.js runtime for Prisma compatibility
export const runtime = 'nodejs';

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
function isYouTubeUrl(url: string | null | undefined): boolean {
  if (!url) return false;
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
 * Fetch YouTube transcript from the Railway transcript service (PRIMARY METHOD)
 */
async function fetchYouTubeFromRailway(url: string): Promise<string | null> {
  const TRANSCRIPT_SERVICE = process.env.TRANSCRIPT_SERVICE_URL || 'https://web-production-8e544.up.railway.app';

  try {
    console.log('[YouTube] Trying Railway transcript service...');

    const response = await fetch(
      `${TRANSCRIPT_SERVICE}/transcript?url=${encodeURIComponent(url)}`,
      {
        signal: AbortSignal.timeout(30000),  // 30s timeout - yt-dlp can be slow first time
        headers: { 'Accept': 'application/json' }
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.log('[YouTube] Railway service error:', response.status, error);
      return null;
    }

    const data = await response.json();
    console.log('[YouTube] Got transcript from Railway:', data.transcript?.length || 0, 'chars from:', data.title);

    return data.transcript || null;
  } catch (error) {
    console.error('[YouTube] Railway transcript service error:', error);
    return null;
  }
}

/**
 * Try YouTube's timedtext API directly (FALLBACK)
 */
async function fetchYouTubeTimedText(videoId: string): Promise<string | null> {
  // Try different language codes including auto-generated
  const languages = ['en', 'en-US', 'en-GB', 'a.en']; // a.en = auto-generated English

  for (const lang of languages) {
    try {
      // Try the timedtext endpoint with different formats
      const urls = [
        `https://www.youtube.com/api/timedtext?lang=${lang}&v=${videoId}&fmt=srv3`,
        `https://www.youtube.com/api/timedtext?lang=${lang}&v=${videoId}`,
        `https://video.google.com/timedtext?lang=${lang}&v=${videoId}`,
      ];

      for (const url of urls) {
        console.log('[YouTube] Trying timedtext:', lang, url.split('?')[0]);

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          signal: AbortSignal.timeout(5000),
        });

        if (!response.ok) {
          continue;
        }

        const xml = await response.text();
        console.log('[YouTube] Timedtext response length:', xml.length);

        if (xml.includes('<text')) {
          // Parse the XML
          const matches = [...xml.matchAll(/<text[^>]*>([^<]*)<\/text>/g)];
          console.log('[YouTube] Found text segments:', matches.length);

          if (matches.length > 0) {
            const transcript = matches
              .map(m => m[1]
                .replace(/&amp;/g, '&')
                .replace(/&#39;/g, "'")
                .replace(/&quot;/g, '"')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/\n/g, ' ')
                .trim()
              )
              .filter(Boolean)
              .join(' ')
              .replace(/\s+/g, ' ')
              .trim();

            if (transcript.length > 100) {
              console.log('[YouTube] Got transcript from timedtext:', transcript.length, 'chars');
              return transcript.slice(0, 10000);
            }
          }
        }
      }
    } catch (e) {
      console.log('[YouTube] Timedtext error for', lang, ':', e);
    }
  }

  console.log('[YouTube] All timedtext attempts failed');
  return null;
}

/**
 * Fetch YouTube video transcript using multiple methods
 */
async function fetchYouTubeContent(url: string): Promise<string | null> {
  const videoId = extractYouTubeId(url);
  if (!videoId) {
    console.log('[YouTube] Could not extract video ID');
    return null;
  }

  console.log('[YouTube] Fetching transcript for video:', videoId);

  // Try Railway service first (most reliable with yt-dlp)
  const railwayResult = await fetchYouTubeFromRailway(url);
  if (railwayResult && railwayResult.length > 100) {
    return railwayResult.slice(0, 10000);
  }

  console.log('[YouTube] Railway failed, trying timedtext API...');

  // Fallback to timedtext API
  const timedTextResult = await fetchYouTubeTimedText(videoId);
  if (timedTextResult) {
    return timedTextResult;
  }

  console.log('[YouTube] All methods failed');
  return null;
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
    let isYouTube = card.url ? isYouTubeUrl(card.url) : false;
    let transcriptAvailable = false;

    console.log('[Summarize] ========== START ==========');
    console.log('[Summarize] Provided content:', providedContent ? `${providedContent.length} chars` : 'none');
    console.log('[Summarize] Card URL:', card.url);
    console.log('[Summarize] Is YouTube URL:', isYouTube);
    console.log('[Summarize] card.url && isYouTube:', !!(card.url && isYouTube));

    // For YouTube URLs, ALWAYS try to fetch transcript first (ignore provided content which is just title/description)
    if (card.url && isYouTube) {
      console.log('[Summarize] >>> ENTERING YOUTUBE BRANCH');
      console.log('[Summarize] About to call fetchYouTubeContent with:', card.url);
      const transcriptContent = await fetchYouTubeContent(card.url);
      console.log('[Summarize] <<< fetchYouTubeContent returned');
      console.log('[Summarize] Transcript result:', transcriptContent ? `${transcriptContent.length} chars` : 'null');

      if (transcriptContent && transcriptContent.length > 50) {
        contentToSummarize = transcriptContent;
        transcriptAvailable = true;
        console.log('[Summarize] Using YouTube transcript');

        // Save transcript as articleContent for future use
        await prisma.card.update({
          where: { id, userId: user.id },
          data: { articleContent: transcriptContent.slice(0, 50000) }
        });
      } else {
        // Fallback to title + description for YouTube without transcript
        console.log('[Summarize] No transcript, using title/description fallback');
        contentToSummarize = `Video Title: ${card.title || 'Unknown'}\n\nDescription: ${card.description || 'No description available'}`;
      }
    } else if (!contentToSummarize) {
      // Non-YouTube: Build content based on card type
      if (card.articleContent) {
        contentToSummarize = card.articleContent;
        console.log('[Summarize] Using articleContent:', contentToSummarize.length, 'chars');
      } else if (card.content) {
        contentToSummarize = card.content;
        console.log('[Summarize] Using card.content:', contentToSummarize.length, 'chars');
      } else {
        contentToSummarize = [card.title, card.description].filter(Boolean).join('\n\n');
        console.log('[Summarize] Using title/description:', contentToSummarize.length, 'chars');
      }
    }

    // For non-YouTube URLs with insufficient content, try to fetch
    console.log('[Summarize] Current content length:', contentToSummarize?.length || 0);

    if ((!contentToSummarize || contentToSummarize.trim().length < 50) && card.url && !isYouTubeUrl(card.url)) {
      console.log(`[Summarize] Content insufficient, fetching from URL: ${card.url}`);

      let fetchedContent: string | null = null;

      if (isTwitterUrl(card.url)) {
        fetchedContent = await fetchTwitterContent(card.url);
      } else {
        fetchedContent = await fetchArticleContent(card.url);
      }

      if (fetchedContent && fetchedContent.length > 50) {
        contentToSummarize = fetchedContent;
        console.log('[Summarize] Using fetched content, length:', fetchedContent.length);

        // Save as articleContent for future use
        await prisma.card.update({
          where: { id, userId: user.id },
          data: { articleContent: fetchedContent.slice(0, 50000) }
        });
      }
    }

    if (!contentToSummarize || contentToSummarize.trim().length < 20) {
      return validationError('No content available to summarize. The page may be protected or require authentication.');
    }

    // Select prompt based on content type and summary type
    let systemPrompt: string;

    if (isYouTube) {
      if (transcriptAvailable) {
        // YouTube with transcript
        systemPrompt = summaryType === 'detailed'
          ? 'Provide a comprehensive summary of this video transcript covering the key points, main arguments, and important details. Use plain text without markdown formatting. Aim for 4-6 sentences.'
          : 'Summarize this video transcript in 2-3 sentences. Be direct and concise. Focus on the main point and key takeaway. Use plain text without markdown.';
      } else {
        // YouTube without transcript - be honest about limitations
        systemPrompt = summaryType === 'detailed'
          ? 'Based on the video title and description provided, explain what this video appears to cover. Note that this summary is based on available metadata since the video transcript is not accessible. Use plain text without markdown.'
          : 'Based on the video title and description provided, give a brief 2-3 sentence overview of what this video appears to be about. Note this is based on metadata only. Use plain text without markdown.';
      }
    } else {
      // Regular content (articles, notes, etc.)
      systemPrompt = summaryType === 'detailed' ? DETAILED_PROMPT : CONCISE_PROMPT;
    }

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

    // Flag to indicate summary is based on limited metadata (YouTube without transcript)
    const limitedSummary = isYouTube && !transcriptAvailable;

    return success({
      summary,
      summaryType,
      limitedSummary,
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
