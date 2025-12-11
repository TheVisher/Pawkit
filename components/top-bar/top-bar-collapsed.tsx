'use client';

import { useState } from 'react';
import { Plus, Search, MessageCircle } from 'lucide-react';
import { TopBarAddMenu } from './top-bar-add-menu';
import { cn } from '@/lib/utils';

interface TopBarCollapsedProps {
  onSearchClick: () => void;
  onKitClick: () => void;
}

export function TopBarCollapsed({ onSearchClick, onKitClick }: TopBarCollapsedProps) {
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  const handleSearchClick = () => {
    // Open command palette directly
    window.dispatchEvent(new CustomEvent('pawkit:open-command-palette'));
  };

  return (
    <div className="top-bar-collapsed">
      <div className="top-bar-island">
        {/* Add button - opens menu directly */}
        <button
          onClick={() => setAddMenuOpen(!addMenuOpen)}
          className={cn("island-btn", addMenuOpen && "active")}
          title="Add content"
        >
          <Plus size={18} />
        </button>

        {/* Search button - opens command palette */}
        <button
          onClick={handleSearchClick}
          className="island-btn search"
          title="Search (⌘K)"
        >
          <Search size={18} />
        </button>

        {/* Kit button */}
        <button
          onClick={onKitClick}
          className="island-btn kit"
          title="Ask Kit"
        >
          <MessageCircle size={18} />
        </button>
      </div>

      {/* Add menu dropdown - same menu as expanded state */}
      <TopBarAddMenu
        open={addMenuOpen}
        onClose={() => setAddMenuOpen(false)}
      />
    </div>
  );
}
