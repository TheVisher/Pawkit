"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronDown, ChevronRight, Folder, FileText, Loader2, Home, Cloud, ShieldCheck, Triangle, Box, List, FolderTree, Trash2 } from "lucide-react";
import { cloudStorage } from "@/lib/services/cloud-storage";
import { CloudFolderTree } from "./cloud-folder-tree";
import { CloudDeleteModal } from "./cloud-delete-modal";
import { useStorageStrategyStore } from "@/lib/stores/storage-strategy-store";
import { useToastStore } from "@/lib/stores/toast-store";
import { useCloudDelete, type CloudFileForDelete } from "@/lib/hooks/use-cloud-delete";
import type { CloudFile, CloudProviderId } from "@/lib/services/cloud-storage/types";

interface ProviderOption {
  id: CloudProviderId;
  name: string;
  slug: string;
}

interface CloudSplitPaneProps {
  providerId: CloudProviderId;
  onProviderChange: (id: CloudProviderId) => void;
  connectedProviders: ProviderOption[];
  currentPath: string;
  onNavigate: (path: string) => void;
  onFileDragStart: (file: CloudFile, e: React.DragEvent) => void;
  onFileDrop: (targetPath: string) => void;
  isDragTarget?: boolean;
}

// Provider icons with Lucide icons and colors
const PROVIDER_CONFIG: Record<CloudProviderId, { icon: typeof Cloud; color: string }> = {
  filen: { icon: ShieldCheck, color: "text-emerald-400" },
  "google-drive": { icon: Triangle, color: "text-yellow-400" },
  dropbox: { icon: Box, color: "text-blue-400" },
  onedrive: { icon: Cloud, color: "text-sky-400" },
};

