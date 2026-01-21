'use client';

/**
 * Kit Mode Hook
 * Handles the AI chat dropdown for Kit interactions
 */

import { useState, useEffect, useCallback } from 'react';

// Kit menu items - placeholder for now, will be replaced with actual chat history
const kitMenuItems = [
  { id: 'new-chat', label: 'New Chat', icon: 'plus' },
  { id: 'recent-1', label: 'How do I organize my bookmarks?', icon: 'message' },
  { id: 'recent-2', label: 'Summarize my saved articles', icon: 'message' },
  { id: 'recent-3', label: 'Find recipes I saved last week', icon: 'message' },
];

export interface KitModeState {
  isKitMode: boolean;
  kitModeSelectedIndex: number;
  kitMenuItems: typeof kitMenuItems;
}

export interface KitModeActions {
  openKitMode: () => void;
  closeKitMode: () => void;
  handleKitModeAction: (actionId: string) => void;
}

export function useKitMode(onModeChange?: () => void): KitModeState & KitModeActions {
  const [isKitMode, setIsKitMode] = useState(false);
  const [kitModeSelectedIndex, setKitModeSelectedIndex] = useState(-1);

  // Click-outside handler
  useEffect(() => {
    if (!isKitMode) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.omnibar-container')) return;

      setIsKitMode(false);
      setKitModeSelectedIndex(-1);
    };

    window.addEventListener('click', handleClickOutside, true);
    return () => window.removeEventListener('click', handleClickOutside, true);
  }, [isKitMode]);

  // Escape handler
  useEffect(() => {
    if (!isKitMode) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsKitMode(false);
        setKitModeSelectedIndex(-1);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isKitMode]);

  // Keyboard navigation
  useEffect(() => {
    if (!isKitMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setKitModeSelectedIndex(prev =>
          prev < kitMenuItems.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setKitModeSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
      } else if (e.key === 'Enter' && kitModeSelectedIndex >= 0) {
        e.preventDefault();
        const item = kitMenuItems[kitModeSelectedIndex];
        if (item) {
          handleKitModeAction(item.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isKitMode, kitModeSelectedIndex]);

  const openKitMode = useCallback(() => {
    onModeChange?.();
    setIsKitMode(true);
    setKitModeSelectedIndex(-1);
  }, [onModeChange]);

  const closeKitMode = useCallback(() => {
    setIsKitMode(false);
    setKitModeSelectedIndex(-1);
  }, []);

  const handleKitModeAction = useCallback((actionId: string) => {
    switch (actionId) {
      case 'new-chat':
        console.log('Starting new Kit chat - coming soon');
        break;
      default:
        // Recent chat clicked
        console.log('Opening chat:', actionId, '- coming soon');
    }
    setIsKitMode(false);
    setKitModeSelectedIndex(-1);
  }, []);

  return {
    isKitMode,
    kitModeSelectedIndex,
    kitMenuItems,
    openKitMode,
    closeKitMode,
    handleKitModeAction,
  };
}

/**
 * Calculate height for kit mode dropdown
 */
export function getKitModeHeight(isKitMode: boolean): number {
  if (!isKitMode) return 48;

  const baseHeight = 48;
  const headerHeight = 28;
  const itemHeight = 44;
  const itemCount = kitMenuItems.length;

  return baseHeight + 16 + headerHeight + (itemCount * itemHeight);
}
