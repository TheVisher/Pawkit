/**
 * Article Extractor Service
 * Simplified extraction matching V1's approach - fast and simple
 */

import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

// Average reading speed (words per minute)
const WORDS_PER_MINUTE = 225;

export interface ArticleContent {
  title: string | null;
  content: string | null;
  textContent: string | null;
  excerpt: string | null;
  byline: string | null;
  siteName: string | null;
  wordCount: number;
  readingTime: number;
  publishedTime: string | null;
}

export interface ExtractionResult {
  success: boolean;
  article: ArticleContent | null;
  error?: string;
}

/**
 * Calculate reading time from word count
 */
export function calculateReadingTime(wordCount: number): number {
  if (wordCount <= 0) return 0;
  return Math.ceil(wordCount / WORDS_PER_MINUTE);
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Pre-process HTML to remove heavy content before JSDOM parsing
 * This dramatically speeds up parsing for bloated pages
 */
function preprocessHtml(html: string): string {
  // Remove script tags and their contents
  let cleaned = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove style tags and their contents
  cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Remove noscript tags
  cleaned = cleaned.replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '');

  // Remove SVG elements (often huge)
  cleaned = cleaned.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '');

  // Remove comments
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');

  // Remove inline event handlers and data attributes (reduces size)
  cleaned = cleaned.replace(/\s+on\w+="[^"]*"/gi, '');
  cleaned = cleaned.replace(/\s+data-[a-z-]+="[^"]*"/gi, '');

  return cleaned;
}

/**
 * Extract article content from a URL
 * With timeout to prevent hanging
 */
export async function extractArticle(url: string): Promise<ExtractionResult> {
  const startTime = Date.now();

  try {
    // Create abort controller with 15 second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    console.log('[ArticleExtractor] Starting fetch for:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: controller.signal,
      // Disable Next.js fetch caching
      cache: 'no-store',
    });

    clearTimeout(timeoutId);
    console.log('[ArticleExtractor] Fetch completed in', Date.now() - startTime, 'ms');

    if (!response.ok) {
      return { success: false, article: null, error: `HTTP ${response.status}` };
    }

    const htmlStart = Date.now();
    const rawHtml = await response.text();
    console.log('[ArticleExtractor] HTML received:', rawHtml.length, 'bytes in', Date.now() - htmlStart, 'ms');

    // Pre-process to remove scripts, styles, etc. before JSDOM
    const preprocessStart = Date.now();
    const html = preprocessHtml(rawHtml);
    console.log('[ArticleExtractor] Preprocessed to:', html.length, 'bytes in', Date.now() - preprocessStart, 'ms');

    // Parse with JSDOM
    const jsdomStart = Date.now();
    const dom = new JSDOM(html, { url });
    console.log('[ArticleExtractor] JSDOM parsed in', Date.now() - jsdomStart, 'ms');

    const readerStart = Date.now();
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    console.log('[ArticleExtractor] Readability parsed in', Date.now() - readerStart, 'ms');

    if (!article) {
      return { success: false, article: null, error: 'Could not extract article content' };
    }

    const wordCount = countWords(article.textContent || '');

    console.log('[ArticleExtractor] Total time:', Date.now() - startTime, 'ms');

    return {
      success: true,
      article: {
        title: article.title || null,
        content: article.content || null,
        textContent: article.textContent || null,
        excerpt: article.excerpt || null,
        byline: article.byline || null,
        siteName: article.siteName || null,
        wordCount,
        readingTime: calculateReadingTime(wordCount),
        publishedTime: null,
      },
    };
  } catch (error) {
    const elapsed = Date.now() - startTime;
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[ArticleExtractor] Timeout after', elapsed, 'ms');
      return { success: false, article: null, error: 'Request timed out' };
    }
    console.error('[ArticleExtractor] Error after', elapsed, 'ms:', error);
    return { success: false, article: null, error: 'Failed to extract article' };
  }
}

/**
 * Check if a URL is likely to have readable article content
 * (Filters out non-article URLs like images, PDFs, etc.)
 */
export function isArticleUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.toLowerCase();

    // Skip direct file URLs
    const nonArticleExtensions = [
      '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico',
      '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
      '.mp3', '.mp4', '.wav', '.avi', '.mov', '.webm',
      '.zip', '.rar', '.tar', '.gz',
      '.js', '.css', '.json', '.xml',
    ];

    if (nonArticleExtensions.some(ext => path.endsWith(ext))) {
      return false;
    }

    // Skip common non-article patterns
    const nonArticlePatterns = [
      /^\/api\//,
      /^\/static\//,
      /^\/assets\//,
      /^\/cdn-cgi\//,
      /\/feed\/?$/,
      /\/rss\/?$/,
    ];

    if (nonArticlePatterns.some(pattern => pattern.test(path))) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
