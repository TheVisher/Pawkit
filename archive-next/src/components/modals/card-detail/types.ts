import { Globe, FileText } from 'lucide-react';

/**
 * Card Detail Types & Helpers
 */

export interface CardDetailContentProps {
  cardId: string;
  onClose: () => void;
  className?: string;
}

// Helper functions
export function getCardIcon(type: string) {
  switch (type) {
    case 'url':
      return Globe;
    case 'md-note':
    case 'text-note':
      return FileText;
    default:
      return Globe;
  }
}

export function getDomain(url: string): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return '';
  }
}

export function getContentStats(html: string): { words: number; chars: number; links: number } {
  if (!html) return { words: 0, chars: 0, links: 0 };

  // Strip HTML tags to get plain text
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = text ? text.split(/\s+/).filter(w => w.length > 0).length : 0;
  const chars = text.length;

  // Count links
  const linkMatches = html.match(/<a\s/gi);
  const links = linkMatches ? linkMatches.length : 0;

  return { words, chars, links };
}
