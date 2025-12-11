'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, Search, MessageCircle } from 'lucide-react';
import { TopBarAddMenu } from './top-bar-add-menu';
import { cn } from '@/lib/utils';

interface TopBarExpandedProps {
  onSearchFocus: () => void;
  onSearchBlur: () => void;
  onKitClick: () => void;
}

export function TopBarExpanded({
  onSearchFocus,
  onSearchBlur,
  onKitClick
}: TopBarExpandedProps) {
  const [searchValue, setSearchValue] = useState('');
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle search submit - opens command palette with search value
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      // Trigger command palette with the search value
      window.dispatchEvent(new CustomEvent('pawkit:open-command-palette'));
    } else {
      // Open command palette empty
      window.dispatchEvent(new CustomEvent('pawkit:open-command-palette'));
    }
  };

  // Handle input click - open command palette
  const handleInputClick = () => {
    window.dispatchEvent(new CustomEvent('pawkit:open-command-palette'));
  };

  // Keyboard shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to open command palette (but don't prevent default if already handled)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        // Let the global handler take care of this
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="top-bar-expanded">
      <form onSubmit={handleSubmit} className="top-bar-pill">
        {/* Add button */}
        <button
          type="button"
          onClick={() => setAddMenuOpen(!addMenuOpen)}
          className={cn(
            "top-bar-btn left",
            addMenuOpen && "active"
          )}
          title="Add content"
        >
          <Plus size={18} />
        </button>

        {/* Search input - clicking opens command palette */}
        <div className="top-bar-search" onClick={handleInputClick}>
          <Search size={16} className="search-icon" />
          <input
            ref={inputRef}
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onFocus={onSearchFocus}
            onBlur={onSearchBlur}
            onClick={handleInputClick}
            placeholder="Search Pawkit..."
            className="search-input"
            readOnly // Make it just a trigger for command palette
          />
          <kbd className="search-shortcut">⌘K</kbd>
        </div>

        {/* Kit button */}
        <button
          type="button"
          onClick={onKitClick}
          className="top-bar-btn right kit-btn"
          title="Ask Kit"
        >
          <MessageCircle size={18} />
        </button>
      </form>

      {/* Add menu dropdown */}
      <TopBarAddMenu
        open={addMenuOpen}
        onClose={() => setAddMenuOpen(false)}
      />
    </div>
  );
}
