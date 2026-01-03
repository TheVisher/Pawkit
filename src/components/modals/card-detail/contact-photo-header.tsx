'use client';

/**
 * Contact Photo Header Component
 * Gradient background with contact photo on the right
 * Only shown for cards with #contact supertag
 */

import { useState, useRef } from 'react';
import Image from 'next/image';
import { User, ImagePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useModalStore } from '@/lib/stores/modal-store';
import type { LocalCard } from '@/lib/db';

interface ContactPhotoHeaderProps {
  card: LocalCard;
  className?: string;
}

// Default gradient color (accent-like purple)
const DEFAULT_GRADIENT_COLOR = '#6366f1';

// Preset gradient colors
export const GRADIENT_PRESETS = [
  '#6366f1', // Indigo (default/accent)
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#14b8a6', // Teal
  '#0ea5e9', // Sky
  '#6b7280', // Gray
];

/**
 * Darken a hex color by a percentage
 */
function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (num >> 16) - Math.round(255 * percent / 100));
  const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.round(255 * percent / 100));
  const b = Math.max(0, (num & 0x0000FF) - Math.round(255 * percent / 100));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

export function ContactPhotoHeader({ card, className }: ContactPhotoHeaderProps) {
  const openCardPhotoPicker = useModalStore((s) => s.openCardPhotoPicker);
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const gradientColor = card.headerGradientColor || DEFAULT_GRADIENT_COLOR;
  const darkColor = darkenColor(gradientColor, 30);
  const hasImage = card.image && !imageError;
  const imagePosition = card.headerImagePosition ?? 50;

  const handlePhotoClick = () => {
    openCardPhotoPicker(card.id);
  };

  return (
    <div
      className={cn('relative w-full overflow-hidden flex-shrink-0', className)}
      style={{ height: '120px' }}
    >
      {/* Gradient background with mask for fade */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${gradientColor} 0%, ${darkColor} 100%)`,
          maskImage: 'linear-gradient(to bottom, black 0%, black 50%, rgba(0,0,0,0.6) 75%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 50%, rgba(0,0,0,0.6) 75%, transparent 100%)',
        }}
      />

      {/* Photo container - positioned right */}
      <div className="absolute right-6 top-3 bottom-3 flex items-center">
        <button
          onClick={handlePhotoClick}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={cn(
            'relative h-24 w-24 rounded-2xl overflow-hidden',
            'border-2 border-white/20 shadow-lg',
            'transition-all duration-200',
            'hover:border-white/40 hover:scale-105',
            'focus:outline-none focus:ring-2 focus:ring-white/50'
          )}
        >
          {hasImage ? (
            <>
              <Image
                src={card.image!}
                alt={card.title || 'Contact photo'}
                fill
                className="object-cover"
                style={{ objectPosition: `center ${imagePosition}%` }}
                onError={() => setImageError(true)}
              />
              {/* Hover overlay */}
              <div
                className={cn(
                  'absolute inset-0 bg-black/40 flex items-center justify-center',
                  'transition-opacity duration-200',
                  isHovered ? 'opacity-100' : 'opacity-0'
                )}
              >
                <ImagePlus className="h-6 w-6 text-white" />
              </div>
            </>
          ) : (
            // Placeholder state
            <div className="h-full w-full bg-white/10 flex flex-col items-center justify-center gap-1">
              <User className="h-8 w-8 text-white/50" />
              <span className="text-xs text-white/50">Add photo</span>
            </div>
          )}
        </button>
      </div>

      {/* Optional: Subtle pattern overlay for visual interest */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />
    </div>
  );
}
