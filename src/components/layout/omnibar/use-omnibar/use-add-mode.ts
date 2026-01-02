'use client';

/**
 * Add Mode Hook
 * Handles the "+" dropdown for adding bookmarks, notes, uploads, etc.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useModalStore } from '@/lib/stores/modal-store';
import { useDataStore } from '@/lib/stores/data-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { getSupertagTemplate } from '@/lib/tags/supertags';
import { addMenuItems } from '../types';

export interface AddModeState {
  isAddMode: boolean;
  addModeSelectedIndex: number;
}

export interface AddModeActions {
  openAddMode: () => void;
  closeAddMode: () => void;
  handleAddModeAction: (action: string) => void;
}

export function useAddMode(onModeChange?: () => void): AddModeState & AddModeActions {
  const router = useRouter();
  const openAddCard = useModalStore((s) => s.openAddCard);
  const openCardDetail = useModalStore((s) => s.openCardDetail);
  const createCard = useDataStore((s) => s.createCard);
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);
  const workspaceId = currentWorkspace?.id;

  const [isAddMode, setIsAddMode] = useState(false);
  const [addModeSelectedIndex, setAddModeSelectedIndex] = useState(-1);

  // Click-outside handler
  useEffect(() => {
    if (!isAddMode) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.omnibar-container')) return;

      setIsAddMode(false);
      setAddModeSelectedIndex(-1);
    };

    window.addEventListener('click', handleClickOutside, true);
    return () => window.removeEventListener('click', handleClickOutside, true);
  }, [isAddMode]);

  // Escape handler
  useEffect(() => {
    if (!isAddMode) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsAddMode(false);
        setAddModeSelectedIndex(-1);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isAddMode]);

  // Keyboard navigation
  useEffect(() => {
    if (!isAddMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setAddModeSelectedIndex(prev =>
          prev < addMenuItems.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setAddModeSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
      } else if (e.key === 'Enter' && addModeSelectedIndex >= 0) {
        e.preventDefault();
        const item = addMenuItems[addModeSelectedIndex];
        if (item) {
          handleAddModeAction(item.action);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddMode, addModeSelectedIndex]);

  const openAddMode = useCallback(() => {
    onModeChange?.();
    setIsAddMode(true);
    setAddModeSelectedIndex(-1);
  }, [onModeChange]);

  const closeAddMode = useCallback(() => {
    setIsAddMode(false);
    setAddModeSelectedIndex(-1);
  }, []);

  const handleAddModeAction = useCallback(async (action: string) => {
    switch (action) {
      case 'bookmark':
        openAddCard('bookmark');
        break;
      case 'note':
      case 'quick-note':
        openAddCard('note');
        break;
      case 'contact':
        // Create contact card with template and open for editing
        if (workspaceId) {
          const template = getSupertagTemplate('contact', { name: 'New Contact' }) || '';
          const card = await createCard({
            workspaceId,
            type: 'md-note',
            url: '',
            title: 'New Contact',
            content: template,
            tags: ['contact'],
            pinned: false,
          });
          openCardDetail(card.id);
        }
        break;
      case 'upload':
        console.log('Upload action - coming soon');
        break;
      case 'event':
        console.log('Event action - coming soon');
        break;
      case 'tag':
        router.push('/tags?create=true');
        break;
      default:
        console.log('Unknown action:', action);
    }
    setIsAddMode(false);
    setAddModeSelectedIndex(-1);
  }, [openAddCard, openCardDetail, createCard, workspaceId, router]);

  return {
    isAddMode,
    addModeSelectedIndex,
    openAddMode,
    closeAddMode,
    handleAddModeAction,
  };
}

/**
 * Calculate height for add mode dropdown
 */
export function getAddModeHeight(isAddMode: boolean): number {
  if (!isAddMode) return 48;

  const baseHeight = 48;
  const headerHeight = 28;
  const itemHeight = 44;
  const itemCount = addMenuItems.length;

  return baseHeight + 16 + headerHeight + (itemCount * itemHeight);
}
