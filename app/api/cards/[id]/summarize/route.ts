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
 * Fetch YouTube video transcript using Invidious API
 */
async function fetchYouTubeContent(url: string): Promise<string | null> {
  const videoId = extractYouTubeId(url);
  if (!videoId) {
    console.log('[YouTube] Could not extract video ID');
    return null;
  }

  console.log('[YouTube] Fetching transcript for video:', videoId);

  // List of Invidious instances to try (updated list of working instances)
  const instances = [
    'https://yewtu.be',
    'https://vid.puffyan.us',
    'https://invidious.snopyta.org',
    'https://iv.ggtyler.dev',
    'https://invidious.kavin.rocks',
    'https://inv.nadeko.net',
    'https://invidious.nerdvpn.de',
    'https://invidious.privacyredirect.com',
    'https://invidious.slipfox.xyz',
    'https://inv.tux.pizza',
  ];

  for (const instance of instances) {
    try {
      console.log('[YouTube] Trying instance:', instance);

      // First get video info to find available captions
      const videoInfoUrl = `${instance}/api/v1/videos/${videoId}`;
      const infoResponse = await fetch(videoInfoUrl, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000),
      });

      if (!infoResponse.ok) {
        console.log('[YouTube] Video info failed:', infoResponse.status);
        continue;
      }

      const videoInfo = await infoResponse.json();
      const captions = videoInfo.captions;

      if (!captions || captions.length === 0) {
        console.log('[YouTube] No captions available for this video');
        return null; // No captions on any instance
      }

      console.log('[YouTube] Found', captions.length, 'caption tracks');

      // Find English captions, prefer non-auto-generated
      const englishCaptions = captions.filter((c: { language_code?: string }) =>
        c.language_code === 'en' || c.language_code?.startsWith('en')
      );
      const caption = englishCaptions[0] || captions[0];

      if (!caption?.url) {
        console.log('[YouTube] No caption URL found');
        continue;
      }

      console.log('[YouTube] Using caption:', caption.language_code, caption.label);

      // Fetch the actual captions
      const captionUrl = caption.url.startsWith('http')
        ? caption.url
        : `${instance}${caption.url}`;

      const captionResponse = await fetch(captionUrl, {
        signal: AbortSignal.timeout(10000),
      });

      if (!captionResponse.ok) {
        console.log('[YouTube] Caption fetch failed:', captionResponse.status);
        continue;
      }

      const captionData = await captionResponse.text();

      // Parse the caption format (usually VTT or XML)
      let transcript = '';

      if (captionData.includes('WEBVTT')) {
        // Parse VTT format
        const lines = captionData.split('\n');
        const textLines = lines.filter(line =>
          line.trim() &&
          !line.startsWith('WEBVTT') &&
          !line.includes('-->') &&
          !line.match(/^\d+$/) &&
          !line.match(/^\d{2}:\d{2}/)
        );
        transcript = textLines.join(' ');
      } else {
        // Parse XML format
        const matches = [...captionData.matchAll(/<text[^>]*>([^<]*)<\/text>/g)];
        transcript = matches.map(m => m[1]).join(' ');
      }

      // Clean up
      transcript = transcript
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/<[^>]+>/g, '') // Remove any remaining HTML tags
        .replace(/\s+/g, ' ')
        .trim();

      if (transcript.length > 100) {
        console.log('[YouTube] Got transcript:', transcript.length, 'chars');
        console.log('[YouTube] Preview:', transcript.slice(0, 300));
        return transcript.slice(0, 10000);
      }
    } catch (error) {
      console.error('[YouTube] Instance failed:', instance, error);
      continue;
    }
  }

  console.log('[YouTube] All Invidious instances failed, trying direct YouTube...');

  // Fallback: Try fetching directly from YouTube
  try {
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const pageResponse = await fetch(watchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (pageResponse.ok) {
      const html = await pageResponse.text();
      console.log('[YouTube] Got YouTube page, length:', html.length);

      // Try to find ytInitialPlayerResponse with different patterns
      let playerMatch = html.match(/var ytInitialPlayerResponse\s*=\s*(\{.+?\});/s);
      console.log('[YouTube] Pattern 1 (var ytInitialPlayerResponse) match:', !!playerMatch);

      if (!playerMatch) {
        playerMatch = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});/);
        console.log('[YouTube] Pattern 2 (ytInitialPlayerResponse) match:', !!playerMatch);
      }

      if (!playerMatch) {
        // Log debugging info
        const snippetStart = html.indexOf('ytInitialPlayerResponse');
        if (snippetStart > -1) {
          console.log('[YouTube] Found ytInitialPlayerResponse at index:', snippetStart);
          console.log('[YouTube] Snippet:', html.slice(snippetStart, snippetStart + 300));
        } else {
          console.log('[YouTube] ytInitialPlayerResponse not found in page');
        }
        console.log('[YouTube] Has "captions":', html.includes('"captions"'));
        console.log('[YouTube] Has "captionTracks":', html.includes('"captionTracks"'));
        console.log('[YouTube] Has "playerCaptionsTracklistRenderer":', html.includes('playerCaptionsTracklistRenderer'));
      }

      if (playerMatch) {
        try {
          const playerData = JSON.parse(playerMatch[1]);
          console.log('[YouTube] Successfully parsed player response');

          const captionsRenderer = playerData?.captions?.playerCaptionsTracklistRenderer;
          console.log('[YouTube] Has captions renderer:', !!captionsRenderer);

          const captionTracks = captionsRenderer?.captionTracks;
          console.log('[YouTube] Caption tracks found:', captionTracks?.length || 0);

          if (!captionTracks?.length) {
            console.log('[YouTube] No caption tracks available');
            if (playerData?.captions === undefined) {
              console.log('[YouTube] Captions object missing entirely - video may not have captions');
            }
          } else {
            // Log available tracks
            captionTracks.forEach((track: { languageCode?: string; name?: { simpleText?: string }; baseUrl?: string }, i: number) => {
              console.log(`[YouTube] Track ${i}: ${track.languageCode} - ${track.name?.simpleText} - hasUrl: ${!!track.baseUrl}`);
            });

            // Find English track
            const englishTrack = captionTracks.find((t: { languageCode?: string }) =>
              t.languageCode === 'en' || t.languageCode?.startsWith('en')
            );
            const track = englishTrack || captionTracks[0];
            console.log('[YouTube] Selected track:', track?.languageCode);

            if (track?.baseUrl) {
              console.log('[YouTube] Fetching captions from:', track.baseUrl.slice(0, 100));
              const captionResponse = await fetch(track.baseUrl, {
                signal: AbortSignal.timeout(10000),
              });

              console.log('[YouTube] Caption response status:', captionResponse.status);

              if (captionResponse.ok) {
                const captionXml = await captionResponse.text();
                console.log('[YouTube] Caption XML length:', captionXml.length);
                console.log('[YouTube] Caption XML preview:', captionXml.slice(0, 200));

                const matches = [...captionXml.matchAll(/<text[^>]*>([^<]*)<\/text>/g)];
                console.log('[YouTube] Text segments found:', matches.length);

                if (matches.length > 0) {
                  const transcript = matches
                    .map(m => m[1])
                    .join(' ')
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'")
                    .replace(/&nbsp;/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();

                  console.log('[YouTube] Cleaned transcript length:', transcript.length);

                  if (transcript.length > 100) {
                    console.log('[YouTube] Direct fetch successful:', transcript.length, 'chars');
                    console.log('[YouTube] Preview:', transcript.slice(0, 300));
                    return transcript.slice(0, 10000);
                  } else {
                    console.log('[YouTube] Transcript too short:', transcript.length);
                  }
                } else {
                  console.log('[YouTube] No text segments matched in XML');
                }
              } else {
                console.log('[YouTube] Caption fetch failed:', captionResponse.status);
              }
            } else {
              console.log('[YouTube] Selected track has no baseUrl');
            }
          }
        } catch (parseError) {
          console.log('[YouTube] Failed to parse player response:', parseError);
        }
      }
    } else {
      console.log('[YouTube] Page fetch failed:', pageResponse.status);
    }
  } catch (directError) {
    console.error('[YouTube] Direct fetch failed:', directError);
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
