/**
 * Metadata Service
 * Client-side queue for fetching URL metadata and article content
 */

import { db } from '@/lib/db';
import { useDataStore } from '@/lib/stores/data-store';

/**
 * Check if a URL is likely to have readable article content
 * (Duplicated from article-extractor.ts to avoid importing Node.js-only dependencies)
 */
function isArticleUrl(url: string): boolean {
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

// Maximum concurrent fetches
const MAX_CONCURRENT_METADATA = 3;
const MAX_CONCURRENT_ARTICLES = 2;

// Queues
const metadataQueue: string[] = [];
const articleQueue: string[] = [];

// Active counts
let metadataActiveCount = 0;
let articleActiveCount = 0;

// Track processed cards to avoid duplicates
const metadataProcessed = new Set<string>();
const articleProcessed = new Set<string>();

interface MetadataResponse {
  title: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
  domain: string;
}

interface ArticleResponse {
  success: boolean;
  article?: {
    title: string | null;
    content: string | null;
    textContent: string | null;
    excerpt: string | null;
    byline: string | null;
    siteName: string | null;
    wordCount: number;
    readingTime: number;
    publishedTime: string | null;
  };
  error?: string;
}

/**
 * Queue a card for metadata fetching
 */
export function queueMetadataFetch(cardId: string): void {
  // Skip if already processed or queued
  if (metadataProcessed.has(cardId) || metadataQueue.includes(cardId)) {
    return;
  }

  metadataQueue.push(cardId);
  processMetadataQueue();
}

/**
 * Queue a card for article extraction
 */
export function queueArticleExtraction(cardId: string): void {
  if (articleProcessed.has(cardId) || articleQueue.includes(cardId)) {
    return;
  }

  articleQueue.push(cardId);
  processArticleQueue();
}

/**
 * Process the metadata queue
 */
function processMetadataQueue(): void {
  while (metadataActiveCount < MAX_CONCURRENT_METADATA && metadataQueue.length > 0) {
    const cardId = metadataQueue.shift();
    if (cardId && !metadataProcessed.has(cardId)) {
      metadataActiveCount++;
      metadataProcessed.add(cardId);
      fetchMetadataForCard(cardId).finally(() => {
        metadataActiveCount--;
        processMetadataQueue();
      });
    }
  }
}

/**
 * Process the article extraction queue
 */
function processArticleQueue(): void {
  while (articleActiveCount < MAX_CONCURRENT_ARTICLES && articleQueue.length > 0) {
    const cardId = articleQueue.shift();
    if (cardId && !articleProcessed.has(cardId)) {
      articleActiveCount++;
      articleProcessed.add(cardId);
      extractArticleForCard(cardId).finally(() => {
        articleActiveCount--;
        processArticleQueue();
      });
    }
  }
}

/**
 * Fetch metadata for a single card
 */
async function fetchMetadataForCard(cardId: string): Promise<void> {
  try {
    // Get card from Dexie
    const card = await db.cards.get(cardId);
    if (!card || !card.url || card.type !== 'url') {
      return;
    }

    // Skip if already has metadata
    if (card.title && card.image && card.status === 'READY') {
      return;
    }

    console.log('[MetadataService] Fetching metadata for:', card.url);

    // Call API
    const response = await fetch('/api/metadata', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: card.url }),
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const metadata: MetadataResponse = await response.json();

    // Update card with metadata
    const updates: Record<string, unknown> = {
      status: 'READY',
      updatedAt: new Date(),
    };

    // Only update fields if we got values
    if (metadata.title) {
      updates.title = metadata.title;
    }
    if (metadata.description) {
      updates.description = metadata.description;
    }
    if (metadata.image) {
      updates.image = metadata.image;
    }
    if (metadata.favicon) {
      updates.favicon = metadata.favicon;
    }
    if (metadata.domain) {
      updates.domain = metadata.domain;
    }

    // Update via data store (triggers sync)
    await useDataStore.getState().updateCard(cardId, updates);

    console.log('[MetadataService] Updated card:', cardId, {
      title: metadata.title?.substring(0, 30),
      hasImage: !!metadata.image,
    });

    // Queue article extraction if URL looks like an article
    if (card.url && isArticleUrl(card.url)) {
      queueArticleExtraction(cardId);
    }
  } catch (error) {
    console.error('[MetadataService] Error fetching metadata:', error);

    // Mark as READY even on failure (stops UI spinner)
    try {
      await useDataStore.getState().updateCard(cardId, {
        status: 'READY',
      });
    } catch {
      // Ignore update errors
    }
  }
}

/**
 * Extract article content for a single card
 */
async function extractArticleForCard(cardId: string): Promise<void> {
  try {
    const card = await db.cards.get(cardId);
    if (!card || !card.url || card.type !== 'url') {
      return;
    }

    // Skip if already has article content
    if (card.articleContent && card.wordCount) {
      return;
    }

    console.log('[MetadataService] Extracting article for:', card.url);

    const response = await fetch('/api/article', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: card.url }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.log('[MetadataService] Article extraction skipped:', error.error || response.status);
      return;
    }

    const data: ArticleResponse = await response.json();

    if (!data.success || !data.article) {
      return;
    }

    const { article } = data;

    // Update card with article content
    await useDataStore.getState().updateCard(cardId, {
      articleContent: article.content || undefined,
      wordCount: article.wordCount,
      readingTime: article.readingTime,
      // Set initial reading status
      isRead: false,
      readProgress: 0,
    });

    console.log('[MetadataService] Article extracted:', cardId, {
      wordCount: article.wordCount,
      readingTime: article.readingTime,
    });
  } catch (error) {
    console.error('[MetadataService] Error extracting article:', error);
  }
}

/**
 * Clear the processed sets (useful for retrying)
 */
export function clearMetadataCache(): void {
  metadataProcessed.clear();
  articleProcessed.clear();
}

/**
 * Get queue status for debugging
 */
export function getMetadataQueueStatus() {
  return {
    metadata: {
      queueLength: metadataQueue.length,
      activeCount: metadataActiveCount,
      processedCount: metadataProcessed.size,
    },
    article: {
      queueLength: articleQueue.length,
      activeCount: articleActiveCount,
      processedCount: articleProcessed.size,
    },
  };
}
