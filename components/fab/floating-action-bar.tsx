'use client';

import { useState } from 'react';
import { Plus, Search, MessageCircle } from 'lucide-react';
import { useKitStore } from '@/lib/hooks/use-kit-store';
import { FabButton } from './fab-button';
import { FabMenu } from './fab-menu';
import { cn } from '@/lib/utils';

export function FloatingActionBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isOpen, toggleOpen } = useKitStore();

  const handleSearch = () => {
    // Trigger command palette
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);
  };

  return (
    <>
      {/* Dynamic Island Container - emerges from bottom of screen */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none">
        {/* The "notch" shape that extends down into the edge */}
        <div
          className="relative pointer-events-auto"
          style={{
            // Create the pill/island shape
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.95) 100%)',
            borderRadius: '24px 24px 0 0',
            padding: '12px 16px 20px 16px',
            // Subtle inner glow
            boxShadow: `
              0 -4px 20px rgba(0,0,0,0.5),
              0 -1px 0 rgba(255,255,255,0.1),
              inset 0 1px 0 rgba(255,255,255,0.1)
            `,
            // Extend below viewport edge
            marginBottom: '-8px',
          }}
        >
          {/* Curved edges that fade into the bottom */}
          <div
            className="absolute -left-6 bottom-0 w-6 h-full"
            style={{
              background: 'radial-gradient(ellipse at bottom right, rgba(0,0,0,0.9) 0%, transparent 70%)',
            }}
          />
          <div
            className="absolute -right-6 bottom-0 w-6 h-full"
            style={{
              background: 'radial-gradient(ellipse at bottom left, rgba(0,0,0,0.9) 0%, transparent 70%)',
            }}
          />

          {/* Button container */}
          <div className="flex items-center gap-3 relative">
            {/* Slide-out menu */}
            <FabMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

            {/* Add button */}
            <FabButton
              icon={Plus}
              label="Add content"
              onClick={() => setMenuOpen(!menuOpen)}
              active={menuOpen}
            />

            {/* Search button */}
            <FabButton
              icon={Search}
              label="Search (⌘K)"
              onClick={handleSearch}
            />

            {/* Kit button */}
            <FabButton
              icon={MessageCircle}
              label="Ask Kit"
              onClick={toggleOpen}
              active={isOpen}
              highlight
            />
          </div>
        </div>
      </div>
    </>
  );
}