export function CloudSplitPane({
  providerId,
  onProviderChange,
  connectedProviders,
  currentPath,
  onNavigate,
  onFileDragStart,
  onFileDrop,
  isDragTarget = false,
}: CloudSplitPaneProps) {
  const [items, setItems] = useState<CloudFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "tree">("tree"); // Default to tree view
  const [selectedFileId, setSelectedFileId] = useState<string | undefined>();

  const currentProvider = connectedProviders.find((p) => p.id === providerId);
  const toast = useToastStore();
  const strategy = useStorageStrategyStore((state) => state.strategy);

  // Cloud delete handler
  const handleActualDelete = useCallback(
    async (file: CloudFileForDelete, deleteFromBackup: boolean) => {
      try {
        const provider = cloudStorage.getProvider(file.provider);
        if (!provider) return;
        await provider.deleteFile(file.cloudId);

        // If deleteFromBackup and there's a backup, delete from backup too
        if (deleteFromBackup && strategy.secondaryEnabled && strategy.secondaryProvider) {
          const backupProvider = cloudStorage.getProvider(strategy.secondaryProvider);
          if (backupProvider) {
            try {
              const backupFiles = await backupProvider.listFiles("/Pawkit");
              const backupFile = backupFiles.find(f => f.name === file.name && !f.isFolder);
              if (backupFile) {
                await backupProvider.deleteFile(backupFile.cloudId);
              }
            } catch (backupError) {
              console.warn("[CloudSplitPane] Failed to delete from backup:", backupError);
            }
          }
        }

        toast.success(`Deleted ${file.name}`);
        fetchContents(); // Refresh the list
      } catch (error) {
        console.error("[CloudSplitPane] Delete failed:", error);
        toast.error("Delete failed");
      }
    },
    [strategy, toast]
  );

  const {
    showModal: showDeleteModal,
    pendingFile,
    secondaryProvider,
    primaryProvider,
    initiateDelete,
    closeModal: closeDeleteModal,
    confirmDelete,
  } = useCloudDelete(handleActualDelete);

  const handleDeleteFile = useCallback((file: CloudFile) => {
    const fileForDelete: CloudFileForDelete = {
      name: file.name,
      cloudId: file.cloudId,
      provider: providerId,
    };
    initiateDelete(fileForDelete);
  }, [providerId, initiateDelete]);

  // Fetch folder contents using the provider's listFiles method directly
  const fetchContents = useCallback(async () => {
    if (!providerId) return;

    setIsLoading(true);
    setError(null);

    try {
      const provider = cloudStorage.getProvider(providerId);
      if (!provider) {
        throw new Error(`Provider ${providerId} not found`);
      }

      // Use the provider's listFiles method directly
      const files = await provider.listFiles(currentPath);

      // Sort: folders first, then by name
      const sortedFiles = [...files].sort((a: CloudFile, b: CloudFile) => {
        if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      setItems(sortedFiles);
    } catch (err) {
      console.error(`[CloudSplitPane] Error fetching ${providerId}:`, err);
      setError(err instanceof Error ? err.message : "Failed to load contents");
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [providerId, currentPath]);

  useEffect(() => {
    fetchContents();
  }, [fetchContents]);

  // Navigate to parent folder
  const handleNavigateUp = () => {
    const parentPath = currentPath.split("/").slice(0, -1).join("/") || "/Pawkit";
    onNavigate(parentPath);
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDragOver(true);
  };

  // Handle drag leave
  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    onFileDrop(currentPath);
  };

  // Get breadcrumb segments
  const pathSegments = currentPath.split("/").filter(Boolean);

  return (
    <div
      className="flex flex-col h-full transition-colors"
      style={{
        background: isDragOver || isDragTarget
          ? 'hsl(var(--accent-h) var(--accent-s) var(--accent-l) / 0.1)'
          : 'rgba(255, 255, 255, 0.02)',
        borderColor: isDragOver || isDragTarget
          ? 'hsl(var(--accent-h) var(--accent-s) var(--accent-l) / 0.5)'
          : undefined,
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header: Provider Dropdown */}
      <div className="flex-shrink-0 border-b border-white/10 p-3">
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg
                       bg-white/5 border border-white/10 hover:border-white/20
                       transition-colors"
          >
            {currentProvider && (() => {
              const config = PROVIDER_CONFIG[currentProvider.id] || { icon: Cloud, color: "text-muted-foreground" };
              const ProviderIcon = config.icon;
              return <ProviderIcon className={`h-4 w-4 flex-shrink-0 ${config.color}`} />;
            })()}
            <span className="flex-1 text-left text-sm text-foreground truncate">
              {currentProvider?.name || "Select Provider"}
            </span>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform ${
                isDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Dropdown */}
          {isDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 z-10
                           bg-surface-90 border border-white/10 rounded-lg shadow-xl
                           overflow-hidden">
              {connectedProviders.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => {
                    onProviderChange(provider.id);
                    onNavigate("/Pawkit");
                    setIsDropdownOpen(false);
                  }}
                  className={`flex items-center gap-2 w-full px-3 py-2 text-sm
                             hover:bg-white/5 transition-colors
                             ${provider.id === providerId ? "bg-white/5 text-accent" : "text-foreground"}`}
                >
                  {(() => {
                    const config = PROVIDER_CONFIG[provider.id] || { icon: Cloud, color: "text-muted-foreground" };
                    const ProviderIcon = config.icon;
                    return <ProviderIcon className={`h-4 w-4 ${config.color}`} />;
                  })()}
                  <span>{provider.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Breadcrumb and View Toggle */}
        <div className="flex items-center justify-between gap-2 mt-2">
          {/* Breadcrumb - only show in list view */}
          {viewMode === "list" ? (
            <div className="flex items-center gap-1 text-xs text-muted-foreground overflow-x-auto flex-1">
              <button
                onClick={() => onNavigate("/Pawkit")}
                className="hover:text-foreground transition-colors flex items-center gap-1 flex-shrink-0"
              >
                <Home className="h-3 w-3" />
              </button>
              {pathSegments.map((segment, i) => (
                <div key={i} className="flex items-center gap-1 flex-shrink-0">
                  <ChevronRight className="h-3 w-3" />
                  <button
                    onClick={() => {
                      const targetPath = "/" + pathSegments.slice(0, i + 1).join("/");
                      onNavigate(targetPath);
                    }}
                    className="hover:text-foreground transition-colors truncate max-w-[100px]"
                    title={segment}
                  >
                    {segment}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">Tree View</div>
          )}

          {/* View Toggle */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setViewMode("list")}
              className={`p-1 rounded transition-colors ${
                viewMode === "list"
                  ? "bg-accent/20 text-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
              title="List View"
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("tree")}
              className={`p-1 rounded transition-colors ${
                viewMode === "tree"
                  ? "bg-accent/20 text-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
              title="Tree View"
            >
              <FolderTree className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content: Tree or List View */}
      <div className="flex-1 overflow-y-auto">
        {viewMode === "tree" ? (
          /* Tree View */
          <div className="p-2">
            <CloudFolderTree
              providerId={providerId}
              onFileSelect={(file) => {
                setSelectedFileId(file.cloudId);
              }}
              onFileDragStart={onFileDragStart}
              onFileDrop={onFileDrop}
              selectedFileId={selectedFileId}
              rootPath="/Pawkit"
            />
          </div>
        ) : (
          /* List View */
          <>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="p-4 text-center text-red-400 text-sm">{error}</div>
            ) : items.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                Empty folder
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {/* Parent folder link */}
                {currentPath !== "/Pawkit" && (
                  <button
                    onClick={handleNavigateUp}
                    className="flex items-center gap-2 w-full px-3 py-2 hover:bg-white/5 transition-colors text-left"
                  >
                    <Folder className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm text-muted-foreground">..</span>
                  </button>
                )}

                {/* Items */}
                {items.map((item) => (
                  <div
                    key={item.cloudId}
                    draggable={!item.isFolder}
                    onDragStart={(e) => !item.isFolder && onFileDragStart(item, e)}
                    onClick={() => item.isFolder && onNavigate(item.path)}
                    className={`flex items-center gap-2 w-full px-3 py-2
                               hover:bg-white/5 transition-colors group
                               ${item.isFolder ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"}`}
                  >
                    {item.isFolder ? (
                      <Folder className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                    ) : (
                      <FileText className="h-4 w-4 text-blue-400 flex-shrink-0" />
                    )}
                    <span className="text-sm text-foreground truncate flex-1" title={item.name}>
                      {item.name}
                    </span>
                    {/* Delete button for files */}
                    {!item.isFolder && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFile(item);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 transition-all"
                        title="Delete file"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-400" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Drop Zone Overlay */}
      {isDragOver && (
        <div
          className="absolute inset-0 border-2 border-dashed rounded-lg flex items-center justify-center pointer-events-none"
          style={{
            background: 'hsl(var(--accent-h) var(--accent-s) var(--accent-l) / 0.2)',
            borderColor: 'hsl(var(--accent-h) var(--accent-s) var(--accent-l) / 0.5)',
          }}
        >
          <p className="text-accent text-sm font-medium">Drop to copy here</p>
        </div>
      )}

      {/* Delete confirmation modal for independent backup mode */}
      {showDeleteModal && pendingFile && primaryProvider && (
        <CloudDeleteModal
          isOpen={showDeleteModal}
          onClose={closeDeleteModal}
          fileName={pendingFile.name}
          primaryProvider={primaryProvider}
          secondaryProvider={secondaryProvider}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}
