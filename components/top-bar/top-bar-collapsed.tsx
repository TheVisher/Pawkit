'use client';

import { Plus, Search, MessageCircle } from 'lucide-react';

interface TopBarCollapsedProps {
  onExpand: () => void;
  onKitClick: () => void;
}

export function TopBarCollapsed({ onExpand, onKitClick }: TopBarCollapsedProps) {
  const handleSearchClick = () => {
    // Open command palette directly
    window.dispatchEvent(new CustomEvent('pawkit:open-command-palette'));
  };

  return (
    <div className="top-bar-collapsed">
      <div className="top-bar-island">
        {/* Add button */}
        <button
          onClick={onExpand}
          className="island-btn"
          title="Add content"
        >
          <Plus size={16} />
        </button>

        {/* Search button - opens command palette */}
        <button
          onClick={handleSearchClick}
          className="island-btn search"
          title="Search (⌘K)"
        >
          <Search size={16} />
        </button>

        {/* Kit button */}
        <button
          onClick={onKitClick}
          className="island-btn kit"
          title="Ask Kit"
        >
          <MessageCircle size={16} />
        </button>
      </div>
    </div>
  );
}
