import { supabase } from './supabase';
import crypto from 'crypto';

const BUCKET_NAME = 'card-images';

/**
 * Downloads an image from a URL and uploads it to Supabase Storage
 * Returns the permanent public URL
 */
export async function downloadAndStoreImage(imageUrl: string, cardId: string): Promise<string | null> {
  try {
    console.log('[ImageStorage] Downloading image:', imageUrl.substring(0, 80));

    // Download the image
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      return null;
    }

    // Get the image as a buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine file extension from content-type
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const ext = contentType.split('/')[1]?.split(';')[0] || 'jpg';

    // Create a unique filename using cardId and hash of content
    const hash = crypto.createHash('md5').update(buffer).digest('hex').substring(0, 8);
    const filename = `${cardId}-${hash}.${ext}`;


    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, buffer, {
        contentType,
        cacheControl: '31536000', // 1 year cache
        upsert: true // Overwrite if exists
      });

    if (error) {
      return null;
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filename);

    return publicUrl;
  } catch (error) {
    return null;
  }
}

/**
 * Checks if a URL is an expiring URL (TikTok, etc.) that should be downloaded and stored
 */
export function isExpiringImageUrl(url: string): boolean {
  if (!url) return false;

  // TikTok CDN URLs with x-expires parameter
  if (url.includes('tiktokcdn') && url.includes('x-expires')) {
    return true;
  }

  // Add other expiring URL patterns here as needed
  // e.g., Instagram, Twitter, etc.

  return false;
}

/**
 * Checks if a URL is already a stored Supabase URL
 */
export function isStoredImageUrl(url: string): boolean {
  if (!url) return false;
  return url.includes('supabase.co/storage');
}
