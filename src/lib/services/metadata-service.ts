/**
 * Metadata Service
 * Client-side queue for fetching URL metadata and article content
 *
 * Flow:
 * 1. Card created → skeleton appears immediately
 * 2. Metadata fetched → thumbnail/title populate (~1-2s)
 * 3. Article extraction queued → runs in background after metadata
 *
 * This service is designed to work from BOTH the main app and the portal.
 * It uses Dexie directly (not Zustand) so it's portable across contexts.
 */

import { db, createSyncMetadata } from '@/lib/db';
import type { LocalCard } from '@/lib/db/types';
import { addToQueue, triggerSync } from './sync-queue';
import { isYouTubeUrl } from '@/lib/utils/url-detection';
import { validateUrl, type MetadataResult } from '@/lib/metadata';
import { queueImagePersistence, needsPersistence } from '@/lib/metadata/image-persistence';
import { useUIStore } from '@/lib/stores/ui-store';
import { htmlToPlateJson, serializePlateContent } from '@/lib/plate/html-to-plate';

/**
 * Notify the portal that data has changed (for real-time updates)
 */
async function notifyPortal(): Promise<void> {
  if (typeof window === 'undefined') return;

  const tauri = (window as { __TAURI__?: { core: { invoke: (cmd: string) => Promise<unknown> } } }).__TAURI__;
  if (!tauri) return;

  try {
    await tauri.core.invoke('notify_portal_data_changed');
  } catch (e) {
    // Ignore errors - portal may not be open
  }
}

/**
 * Check if a URL is likely to have readable article content
 * (Duplicated from article-extractor.ts to avoid importing Node.js-only dependencies)
 */
function isArticleUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();

    // Skip domains known to produce garbage extractions (JS-heavy, placeholder content)
    const nonArticleDomains = [
      // Known bad extractors (heavy JS rendering, shows "Loading..." placeholders)
      'target.com', 'www.target.com',
      // Social media (not article content)
      'twitter.com', 'x.com',
      'instagram.com', 'www.instagram.com',
      'facebook.com', 'www.facebook.com',
      'tiktok.com', 'www.tiktok.com',
      // Google apps (not articles)
      'maps.google.com',
      'drive.google.com',
      'docs.google.com',
      'sheets.google.com',
      'calendar.google.com',
    ];

    if (nonArticleDomains.some(d => hostname === d || hostname.endsWith('.' + d))) {
      return false;
    }

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

    // Skip common non-article path patterns
    const nonArticlePatterns = [
      /^\/api\//,
      /^\/static\//,
      /^\/assets\//,
      /^\/cdn-cgi\//,
      /\/feed\/?$/,
      /\/rss\/?$/,
      // E-commerce patterns
      /^\/cart/,
      /^\/checkout/,
      /^\/account/,
      /^\/login/,
      /^\/signin/,
      /^\/signup/,
      /^\/search/,
      /^\/s\?/, // Amazon search
      /^\/pl\//, // Target product lists
      /^\/dp\//, // Amazon product
      /^\/gp\//, // Amazon
      /^\/ip\//, // Walmart product
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
const MAX_CONCURRENT_ASPECT_RATIO = 2;

// Queues
const metadataQueue: string[] = [];
const articleQueue: string[] = [];
const aspectRatioQueue: Array<{ cardId: string; imageUrl: string }> = [];

// Active counts
let metadataActiveCount = 0;
let articleActiveCount = 0;
let aspectRatioActiveCount = 0;

// Track processed cards to avoid duplicates
const metadataProcessed = new Set<string>();
const articleProcessed = new Set<string>();
const aspectRatioProcessed = new Set<string>();

// =============================================================================
// ASPECT RATIO EXTRACTION (Web Worker)
// =============================================================================

// Singleton worker for aspect ratio extraction (shared across all extractions)
let aspectRatioWorker: Worker | null = null;
const pendingExtractions = new Map<string, {
  resolve: (value: { dominantColor?: string; aspectRatio?: number; error?: boolean }) => void;
  reject: (error: Error) => void;
}>();

/**
 * Get or create the singleton Web Worker for image processing
 */
function getAspectRatioWorker(): Worker | null {
  if (typeof window === 'undefined') return null;

  if (!aspectRatioWorker) {
    try {
      aspectRatioWorker = new Worker(
        new URL('../workers/image-worker.ts', import.meta.url),
        { type: 'module' }
      );

      aspectRatioWorker.onmessage = (e) => {
        const { id, dominantColor, aspectRatio, error } = e.data;
        const pending = pendingExtractions.get(id);
        if (pending) {
          pending.resolve({ dominantColor, aspectRatio, error });
          pendingExtractions.delete(id);
        }
      };

      aspectRatioWorker.onerror = (error) => {
        console.error('[MetadataService] Worker error:', error);
        // Reject all pending extractions
        for (const [id, pending] of pendingExtractions) {
          pending.reject(new Error('Worker error'));
          pendingExtractions.delete(id);
        }
      };
    } catch (error) {
      console.warn('[MetadataService] Failed to create worker:', error);
      return null;
    }
  }

  return aspectRatioWorker;
}

/**
 * Queue a card for aspect ratio extraction (after metadata fetch)
 */
export function queueAspectRatioExtraction(cardId: string, imageUrl: string): void {
  if (aspectRatioProcessed.has(cardId) || aspectRatioQueue.some(q => q.cardId === cardId)) {
    return;
  }

  aspectRatioQueue.push({ cardId, imageUrl });
  processAspectRatioQueue();
}

/**
 * Process the aspect ratio extraction queue
 */
function processAspectRatioQueue(): void {
  while (aspectRatioActiveCount < MAX_CONCURRENT_ASPECT_RATIO && aspectRatioQueue.length > 0) {
    const item = aspectRatioQueue.shift();
    if (item && !aspectRatioProcessed.has(item.cardId)) {
      aspectRatioActiveCount++;
      aspectRatioProcessed.add(item.cardId);
      extractAspectRatioForCard(item.cardId, item.imageUrl).finally(() => {
        aspectRatioActiveCount--;
        processAspectRatioQueue();
      });
    }
  }
}

/**
 * Extract aspect ratio and dominant color for a card's image
 */
async function extractAspectRatioForCard(cardId: string, imageUrl: string): Promise<void> {
  const worker = getAspectRatioWorker();
  if (!worker) {
    console.warn('[MetadataService] No worker available for aspect ratio extraction');
    return;
  }

  try {
    const result = await new Promise<{ dominantColor?: string; aspectRatio?: number; error?: boolean }>(
      (resolve, reject) => {
        pendingExtractions.set(cardId, { resolve, reject });
        worker.postMessage({ id: cardId, imageSrc: imageUrl });

        // Timeout after 15 seconds
        setTimeout(() => {
          if (pendingExtractions.has(cardId)) {
            pendingExtractions.delete(cardId);
            resolve({ error: true });
          }
        }, 15000);
      }
    );

    if (!result.error && (result.aspectRatio || result.dominantColor)) {
      // Update card with extracted values (local-only, no server sync needed)
      await db.cards.update(cardId, {
        ...(result.aspectRatio && { aspectRatio: result.aspectRatio }),
        ...(result.dominantColor && { dominantColor: result.dominantColor }),
      });

      console.log('[MetadataService] Aspect ratio extracted:', cardId, {
        aspectRatio: result.aspectRatio?.toFixed(2),
        dominantColor: result.dominantColor,
      });
    }
  } catch (error) {
    console.warn('[MetadataService] Aspect ratio extraction failed:', cardId, error);
  }
}

// MetadataResult is now imported from @/lib/metadata

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
 * Fetch metadata for a single card via the /api/metadata endpoint
 *
 * IMPORTANT: We MUST use the API route (server-side) because:
 * - Cross-origin sites like Reddit, Twitter, Instagram don't have CORS headers
 * - Direct browser fetch() to these sites fails due to CORS policy
 * - The API route runs on Node.js server where CORS doesn't apply
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

    // Validate URL first (SSRF protection)
    const validation = validateUrl(card.url);
    if (!validation.valid) {
      console.warn('[MetadataService] Invalid URL:', validation.error);
      throw new Error(validation.error || 'Invalid URL');
    }

    // Fetch via API route to avoid CORS issues
    // The API route runs server-side where cross-origin requests work
    const response = await fetch('/api/metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: card.url }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    const metadata = await response.json() as MetadataResult;

    // Update card with metadata directly in Dexie (works from portal or main app)
    const updates: Partial<LocalCard> = {
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
    if (metadata.images && metadata.images.length > 1) {
      updates.images = metadata.images; // Gallery images
    }
    if (metadata.favicon) {
      updates.favicon = metadata.favicon;
    }
    if (metadata.domain) {
      updates.domain = metadata.domain;
    }

    // Update directly in Dexie (portable - works from portal or main app)
    await db.cards.update(cardId, updates);

    // Queue for server sync (skip conflict check - metadata is server-authoritative anyway)
    await addToQueue('card', cardId, 'update', updates as Record<string, unknown>, { skipConflictCheck: true });

    console.log('[MetadataService] Updated card:', cardId, {
      title: metadata.title?.substring(0, 30),
      hasImage: !!metadata.image,
      source: metadata.source,
    });

    // Trigger sync to push metadata updates to server
    await triggerSync();

    // Notify portal about the update (main app uses useLiveQuery, auto-updates)
    await notifyPortal();

    // Trigger Muuri layout refresh if an image was added
    // This handles the case where card was created without a thumbnail,
    // then metadata fetch adds one - the card height changes and Muuri needs to reflow
    // Use setTimeout to allow React to re-render the card with new dimensions first
    if (metadata.image && !card.image) {
      setTimeout(() => {
        useUIStore.getState().triggerMuuriLayout();
      }, 100);
    }

    // Queue aspect ratio extraction if we have an image
    // This happens async after save - user sees card immediately, aspectRatio updates when ready
    if (metadata.image) {
      queueAspectRatioExtraction(cardId, metadata.image);
    }

    // Queue image persistence if needed (non-blocking background task)
    // This handles expiring URLs from TikTok, Instagram, etc.
    if (metadata.image && (metadata.shouldPersistImage || needsPersistence(metadata.image))) {
      // Queue runs in background - returns immediately
      queueImagePersistence(cardId, metadata.image);
    }

    // Queue article extraction after metadata is done
    // Skip YouTube videos (they don't have article content)
    if (card.url && isArticleUrl(card.url) && !isYouTubeUrl(card.url)) {
      // Small delay to ensure thumbnail appears first in UI
      setTimeout(() => {
        queueArticleExtraction(cardId);
      }, 500);
    }
  } catch (error) {
    console.error('[MetadataService] Error fetching metadata:', error);

    // Mark as READY even on failure (stops UI spinner)
    try {
      await db.cards.update(cardId, {
        status: 'READY',
        updatedAt: new Date(),
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

    // Convert HTML content to Plate JSON for consistent storage
    // The editor now uses Plate JSON format, so we convert at extraction time
    let articleContentJson: string | undefined;
    if (article.content) {
      try {
        const plateNodes = htmlToPlateJson(article.content);
        articleContentJson = serializePlateContent(plateNodes);
      } catch (err) {
        console.warn('[MetadataService] Failed to convert article to JSON, storing as HTML:', err);
        // Fallback to raw HTML if conversion fails - editor can handle both
        articleContentJson = article.content;
      }
    }

    // Update card with article content directly in Dexie
    await db.cards.update(cardId, {
      articleContent: articleContentJson,
      wordCount: article.wordCount,
      readingTime: article.readingTime,
      // Set initial reading status
      isRead: false,
      readProgress: 0,
      updatedAt: new Date(),
    });

    console.log('[MetadataService] Article extracted:', cardId, {
      wordCount: article.wordCount,
      readingTime: article.readingTime,
      format: articleContentJson?.startsWith('[') ? 'json' : 'html',
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
  aspectRatioProcessed.clear();
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
    aspectRatio: {
      queueLength: aspectRatioQueue.length,
      activeCount: aspectRatioActiveCount,
      processedCount: aspectRatioProcessed.size,
    },
  };
}

/**
 * Create a URL card and fetch its metadata
 * This is a portable function that works from both portal and main app.
 * Uses Dexie directly, no Zustand dependencies.
 */
export async function createUrlCard(params: {
  url: string;
  workspaceId: string;
  collections?: string[];
  tags?: string[];
}): Promise<string> {
  const { url, workspaceId, collections = [], tags = [] } = params;

  const cardId = crypto.randomUUID();

  // Create card in Dexie
  const card: LocalCard = {
    id: cardId,
    type: 'url',
    url: url,
    title: url, // Will be updated by metadata fetcher
    content: '',
    workspaceId: workspaceId,
    // collections field removed - Pawkit membership now uses tags
    tags: tags,
    pinned: false,
    status: 'PENDING',
    isFileCard: false,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...createSyncMetadata(),
  };

  await db.cards.add(card);

  // Queue for server sync
  await addToQueue('card', cardId, 'create');

  // Queue metadata fetch (will run async)
  queueMetadataFetch(cardId);

  // Main app uses useLiveQuery, auto-updates when Dexie changes

  return cardId;
}
