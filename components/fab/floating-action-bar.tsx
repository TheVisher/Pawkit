'use client';

import { useState } from 'react';
import { Plus, Search, MessageCircle } from 'lucide-react';
import { useKitStore } from '@/lib/hooks/use-kit-store';
import { FabButton } from './fab-button';
import { FabMenu } from './fab-menu';

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
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2">
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
  );
}
