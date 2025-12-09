"use client";

import { useEffect, useState, useMemo } from "react";
import { Folder, FolderPlus, FileText, ChevronRight, ChevronDown } from "lucide-react";
import { NoteFolderNode, CardModel } from "@/lib/types";
import { useNoteFolderStore } from "@/lib/stores/note-folder-store";
import { NoteFolderTreeItem } from "./note-folder-tree-item";
import { ConfirmDeleteModal } from "@/components/modals/confirm-delete-modal";
import { GlowButton } from "@/components/ui/glow-button";

type NoteFolderSidebarProps = {
  notes: CardModel[];
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder?: () => void;
  className?: string;
};

export function NoteFolderSidebar({
  notes,
  onSelectFolder,
  onCreateFolder,
  className = "",
}: NoteFolderSidebarProps) {
  const {
    folders,
    selectedFolderId,
    isLoading,
    error,
    fetchFolders,
    createFolder,
    renameFolder,
    deleteFolder,
    moveFolder,
    setSelectedFolder,
    getFolderTree,
  } = useNoteFolderStore();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<NoteFolderNode | null>(null);
  const [isFoldersExpanded, setIsFoldersExpanded] = useState(true);

  // Fetch folders on mount
  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  // Build folder tree
  const folderTree = useMemo(() => getFolderTree(), [folders]);

  // Calculate note counts per folder
  const noteCountsByFolder = useMemo(() => {
    const counts: Record<string, number> = {};
    notes.forEach(note => {
      if (note.noteFolderId) {
        counts[note.noteFolderId] = (counts[note.noteFolderId] || 0) + 1;
      }
    });
    return counts;
  }, [notes]);

  // Count unfiled notes (notes without a folder)
  const unfiledCount = useMemo(() => {
    return notes.filter(note => !note.noteFolderId).length;
  }, [notes]);

  // Handle folder selection
  const handleSelectFolder = (folderId: string | null) => {
    setSelectedFolder(folderId);
    onSelectFolder(folderId);
  };

  // Handle create folder
  const handleCreateFolder = async (parentId?: string) => {
    const name = window.prompt("Folder name");
    if (!name?.trim()) return;

    try {
      await createFolder(name.trim(), parentId);
    } catch (error) {
      // Error is handled in store
    }
  };

  // Handle rename folder
  const handleRenameFolder = async (folder: NoteFolderNode) => {
    const newName = window.prompt("Rename folder", folder.name);
    if (!newName?.trim() || newName === folder.name) return;

    try {
      await renameFolder(folder.id, newName.trim());
    } catch (error) {
      // Error is handled in store
    }
  };

  // Handle move folder (simple prompt for now)
  const handleMoveFolder = async (folder: NoteFolderNode) => {
    const targetName = window.prompt("Move to folder (leave blank for root)", "");
    if (targetName === null) return;

    const trimmed = targetName.trim();
    let newParentId: string | null = null;

    if (trimmed.length > 0) {
      // Find folder by name
      const target = folders.find(f => f.name.toLowerCase() === trimmed.toLowerCase());
      if (!target) {
        alert("Folder not found");
        return;
      }
      newParentId = target.id;
    }

    try {
      await moveFolder(folder.id, newParentId);
    } catch (error) {
      // Error is handled in store
    }
  };

  // Handle delete folder
  const handleDeleteFolder = (folder: NoteFolderNode) => {
    setFolderToDelete(folder);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!folderToDelete) return;

    try {
      await deleteFolder(folderToDelete.id);
      setShowDeleteConfirm(false);
      setFolderToDelete(null);
    } catch (error) {
      // Error is handled in store
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <button
            className="p-0.5 rounded hover:bg-surface-soft transition-colors"
            onClick={() => setIsFoldersExpanded(!isFoldersExpanded)}
            style={{ color: 'var(--text-muted)' }}
          >
            {isFoldersExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          <h3
            className="text-sm font-semibold uppercase tracking-wide"
            style={{ color: 'var(--text-secondary)' }}
          >
            Folders
          </h3>
        </div>
        <button
          onClick={() => handleCreateFolder()}
          className="p-1.5 rounded-lg hover:bg-surface-soft transition-all"
          style={{ color: 'var(--text-muted)' }}
          title="New folder"
        >
          <FolderPlus size={16} />
        </button>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-xs px-2 py-1 mb-2 rounded" style={{ color: 'var(--destructive)', background: 'var(--destructive)/10' }}>
          {error}
        </p>
      )}

      {/* Folders tree */}
      {isFoldersExpanded && (
        <div className="flex-1 overflow-y-auto space-y-0.5">
          {isLoading ? (
            <div className="px-2 py-4 text-center" style={{ color: 'var(--text-muted)' }}>
              Loading...
            </div>
          ) : (
            <>
              {/* All Notes option */}
              <div
                className={`
                  rounded-lg px-2 py-1.5 transition-all duration-200 cursor-pointer
                  ${selectedFolderId === null ? '' : 'hover:bg-surface-soft'}
                `}
                style={
                  selectedFolderId === null
                    ? {
                        background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
                        boxShadow: 'var(--raised-shadow-sm), 0 0 12px hsla(var(--accent-h) var(--accent-s) 50% / 0.15)',
                        border: '1px solid hsla(var(--accent-h) var(--accent-s) 50% / 0.3)',
                      }
                    : {}
                }
                onClick={() => handleSelectFolder(null)}
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-5" /> {/* Spacer for alignment */}
                  <FileText
                    size={16}
                    style={{ color: selectedFolderId === null ? 'var(--ds-accent)' : 'var(--text-secondary)' }}
                  />
                  <span
                    className="flex-1 text-sm font-medium"
                    style={{ color: selectedFolderId === null ? 'var(--ds-accent)' : 'var(--text-primary)' }}
                  >
                    All Notes
                  </span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full"
                    style={{
                      background: selectedFolderId === null ? 'hsla(var(--accent-h) var(--accent-s) 50% / 0.2)' : 'var(--bg-surface-1)',
                      color: selectedFolderId === null ? 'var(--ds-accent)' : 'var(--text-muted)',
                    }}
                  >
                    {notes.length}
                  </span>
                </div>
              </div>

              {/* Folder tree */}
              {folderTree.map((folder) => (
                <NoteFolderTreeItem
                  key={folder.id}
                  folder={folder}
                  depth={0}
                  noteCount={noteCountsByFolder[folder.id] || 0}
                  onSelect={handleSelectFolder}
                  onCreate={handleCreateFolder}
                  onRename={handleRenameFolder}
                  onMove={handleMoveFolder}
                  onDelete={handleDeleteFolder}
                />
              ))}

              {/* Divider */}
              {folders.length > 0 && unfiledCount > 0 && (
                <div className="my-2 border-t" style={{ borderColor: 'var(--border-subtle)' }} />
              )}

              {/* Unfiled section */}
              {unfiledCount > 0 && (
                <div
                  className={`
                    rounded-lg px-2 py-1.5 transition-all duration-200 cursor-pointer
                    ${selectedFolderId === 'unfiled' ? '' : 'hover:bg-surface-soft'}
                  `}
                  style={
                    selectedFolderId === 'unfiled'
                      ? {
                          background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
                          boxShadow: 'var(--raised-shadow-sm), 0 0 12px hsla(var(--accent-h) var(--accent-s) 50% / 0.15)',
                          border: '1px solid hsla(var(--accent-h) var(--accent-s) 50% / 0.3)',
                        }
                      : {}
                  }
                  onClick={() => handleSelectFolder('unfiled')}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-5" /> {/* Spacer */}
                    <FileText
                      size={16}
                      style={{ color: selectedFolderId === 'unfiled' ? 'var(--ds-accent)' : 'var(--text-muted)' }}
                    />
                    <span
                      className="flex-1 text-sm"
                      style={{ color: selectedFolderId === 'unfiled' ? 'var(--ds-accent)' : 'var(--text-muted)' }}
                    >
                      Unfiled
                    </span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full"
                      style={{
                        background: selectedFolderId === 'unfiled' ? 'hsla(var(--accent-h) var(--accent-s) 50% / 0.2)' : 'var(--bg-surface-1)',
                        color: selectedFolderId === 'unfiled' ? 'var(--ds-accent)' : 'var(--text-muted)',
                      }}
                    >
                      {unfiledCount}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Delete confirmation modal */}
      <ConfirmDeleteModal
        open={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setFolderToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Folder?"
        message="Notes in this folder will become unfiled. This action cannot be undone."
        itemName={folderToDelete?.name}
      />
    </div>
  );
}
