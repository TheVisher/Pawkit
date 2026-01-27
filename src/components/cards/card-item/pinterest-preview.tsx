'use client';

import Image from '@/components/ui/image';
import { cn } from '@/lib/utils';

// Pinterest "P" icon as inline SVG
function PinterestIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
    </svg>
  );
}

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
          'flex flex-col items-center justify-center gap-2 text-xs text-text-muted',
          className
        )}
      >
        <PinterestIcon className="h-6 w-6" />
        <span>Pinterest</span>
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
      <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white">
        <PinterestIcon className="h-3.5 w-3.5" />
        Pinterest
      </div>
    </div>
  );
}
