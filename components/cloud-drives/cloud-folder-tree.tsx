"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronRight, Folder, FileText, Loader2, Image, Music, Film, File } from "lucide-react";
import { cloudStorage } from "@/lib/services/cloud-storage";
import type { CloudFile, CloudProviderId } from "@/lib/services/cloud-storage/types";
import { cn } from "@/lib/utils";

interface CloudFolderTreeProps {
  providerId: CloudProviderId;
  onFileSelect: (file: CloudFile) => void;
  onFileDragStart?: (file: CloudFile, e: React.DragEvent) => void;
  onFileDrop?: (targetPath: string) => void;
  selectedFileId?: string;
  rootPath?: string;
}

interface TreeNode {
  file: CloudFile;
  children: TreeNode[];
  isLoaded: boolean;
}

function getFileIcon(mimeType: string, isFolder: boolean) {
  if (isFolder) {
    return <Folder className="h-4 w-4 text-yellow-500" />;
  }

  if (mimeType.startsWith("image/")) {
    return <Image className="h-4 w-4 text-pink-400" />;
  }
  if (mimeType.startsWith("audio/")) {
    return <Music className="h-4 w-4 text-green-400" />;
  }
  if (mimeType.startsWith("video/")) {
    return <Film className="h-4 w-4 text-blue-400" />;
  }
  if (mimeType === "text/markdown" || mimeType === "text/plain") {
    return <FileText className="h-4 w-4 text-accent" />;
  }
  return <File className="h-4 w-4 text-gray-400" />;
}

export function CloudFolderTree({
  providerId,
  onFileSelect,
  onFileDragStart,
  onFileDrop,
  selectedFileId,
  rootPath = "/Pawkit",
}: CloudFolderTreeProps) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [loadingFolders, setLoadingFolders] = useState<Set<string>>(new Set());
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Load folder contents
  const loadFolder = useCallback(async (path: string): Promise<CloudFile[]> => {
    try {
      const provider = cloudStorage.getProvider(providerId);
      if (!provider) {
        console.error(`[CloudFolderTree] Provider ${providerId} not found`);
        return [];
      }
      const files = await provider.listFiles(path);
      // Sort: folders first, then by name
      return [...files].sort((a, b) => {
        if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      console.error(`[CloudFolderTree] Error loading ${path}:`, error);
      return [];
    }
  }, [providerId]);

  // Load root folder on mount or provider change
  useEffect(() => {
    const loadRoot = async () => {
      setIsInitialLoading(true);
      const files = await loadFolder(rootPath);
      const nodes: TreeNode[] = files.map((file) => ({
        file,
        children: [],
        isLoaded: false,
      }));
      setTree(nodes);
      setExpandedFolders(new Set());
      setIsInitialLoading(false);
    };
    loadRoot();
  }, [providerId, rootPath, loadFolder]);

  // Find and update a node in the tree
  const updateNodeInTree = (
    nodes: TreeNode[],
    targetId: string,
    updater: (node: TreeNode) => TreeNode
  ): TreeNode[] => {
    return nodes.map((node) => {
      if (node.file.cloudId === targetId) {
        return updater(node);
      }
      if (node.children.length > 0) {
        return {
          ...node,
          children: updateNodeInTree(node.children, targetId, updater),
        };
      }
      return node;
    });
  };

  // Toggle folder expand/collapse
  const toggleFolder = useCallback(async (folder: CloudFile) => {
    const folderId = folder.cloudId;

    if (expandedFolders.has(folderId)) {
      // Collapse
      setExpandedFolders((prev) => {
        const next = new Set(prev);
        next.delete(folderId);
        return next;
      });
    } else {
      // Expand - load children if not loaded
      setLoadingFolders((prev) => new Set(prev).add(folderId));

      const children = await loadFolder(folder.path);
      const childNodes: TreeNode[] = children.map((file) => ({
        file,
        children: [],
        isLoaded: false,
      }));

      setTree((prev) =>
        updateNodeInTree(prev, folderId, (node) => ({
          ...node,
          children: childNodes,
          isLoaded: true,
        }))
      );

      setLoadingFolders((prev) => {
        const next = new Set(prev);
        next.delete(folderId);
        return next;
      });

      setExpandedFolders((prev) => new Set(prev).add(folderId));
    }
  }, [expandedFolders, loadFolder]);

  // Handle drag over on folder
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  const handleFolderDragOver = (e: React.DragEvent, folder: CloudFile) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    setDragOverFolderId(folder.cloudId);
  };

  const handleFolderDragLeave = () => {
    setDragOverFolderId(null);
  };

  const handleFolderDrop = (e: React.DragEvent, folder: CloudFile) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);
    if (onFileDrop) {
      onFileDrop(folder.path);
    }
  };

  // Render a single node
  const renderNode = (node: TreeNode, depth: number) => {
    const isExpanded = expandedFolders.has(node.file.cloudId);
    const isLoading = loadingFolders.has(node.file.cloudId);
    const isSelected = selectedFileId === node.file.cloudId;
    const isDragOver = dragOverFolderId === node.file.cloudId;

    return (
      <div key={node.file.cloudId}>
        <div
          className={cn(
            "flex items-center py-1.5 px-2 rounded-md transition-colors",
            "hover:bg-white/5",
            isSelected && "bg-accent/20 border border-accent/30",
            isDragOver && node.file.isFolder && "bg-accent/30 border border-accent/50",
            node.file.isFolder ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          draggable={!node.file.isFolder}
          onDragStart={(e) => !node.file.isFolder && onFileDragStart?.(node.file, e)}
          onDragOver={node.file.isFolder ? (e) => handleFolderDragOver(e, node.file) : undefined}
          onDragLeave={node.file.isFolder ? handleFolderDragLeave : undefined}
          onDrop={node.file.isFolder ? (e) => handleFolderDrop(e, node.file) : undefined}
          onClick={() => {
            if (node.file.isFolder) {
              toggleFolder(node.file);
            } else {
              onFileSelect(node.file);
            }
          }}
        >
          {/* Expand/collapse chevron or spacer */}
          {node.file.isFolder ? (
            isLoading ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin text-muted-foreground" />
            ) : (
              <ChevronRight
                className={cn(
                  "h-4 w-4 mr-1.5 text-muted-foreground transition-transform",
                  isExpanded && "rotate-90"
                )}
              />
            )
          ) : (
            <span className="w-4 mr-1.5" />
          )}

          {/* File/folder icon */}
          {getFileIcon(node.file.mimeType, node.file.isFolder)}

          {/* Name */}
          <span className="ml-2 text-sm text-foreground truncate" title={node.file.name}>
            {node.file.name}
          </span>
        </div>

        {/* Children (if expanded) */}
        {node.file.isFolder && isExpanded && (
          <div>
            {node.children.length === 0 && node.isLoaded ? (
              <div
                className="text-xs text-muted-foreground py-1"
                style={{ paddingLeft: `${(depth + 1) * 16 + 28}px` }}
              >
                Empty folder
              </div>
            ) : (
              node.children.map((child) => renderNode(child, depth + 1))
            )}
          </div>
        )}
      </div>
    );
  };

  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (tree.length === 0) {
    return (
      <div className="text-center py-8">
        <Folder className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No files found</p>
      </div>
    );
  }

  return (
    <div className="text-sm">
      {tree.map((node) => renderNode(node, 0))}
    </div>
  );
}
