"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { NoteFolder, NoteFolderNode } from "@/lib/types";

// Helper to generate temp IDs for optimistic updates
const generateTempId = () => `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

interface NoteFolderState {
  // Data
  folders: NoteFolder[];
  isLoading: boolean;
  error: string | null;

  // UI state
  selectedFolderId: string | null;
  expandedFolderIds: Set<string>;

  // CRUD operations
  fetchFolders: () => Promise<void>;
  createFolder: (name: string, parentId?: string | null) => Promise<NoteFolder>;
  renameFolder: (id: string, name: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  moveFolder: (id: string, newParentId: string | null) => Promise<void>;
  setFolderPrivate: (id: string, isPrivate: boolean) => Promise<void>;

  // UI state management
  setSelectedFolder: (id: string | null) => void;
  toggleFolderExpanded: (id: string) => void;
  setFolderExpanded: (id: string, expanded: boolean) => void;

  // Hierarchy helpers
  getRootFolders: () => NoteFolder[];
  getChildFolders: (parentId: string) => NoteFolder[];
  getFolderPath: (folderId: string) => NoteFolder[];
  getFolderTree: () => NoteFolderNode[];
  getFolderById: (id: string) => NoteFolder | undefined;
}

// Build tree structure from flat array
function buildFolderTree(folders: NoteFolder[], parentId: string | null = null): NoteFolderNode[] {
  return folders
    .filter(f => f.parentId === parentId)
    .sort((a, b) => a.position - b.position)
    .map(folder => ({
      ...folder,
      children: buildFolderTree(folders, folder.id),
    }));
}

// Get path from root to folder
function getPathToFolder(folders: NoteFolder[], targetId: string): NoteFolder[] {
  const folder = folders.find(f => f.id === targetId);
  if (!folder) return [];

  if (folder.parentId) {
    return [...getPathToFolder(folders, folder.parentId), folder];
  }
  return [folder];
}

export const useNoteFolderStore = create<NoteFolderState>()(
  persist(
    (set, get) => ({
      folders: [],
      isLoading: false,
      error: null,
      selectedFolderId: null,
      expandedFolderIds: new Set<string>(),

      fetchFolders: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/note-folders');
          if (!response.ok) {
            throw new Error('Failed to fetch folders');
          }
          const data = await response.json();
          const folders = data.success ? data.data : data;
          set({ folders: Array.isArray(folders) ? folders : [], isLoading: false });
        } catch (error) {
          set({ error: 'Failed to load folders', isLoading: false });
        }
      },

      createFolder: async (name: string, parentId?: string | null) => {
        const tempId = generateTempId();
        const now = new Date().toISOString();

        // Get max position for ordering
        const siblings = get().folders.filter(f => f.parentId === (parentId || null));
        const maxPosition = siblings.length > 0
          ? Math.max(...siblings.map(f => f.position)) + 1
          : 0;

        const newFolder: NoteFolder = {
          id: tempId,
          userId: '', // Will be set by server
          name,
          parentId: parentId || null,
          position: maxPosition,
          isPrivate: false,
          createdAt: now,
          updatedAt: now,
        };

        // Optimistic update
        set(state => ({
          folders: [...state.folders, newFolder],
        }));

        try {
          const response = await fetch('/api/note-folders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, parentId }),
          });

          if (!response.ok) {
            throw new Error('Failed to create folder');
          }

          const data = await response.json();
          const serverFolder = data.success ? data.data : data;

          // Replace temp folder with server folder
          set(state => ({
            folders: state.folders.map(f => f.id === tempId ? serverFolder : f),
          }));

          // Auto-expand parent if creating subfolder
          if (parentId) {
            set(state => ({
              expandedFolderIds: new Set([...state.expandedFolderIds, parentId]),
            }));
          }

          return serverFolder;
        } catch (error) {
          // Revert optimistic update
          set(state => ({
            folders: state.folders.filter(f => f.id !== tempId),
            error: 'Failed to create folder',
          }));
          throw error;
        }
      },

      renameFolder: async (id: string, name: string) => {
        const folder = get().folders.find(f => f.id === id);
        if (!folder) return;

        // Optimistic update
        set(state => ({
          folders: state.folders.map(f =>
            f.id === id ? { ...f, name, updatedAt: new Date().toISOString() } : f
          ),
        }));

        try {
          const response = await fetch(`/api/note-folders/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
          });

          if (!response.ok) {
            throw new Error('Failed to rename folder');
          }
        } catch (error) {
          // Revert on error
          set(state => ({
            folders: state.folders.map(f => f.id === id ? folder : f),
            error: 'Failed to rename folder',
          }));
        }
      },

      deleteFolder: async (id: string) => {
        const folder = get().folders.find(f => f.id === id);
        if (!folder) return;

        // Get all descendant folders (they will be cascade deleted)
        const getDescendants = (parentId: string): string[] => {
          const children = get().folders.filter(f => f.parentId === parentId);
          return children.flatMap(c => [c.id, ...getDescendants(c.id)]);
        };
        const descendantIds = getDescendants(id);
        const allIdsToRemove = [id, ...descendantIds];

        // Optimistic update
        set(state => ({
          folders: state.folders.filter(f => !allIdsToRemove.includes(f.id)),
          selectedFolderId: state.selectedFolderId && allIdsToRemove.includes(state.selectedFolderId)
            ? null
            : state.selectedFolderId,
        }));

        try {
          const response = await fetch(`/api/note-folders/${id}`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            throw new Error('Failed to delete folder');
          }
        } catch (error) {
          // Revert on error - refetch all folders
          await get().fetchFolders();
          set({ error: 'Failed to delete folder' });
        }
      },

      moveFolder: async (id: string, newParentId: string | null) => {
        const folder = get().folders.find(f => f.id === id);
        if (!folder) return;

        // Prevent moving to self or descendant
        const getDescendants = (parentId: string): string[] => {
          const children = get().folders.filter(f => f.parentId === parentId);
          return children.flatMap(c => [c.id, ...getDescendants(c.id)]);
        };
        if (newParentId && (newParentId === id || getDescendants(id).includes(newParentId))) {
          set({ error: 'Cannot move folder into itself or its children' });
          return;
        }

        // Get max position in new parent
        const siblings = get().folders.filter(f => f.parentId === newParentId);
        const maxPosition = siblings.length > 0
          ? Math.max(...siblings.map(f => f.position)) + 1
          : 0;

        // Optimistic update
        set(state => ({
          folders: state.folders.map(f =>
            f.id === id
              ? { ...f, parentId: newParentId, position: maxPosition, updatedAt: new Date().toISOString() }
              : f
          ),
        }));

        try {
          const response = await fetch(`/api/note-folders/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ parentId: newParentId }),
          });

          if (!response.ok) {
            throw new Error('Failed to move folder');
          }

          // Auto-expand new parent
          if (newParentId) {
            set(state => ({
              expandedFolderIds: new Set([...state.expandedFolderIds, newParentId]),
            }));
          }
        } catch (error) {
          // Revert on error
          set(state => ({
            folders: state.folders.map(f => f.id === id ? folder : f),
            error: 'Failed to move folder',
          }));
        }
      },

      setFolderPrivate: async (id: string, isPrivate: boolean) => {
        const folder = get().folders.find(f => f.id === id);
        if (!folder) return;

        // Optimistic update
        set(state => ({
          folders: state.folders.map(f =>
            f.id === id ? { ...f, isPrivate, updatedAt: new Date().toISOString() } : f
          ),
        }));

        try {
          const response = await fetch(`/api/note-folders/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isPrivate }),
          });

          if (!response.ok) {
            throw new Error('Failed to update folder privacy');
          }
        } catch (error) {
          // Revert on error
          set(state => ({
            folders: state.folders.map(f => f.id === id ? folder : f),
            error: 'Failed to update folder privacy',
          }));
        }
      },

      setSelectedFolder: (id: string | null) => {
        set({ selectedFolderId: id });
      },

      toggleFolderExpanded: (id: string) => {
        set(state => {
          const newSet = new Set(state.expandedFolderIds);
          if (newSet.has(id)) {
            newSet.delete(id);
          } else {
            newSet.add(id);
          }
          return { expandedFolderIds: newSet };
        });
      },

      setFolderExpanded: (id: string, expanded: boolean) => {
        set(state => {
          const newSet = new Set(state.expandedFolderIds);
          if (expanded) {
            newSet.add(id);
          } else {
            newSet.delete(id);
          }
          return { expandedFolderIds: newSet };
        });
      },

      getRootFolders: () => {
        return get().folders.filter(f => !f.parentId).sort((a, b) => a.position - b.position);
      },

      getChildFolders: (parentId: string) => {
        return get().folders.filter(f => f.parentId === parentId).sort((a, b) => a.position - b.position);
      },

      getFolderPath: (folderId: string) => {
        return getPathToFolder(get().folders, folderId);
      },

      getFolderTree: () => {
        return buildFolderTree(get().folders);
      },

      getFolderById: (id: string) => {
        return get().folders.find(f => f.id === id);
      },
    }),
    {
      name: 'note-folders-ui',
      partialize: (state) => ({
        // Persist both UI state and folder data for local-first experience
        folders: state.folders,
        expandedFolderIds: Array.from(state.expandedFolderIds),
        selectedFolderId: state.selectedFolderId,
      }),
      onRehydrateStorage: () => (state) => {
        // Convert array back to Set after rehydration
        if (state && Array.isArray(state.expandedFolderIds)) {
          state.expandedFolderIds = new Set(state.expandedFolderIds as unknown as string[]);
        }
      },
    }
  )
);
