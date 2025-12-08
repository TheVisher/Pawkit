"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useDataStore } from "@/lib/stores/data-store";
import { CardModel } from "@/lib/types";
import { Search, X, FileText, Bookmark, Globe, Tag, Hash } from "lucide-react";
import { extractTags } from "@/lib/stores/data-store";

type SearchResult = {
  card: CardModel;
  score: number;
  matchType: 'title' | 'content' | 'tags' | 'notes';
  matchedText: string;
  context?: string;
};

type SmartSearchProps = {
  onSelectCard?: (card: CardModel) => void;
  placeholder?: string;
  className?: string;
};

export function SmartSearch({ onSelectCard, placeholder = "Search notes, cards, and tags...", className = "" }: SmartSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const cards = useDataStore((state) => state.cards);

  // Filter cards to only include notes and cards with content, excluding Den cards
  const searchableCards = useMemo(() => {
    return cards.filter(card =>
      !card.collections?.includes('the-den') &&
      (card.type === 'md-note' || card.type === 'text-note' || card.type === 'url') &&
      (card.title || card.content || card.notes)
    );
  }, [cards]);

  // Smart search function
  const searchResults = useMemo(() => {
    if (!query.trim()) return [];

    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 0);

    // Check if query starts with # for tag search
    const isTagSearch = query.startsWith('#');
    const tagQuery = isTagSearch ? query.slice(1).toLowerCase() : '';

    for (const card of searchableCards) {
      let score = 0;
      let matchType: SearchResult['matchType'] = 'title';
      let matchedText = '';
      let context = '';

      // Tag search
      if (isTagSearch) {
        const cardTags = card.tags || [];
        const contentTags = extractTags(card.content || '');
        const allTags = [...cardTags, ...contentTags];
        
        for (const tag of allTags) {
          if (tag.toLowerCase().includes(tagQuery)) {
            score += 100;
            matchType = 'tags';
            matchedText = `#${tag}`;
            break;
          }
        }
      } else {
        // Title search (highest priority)
        if (card.title) {
          const titleLower = card.title.toLowerCase();
          if (titleLower.includes(queryLower)) {
            score += 90;
            matchType = 'title';
            matchedText = card.title;
          } else {
            // Simple fuzzy match on title using includes with some tolerance
            const words = queryLower.split(' ');
            const titleWords = titleLower.split(' ');
            const matchingWords = words.filter(word => 
              titleWords.some(titleWord => titleWord.includes(word) || word.includes(titleWord))
            );
            if (matchingWords.length >= Math.ceil(words.length * 0.6)) {
              score += 70;
              matchType = 'title';
              matchedText = card.title;
            }
          }
        }

        // Content search
        if (card.content) {
          const contentLower = card.content.toLowerCase();
          if (contentLower.includes(queryLower)) {
            score += 60;
            if (matchType !== 'title') matchType = 'content';
            matchedText = card.title || 'Untitled';
            
            // Find context around the match
            const matchIndex = contentLower.indexOf(queryLower);
            const start = Math.max(0, matchIndex - 50);
            const end = Math.min(contentLower.length, matchIndex + queryLower.length + 50);
            context = card.content.substring(start, end);
            if (start > 0) context = '...' + context;
            if (end < card.content.length) context = context + '...';
          }
        }

        // Notes search
        if (card.notes) {
          const notesLower = card.notes.toLowerCase();
          if (notesLower.includes(queryLower)) {
            score += 50;
            if (matchType !== 'title' && matchType !== 'content') matchType = 'notes';
            matchedText = card.title || 'Untitled';
          }
        }

        // Multi-word search
        if (queryWords.length > 1) {
          let wordMatches = 0;
          const searchText = `${card.title || ''} ${card.content || ''} ${card.notes || ''}`.toLowerCase();
          
          for (const word of queryWords) {
            if (searchText.includes(word)) {
              wordMatches++;
            }
          }
          
          if (wordMatches === queryWords.length) {
            score += 40;
          }
        }
      }

      if (score > 0) {
        results.push({
          card,
          score,
          matchType,
          matchedText,
          context
        });
      }
    }

    // Sort by score (highest first)
    return results.sort((a, b) => b.score - a.score).slice(0, 10);
  }, [query, searchableCards]);

  const handleSelectCard = useCallback((card: CardModel) => {
    if (onSelectCard) {
      onSelectCard(card);
    }
    setIsOpen(false);
    setQuery('');
    setSelectedIndex(0);
  }, [onSelectCard]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, searchResults.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (searchResults[selectedIndex]) {
            handleSelectCard(searchResults[selectedIndex].card);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setQuery('');
          inputRef.current?.blur();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, searchResults, selectedIndex, handleSelectCard]);

  const getIcon = (card: CardModel) => {
    if (card.type === 'md-note' || card.type === 'text-note') {
      return <FileText size={16} className="text-accent" />;
    } else if (card.type === 'url') {
      return <Bookmark size={16} className="text-blue-400" />;
    } else {
      return <Globe size={16} className="text-green-400" />;
    }
  };

  const getMatchTypeIcon = (matchType: SearchResult['matchType']) => {
    switch (matchType) {
      case 'tags':
        return <Hash size={12} className="text-accent" />;
      case 'title':
        return <FileText size={12} className="text-blue-400" />;
      case 'content':
        return <FileText size={12} className="text-green-400" />;
      case 'notes':
        return <FileText size={12} className="text-yellow-400" />;
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(0);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 bg-surface border border-subtle rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && query && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-subtle rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {searchResults.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <Search size={24} className="mx-auto mb-2 opacity-50" />
              <p>No results found for &quot;{query}&quot;</p>
            </div>
          ) : (
            <div className="py-2">
              {searchResults.map((result, index) => (
                <button
                  key={result.card.id}
                  onClick={() => handleSelectCard(result.card)}
                  className={`w-full px-4 py-3 text-left hover:bg-surface-soft transition-colors ${
                    index === selectedIndex ? 'bg-surface-soft' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {getIcon(result.card)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-foreground truncate">
                          {result.matchedText}
                        </span>
                        <div className="flex items-center gap-1">
                          {getMatchTypeIcon(result.matchType)}
                          <span className="text-xs text-muted-foreground">
                            {result.matchType}
                          </span>
                        </div>
                      </div>
                      {result.context && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {result.context}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {result.card.type}
                        </span>
                        {result.card.tags && result.card.tags.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Tag size={10} className="text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {result.card.tags.slice(0, 3).join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
