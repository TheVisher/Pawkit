'use client';

import Image from '@/components/ui/image';
import { cn } from '@/lib/utils';

interface PinterestPreviewProps {
  title?: string | null;
  image?: string | null;
  aspectRatio?: number | null;
  className?: string;
}

let pinterestScriptInjected = false;

export function prefetchPinterestEmbed() {
  if (pinterestScriptInjected || typeof document === 'undefined') return;
  pinterestScriptInjected = true;
  const existing = document.querySelector('script[src="https://assets.pinterest.com/js/pinit.js"]');
  if (existing) return;
  const script = document.createElement('script');
  script.src = 'https://assets.pinterest.com/js/pinit.js';
  script.async = true;
  script.defer = true;
  document.body.appendChild(script);
}

export function PinterestPreview({
  title,
  image,
  aspectRatio,
  className,
}: PinterestPreviewProps) {
  if (!image) {
    return (
      <div
        className={cn(
          'h-full w-full min-h-[160px] rounded-lg bg-[var(--color-bg-surface-2)]',
          'flex items-center justify-center text-xs text-text-muted',
          className
        )}
      >
        Pinterest
      </div>
    );
  }

  return (
    <div
      className={cn('relative w-full overflow-hidden rounded-lg', className)}
      style={{ aspectRatio: aspectRatio || 2 / 3 }}
    >
      <Image src={image} alt={title || 'Pinterest pin'} fill className="object-cover" />
      <div className="absolute inset-0 bg-black/10" />
      <div className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white">
        Pinterest
      </div>
    </div>
  );
}
