'use client';

/**
 * Add Mode Hook
 * Handles the "+" dropdown for adding bookmarks, notes, uploads, etc.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from '@/lib/navigation';
import { useModalStore } from '@/lib/stores/modal-store';
import { useMutations } from '@/lib/contexts/convex-data-context';
import type { Id } from '@/lib/types/convex';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { getSupertagTemplate } from '@/lib/tags/supertags';
import {
  htmlToPlateJson,
  isPlateJson,
  parseJsonContent,
  createEmptyPlateContent,
} from '@/lib/plate/html-to-plate';
import type { Value } from 'platejs';
import { addMenuItems } from '../types';

/**
 * Convert HTML template to Plate JSON string
 */
function convertTemplateToJson(htmlTemplate: string): Value {
  if (!htmlTemplate || !htmlTemplate.trim()) return createEmptyPlateContent();
  if (isPlateJson(htmlTemplate)) {
    const parsed = parseJsonContent(htmlTemplate);
    if (parsed) return parsed;
  }
  return htmlToPlateJson(htmlTemplate);
}

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
  const { createCard } = useMutations();
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);
  const workspaceId = currentWorkspace?._id as Id<'workspaces'> | undefined;

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
        openAddCard('note');
        break;
      case 'contact':
        // Create contact card with template and open for editing
        if (workspaceId) {
          const htmlTemplate = getSupertagTemplate('contact', { name: 'New Contact' }) || '';
          const jsonContent = convertTemplateToJson(htmlTemplate);
          const card = await createCard({
            workspaceId,
            type: 'md-note',
            url: '',
            title: 'New Contact',
            content: jsonContent,
            tags: ['contact'],
            pinned: false,
            isFileCard: false,
          });
          openCardDetail(card);
        }
        break;
      case 'todo':
        // Create todo card with template
        if (workspaceId) {
          const htmlTemplate = getSupertagTemplate('todo') || '';
          const jsonContent = convertTemplateToJson(htmlTemplate);
          const card = await createCard({
            workspaceId,
            type: 'md-note',
            url: '',
            title: 'New Todo',
            content: jsonContent,
            tags: ['todo'],
            pinned: false,
            isFileCard: false,
          });
          openCardDetail(card);
        }
        break;
      case 'subscription':
        // Create subscription card with template
        if (workspaceId) {
          const htmlTemplate = getSupertagTemplate('subscription') || '';
          const jsonContent = convertTemplateToJson(htmlTemplate);
          const card = await createCard({
            workspaceId,
            type: 'md-note',
            url: '',
            title: 'New Subscription',
            content: jsonContent,
            tags: ['subscription'],
            pinned: false,
            isFileCard: false,
          });
          openCardDetail(card);
        }
        break;
      case 'recipe':
        // Create recipe card with template
        if (workspaceId) {
          const htmlTemplate = getSupertagTemplate('recipe') || '';
          const jsonContent = convertTemplateToJson(htmlTemplate);
          const card = await createCard({
            workspaceId,
            type: 'md-note',
            url: '',
            title: 'New Recipe',
            content: jsonContent,
            tags: ['recipe'],
            pinned: false,
            isFileCard: false,
          });
          openCardDetail(card);
        }
        break;
      case 'reading':
        // Create reading card with template
        if (workspaceId) {
          const htmlTemplate = getSupertagTemplate('reading') || '';
          const jsonContent = convertTemplateToJson(htmlTemplate);
          const card = await createCard({
            workspaceId,
            type: 'md-note',
            url: '',
            title: 'New Reading',
            content: jsonContent,
            tags: ['reading'],
            pinned: false,
            isFileCard: false,
          });
          openCardDetail(card);
        }
        break;
      case 'project':
        // Create project card with template
        if (workspaceId) {
          const htmlTemplate = getSupertagTemplate('project') || '';
          const jsonContent = convertTemplateToJson(htmlTemplate);
          const card = await createCard({
            workspaceId,
            type: 'md-note',
            url: '',
            title: 'New Project',
            content: jsonContent,
            tags: ['project'],
            pinned: false,
            isFileCard: false,
          });
          openCardDetail(card);
        }
        break;
      case 'upload':
        // Open universal image picker in new-card mode
        useModalStore.getState().openImagePicker(null, 'new-card');
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
