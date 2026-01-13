/**
 * Image Processing Web Worker
 *
 * Extracts dominant color and aspect ratio from images off the main thread.
 * Uses OffscreenCanvas for GPU-accelerated processing without blocking UI.
 *
 * Benefits:
 * - Zero main thread blocking (was 360-900ms with sync canvas)
 * - Results cached in DB, so extraction only happens once per image
 * - Instant colored placeholders on subsequent renders
 */

// Worker context
const ctx: Worker = self as unknown as Worker;

interface ImageProcessRequest {
  id: string;          // Card ID for response correlation
  imageSrc: string;    // Image URL to process
}

interface ImageProcessResponse {
  id: string;
  dominantColor?: string;  // Hex color, e.g., "#2a1f1f"
  aspectRatio?: number;    // width/height ratio
  blurDataUri?: string;    // Tiny base64 JPEG for blur background
  error?: boolean;
}

/**
 * Process an image and extract dominant color + aspect ratio
 */
async function processImage(id: string, imageSrc: string): Promise<ImageProcessResponse> {
  try {
    // Fetch the image as a blob
    // Note: This respects CORS - cross-origin images without CORS headers will fail
    const response = await fetch(imageSrc, { mode: 'cors' });
    if (!response.ok) {
      return { id, error: true };
    }

    const blob = await response.blob();

    // Decode into ImageBitmap (GPU-accelerated, off main thread)
    const bitmap = await createImageBitmap(blob);

    // Calculate aspect ratio
    const aspectRatio = bitmap.width / bitmap.height;

    // Create OffscreenCanvas for color extraction
    // Use small size (50x50) for fast average calculation
    const size = 50;
    const canvas = new OffscreenCanvas(size, size);
    const context = canvas.getContext('2d');

    if (!context) {
      bitmap.close();
      return { id, aspectRatio, error: false }; // Return aspect ratio even if color fails
    }

    // Draw scaled image to canvas
    context.drawImage(bitmap, 0, 0, size, size);

    // Get pixel data for averaging
    const imageData = context.getImageData(0, 0, size, size).data;

    // Calculate average RGB
    let r = 0, g = 0, b = 0;
    const pixelCount = size * size;

    for (let i = 0; i < imageData.length; i += 4) {
      r += imageData[i];
      g += imageData[i + 1];
      b += imageData[i + 2];
      // Skip alpha channel (i + 3)
    }

    // Convert to hex
    const avgR = Math.round(r / pixelCount);
    const avgG = Math.round(g / pixelCount);
    const avgB = Math.round(b / pixelCount);

    const dominantColor = `#${avgR.toString(16).padStart(2, '0')}${avgG.toString(16).padStart(2, '0')}${avgB.toString(16).padStart(2, '0')}`;

    // Generate tiny blur thumbnail (16x16 JPEG, ~500 bytes)
    // CSS blur(32px) makes full resolution unnecessary - this tiny image looks identical when blurred
    let blurDataUri: string | undefined;
    const blurSize = 16;
    const blurCanvas = new OffscreenCanvas(blurSize, blurSize);
    const blurContext = blurCanvas.getContext('2d');

    if (blurContext) {
      blurContext.drawImage(bitmap, 0, 0, blurSize, blurSize);
      try {
        const blob = await blurCanvas.convertToBlob({ type: 'image/jpeg', quality: 0.4 });
        const buffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        // Convert to base64 using chunks to avoid call stack issues with large arrays
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        blurDataUri = `data:image/jpeg;base64,${btoa(binary)}`;
      } catch {
        // Blur generation failed - not critical, continue without it
      }
    }

    bitmap.close(); // Free memory

    return { id, dominantColor, aspectRatio, blurDataUri };
  } catch (error) {
    // CORS errors, network errors, or other failures
    // Return error state - caller can decide to retry or skip
    return { id, error: true };
  }
}

// Handle incoming messages
ctx.onmessage = async (e: MessageEvent<ImageProcessRequest>) => {
  const { id, imageSrc } = e.data;

  if (!id || !imageSrc) {
    ctx.postMessage({ id: id || 'unknown', error: true } as ImageProcessResponse);
    return;
  }

  const result = await processImage(id, imageSrc);
  ctx.postMessage(result);
};

// Export empty object to make this a module (required for TypeScript)
export {};
