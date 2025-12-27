/**
 * Article Extractor Service
 * Extracts clean article content from URLs using Mozilla Readability
 */

import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

// Standard browser User-Agent to avoid bot blocking
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

// Request timeout (15 seconds - article extraction can be slower)
const FETCH_TIMEOUT = 15000;

// Average reading speed (words per minute)
const WORDS_PER_MINUTE = 225;

export interface ArticleContent {
  title: string | null;
  content: string | null;      // Clean HTML content
  textContent: string | null;  // Plain text (for word count)
  excerpt: string | null;      // Short excerpt/summary
  byline: string | null;       // Author info
  siteName: string | null;     // Site name
  wordCount: number;
  readingTime: number;         // Minutes
  publishedTime: string | null;
}

export interface ExtractionResult {
  success: boolean;
  article: ArticleContent | null;
  error?: string;
}

/**
 * Check if hostname is a private/internal IP address
 * Prevents SSRF attacks
 */
function isPrivateIP(hostname: string): boolean {
  const lowerHost = hostname.toLowerCase();
  const BLOCKED_PATTERNS = [
    '127.', '0.0.0.0', 'localhost',
    '10.',
    '172.16.', '172.17.', '172.18.', '172.19.',
    '172.20.', '172.21.', '172.22.', '172.23.', '172.24.',
    '172.25.', '172.26.', '172.27.', '172.28.', '172.29.',
    '172.30.', '172.31.',
    '192.168.',
    '169.254.',
    '[::1]', 'fe80:', 'fc00:', 'fd00::'
  ];
  return BLOCKED_PATTERNS.some(pattern => lowerHost.startsWith(pattern));
}

/**
 * Calculate word count from text
 */
function countWords(text: string): number {
  if (!text) return 0;
  return text
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0)
    .length;
}

/**
 * Calculate reading time from word count
 */
export function calculateReadingTime(wordCount: number): number {
  if (wordCount <= 0) return 0;
  return Math.ceil(wordCount / WORDS_PER_MINUTE);
}

/**
 * Extract published time from HTML meta tags
 */
function extractPublishedTime(doc: Document): string | null {
  const metaTags = [
    'article:published_time',
    'datePublished',
    'date',
    'DC.date.issued',
    'sailthru.date',
  ];

  for (const tag of metaTags) {
    const meta = doc.querySelector(
      `meta[property="${tag}"], meta[name="${tag}"], meta[itemprop="${tag}"]`
    );
    if (meta) {
      const content = meta.getAttribute('content');
      if (content) return content;
    }
  }

  // Try time element
  const time = doc.querySelector('time[datetime]');
  if (time) {
    return time.getAttribute('datetime');
  }

  return null;
}

/**
 * Extract article content from a URL
 */
export async function extractArticle(url: string): Promise<ExtractionResult> {
  // Validate URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return { success: false, article: null, error: 'Invalid URL format' };
  }

  // SSRF Protection
  if (isPrivateIP(parsedUrl.hostname)) {
    return { success: false, article: null, error: 'Cannot fetch private URLs' };
  }

  // Only allow HTTP(S)
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return { success: false, article: null, error: 'Only HTTP(S) URLs allowed' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return { success: false, article: null, error: `HTTP ${response.status}` };
    }

    const html = await response.text();

    // Parse with JSDOM
    const dom = new JSDOM(html, { url });
    const doc = dom.window.document;

    // Extract published time before Readability modifies the DOM
    const publishedTime = extractPublishedTime(doc);

    // Use Readability to extract article
    const reader = new Readability(doc);
    const article = reader.parse();

    if (!article) {
      return { success: false, article: null, error: 'Could not extract article content' };
    }

    // Calculate metrics
    const wordCount = countWords(article.textContent || '');
    const readingTime = calculateReadingTime(wordCount);

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
        readingTime,
        publishedTime,
      },
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      return { success: false, article: null, error: 'Request timed out' };
    }

    console.error('[ArticleExtractor] Error:', error);
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
