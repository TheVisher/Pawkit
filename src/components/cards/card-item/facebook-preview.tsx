'use client';

import Image from '@/components/ui/image';
import { cn } from '@/lib/utils';
import { Facebook } from 'lucide-react';

interface FacebookPreviewProps {
  title?: string | null;
  image?: string | null;
  aspectRatio?: number | null;
  className?: string;
}

export function FacebookPreview({ title, image, aspectRatio, className }: FacebookPreviewProps) {
  if (!image) {
    return (
      <div
        className={cn(
          'h-full w-full min-h-[160px] rounded-lg bg-[var(--color-bg-surface-2)]',
          'flex flex-col items-center justify-center gap-2 text-xs text-text-muted',
          className
        )}
      >
        <Facebook className="h-6 w-6" />
        <span>Facebook</span>
      </div>
    );
  }

  return (
    <div
      className={cn('relative w-full overflow-hidden rounded-lg', className)}
      style={{ aspectRatio: aspectRatio || 1 }}
    >
      <Image src={image} alt={title || 'Facebook post'} fill className="object-cover" />
      <div className="absolute inset-0 bg-black/10" />
      <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white">
        <Facebook className="h-3.5 w-3.5" />
        Facebook
      </div>
    </div>
  );
}
