"use client";

import { useEffect, useState } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, FolderPlus, Edit3, Trash2, ArrowUpDown } from "lucide-react";
import { NoteFolderNode } from "@/lib/types";
import { useNoteFolderStore } from "@/lib/stores/note-folder-store";
import { GenericContextMenu, ContextMenuItemConfig } from "@/components/ui/generic-context-menu";

type NoteFolderTreeItemProps = {
  folder: NoteFolderNode;
  depth: number;
  noteCount: number;
  onSelect: (folderId: string | null) => void;
  onCreate: (parentId: string) => void;
  onRename: (folder: NoteFolderNode) => void;
  onMove: (folder: NoteFolderNode) => void;
  onDelete: (folder: NoteFolderNode) => void;
};

export function NoteFolderTreeItem({
  folder,
  depth,
  noteCount,
  onSelect,
  onCreate,
  onRename,
  onMove,
  onDelete,
}: NoteFolderTreeItemProps) {
  const { selectedFolderId, expandedFolderIds, toggleFolderExpanded, getChildFolders } = useNoteFolderStore();

  const isSelected = selectedFolderId === folder.id;
  const isExpanded = expandedFolderIds.has(folder.id);
  const hasChildren = folder.children && folder.children.length > 0;

  // Context menu items
  const contextMenuItems: ContextMenuItemConfig[] = [
    {
      label: "New subfolder",
      icon: FolderPlus,
      onClick: () => onCreate(folder.id),
    },
    { type: "separator" },
    {
      label: "Rename",
      icon: Edit3,
      onClick: () => onRename(folder),
    },
    {
      label: "Move",
      icon: ArrowUpDown,
      onClick: () => onMove(folder),
    },
    { type: "separator" },
    {
      label: "Delete",
      icon: Trash2,
      onClick: () => onDelete(folder),
      destructive: true,
    },
  ];

  const content = (
    <div
      className={`
        rounded-lg px-2 py-1.5 transition-all duration-200 cursor-pointer
        ${isSelected ? '' : 'hover:bg-surface-soft'}
      `}
      style={{
        marginLeft: depth > 0 ? `${depth * 16}px` : 0,
        ...(isSelected
          ? {
              background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
              boxShadow: 'var(--raised-shadow-sm), 0 0 12px hsla(var(--accent-h) var(--accent-s) 50% / 0.15)',
              border: '1px solid hsla(var(--accent-h) var(--accent-s) 50% / 0.3)',
            }
          : {}),
      }}
      onClick={() => onSelect(folder.id)}
    >
      <div className="flex items-center gap-1.5">
        {/* Expand/collapse button */}
        {hasChildren ? (
          <button
            className="p-0.5 rounded hover:bg-white/10 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              toggleFolderExpanded(folder.id);
            }}
            style={{ color: 'var(--text-muted)' }}
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="w-5" /> // Spacer for alignment
        )}

        {/* Folder icon */}
        <span style={{ color: isSelected ? 'var(--ds-accent)' : 'var(--text-secondary)' }}>
          {isExpanded && hasChildren ? <FolderOpen size={16} /> : <Folder size={16} />}
        </span>

        {/* Folder name */}
        <span
          className="flex-1 truncate text-sm font-medium"
          style={{ color: isSelected ? 'var(--ds-accent)' : 'var(--text-primary)' }}
        >
          {folder.name}
        </span>

        {/* Note count badge */}
        {noteCount > 0 && (
          <span
            className="text-xs px-1.5 py-0.5 rounded-full"
            style={{
              background: isSelected ? 'hsla(var(--accent-h) var(--accent-s) 50% / 0.2)' : 'var(--bg-surface-1)',
              color: isSelected ? 'var(--ds-accent)' : 'var(--text-muted)',
            }}
          >
            {noteCount}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <>
      <GenericContextMenu items={contextMenuItems}>
        {content}
      </GenericContextMenu>

      {/* Render children if expanded */}
      {hasChildren && isExpanded && (
        <div className="mt-0.5">
          {folder.children.map((child) => (
            <NoteFolderTreeItem
              key={child.id}
              folder={child}
              depth={depth + 1}
              noteCount={0} // Will be calculated by parent
              onSelect={onSelect}
              onCreate={onCreate}
              onRename={onRename}
              onMove={onMove}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </>
  );
}
