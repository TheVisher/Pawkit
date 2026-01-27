'use client';

import Image from '@/components/ui/image';
import { Instagram } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InstagramPreviewProps {
  title?: string | null;
  image?: string | null;
  aspectRatio?: number | null;
  className?: string;
}

let instagramScriptInjected = false;

export function prefetchInstagramEmbed() {
  if (instagramScriptInjected || typeof document === 'undefined') return;
  instagramScriptInjected = true;
  const existing = document.querySelector('script[src="https://www.instagram.com/embed.js"]');
  if (existing) return;
  const script = document.createElement('script');
  script.src = 'https://www.instagram.com/embed.js';
  script.async = true;
  document.body.appendChild(script);
}

export function InstagramPreview({ title, image, aspectRatio, className }: InstagramPreviewProps) {
  if (!image) {
    return (
      <div
        className={cn(
          'h-full w-full min-h-[160px] rounded-lg bg-[var(--color-bg-surface-2)]',
          'flex flex-col items-center justify-center gap-2 text-xs text-text-muted',
          className
        )}
      >
        <Instagram className="h-5 w-5" />
        Instagram
      </div>
    );
  }

  return (
    <div
      className={cn('relative w-full overflow-hidden rounded-lg', className)}
      style={{ aspectRatio: aspectRatio || 4 / 5 }}
    >
      <Image src={image} alt={title || 'Instagram post'} fill className="object-cover" />
      <div className="absolute inset-0 bg-black/10" />
      <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white">
        <Instagram className="h-3.5 w-3.5" />
        Instagram
      </div>
    </div>
  );
}
