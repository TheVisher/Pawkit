"use client";

import { useEffect, useState, useMemo } from "react";
import { Folder, FolderOpen, FileText } from "lucide-react";
import { NoteFolderNode } from "@/lib/types";
import { useNoteFolderStore } from "@/lib/stores/note-folder-store";
import { GlowButton } from "@/components/ui/glow-button";

export type MoveToFolderModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (folderId: string | null) => void;
  currentFolderId?: string | null;
};

type FlatFolder = {
  id: string;
  name: string;
  depth: number;
};

export function MoveToFolderModal({ open, onClose, onConfirm, currentFolderId }: MoveToFolderModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // Get folders from store
  const { folders, fetchFolders, getFolderTree } = useNoteFolderStore();

  // Fetch folders when modal opens
  useEffect(() => {
    if (open) {
      fetchFolders();
      setSearchTerm("");
      setSelectedFolderId(null);
    }
  }, [open, fetchFolders]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    if (open) {
      window.addEventListener("keydown", handleKey);
    }
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Flatten folder tree with hierarchical names (memoized)
  const flatFolders = useMemo(() => {
    const flattenFolders = (nodes: NoteFolderNode[], depth = 0): FlatFolder[] => {
      const result: FlatFolder[] = [];
      for (const node of nodes) {
        result.push({
          id: node.id,
          name: node.name,
          depth,
        });
        if (node.children && node.children.length > 0) {
          result.push(...flattenFolders(node.children, depth + 1));
        }
      }
      return result;
    };
    return flattenFolders(getFolderTree());
  }, [folders, getFolderTree]);

  if (!open) return null;

  const filteredFolders = flatFolders.filter((folder) =>
    folder.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleConfirm = () => {
    onConfirm(selectedFolderId);
    onClose();
  };

  const handleRemoveFromFolder = () => {
    onConfirm(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-3xl p-6 shadow-xl"
        style={{
          background: 'var(--bg-surface-2)',
          border: '1px solid var(--border-subtle)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Move to Folder
        </h2>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Search folders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
            style={{
              background: 'var(--bg-surface-1)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
            autoFocus
          />
        </div>

        <div
          className="mb-4 max-h-64 space-y-1 overflow-y-auto rounded-lg p-2"
          style={{
            background: 'var(--bg-surface-1)',
            boxShadow: 'var(--inset-shadow)',
          }}
        >
          {/* Remove from folder option */}
          {currentFolderId && (
            <>
              <button
                onClick={handleRemoveFromFolder}
                className="w-full rounded-lg px-3 py-2 text-left text-sm transition-colors flex items-center gap-2"
                style={{
                  color: 'var(--text-muted)',
                }}
              >
                <FileText size={16} />
                <span>Remove from folder (unfiled)</span>
              </button>
              <div className="my-2 border-t" style={{ borderColor: 'var(--border-subtle)' }} />
            </>
          )}

          {filteredFolders.length === 0 ? (
            <div className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              {searchTerm ? "No folders found" : "No folders available. Create one first!"}
            </div>
          ) : (
            filteredFolders.map((folder) => {
              const isSelected = selectedFolderId === folder.id;
              const isCurrent = currentFolderId === folder.id;

              return (
                <button
                  key={folder.id}
                  onClick={() => !isCurrent && setSelectedFolderId(folder.id)}
                  disabled={isCurrent}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm transition-all flex items-center gap-2"
                  style={{
                    marginLeft: `${folder.depth * 16}px`,
                    width: `calc(100% - ${folder.depth * 16}px)`,
                    ...(isSelected
                      ? {
                          background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
                          boxShadow: 'var(--raised-shadow-sm), 0 0 12px hsla(var(--accent-h) var(--accent-s) 50% / 0.15)',
                          border: '1px solid hsla(var(--accent-h) var(--accent-s) 50% / 0.3)',
                          color: 'var(--ds-accent)',
                        }
                      : isCurrent
                      ? {
                          opacity: 0.5,
                          color: 'var(--text-muted)',
                        }
                      : {
                          color: 'var(--text-primary)',
                        }),
                  }}
                >
                  {isSelected ? (
                    <FolderOpen size={16} style={{ color: 'var(--ds-accent)' }} />
                  ) : (
                    <Folder size={16} style={{ color: isCurrent ? 'var(--text-muted)' : 'var(--text-secondary)' }} />
                  )}
                  <span className="truncate">{folder.name}</span>
                  {isCurrent && (
                    <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>
                      (current)
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        <div className="flex justify-end gap-2">
          <GlowButton
            onClick={onClose}
            variant="primary"
            size="md"
          >
            Cancel
          </GlowButton>
          <GlowButton
            onClick={handleConfirm}
            disabled={!selectedFolderId}
            variant="primary"
            size="md"
          >
            Move
          </GlowButton>
        </div>
      </div>
    </div>
  );
}
