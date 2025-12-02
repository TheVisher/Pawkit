"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronDown, ChevronRight, Folder, FileText, Loader2, Home, Cloud, ShieldCheck, Triangle, Box } from "lucide-react";
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

  const currentProvider = connectedProviders.find((p) => p.id === providerId);

  // Fetch folder contents
  const fetchContents = useCallback(async () => {
    if (!providerId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Build API URL based on provider
      let apiUrl = "";
      if (providerId === "filen") {
        apiUrl = `/api/filen/folder?path=${encodeURIComponent(currentPath)}`;
      } else if (providerId === "google-drive") {
        apiUrl = `/api/gdrive/folder?path=${encodeURIComponent(currentPath)}`;
      } else if (providerId === "dropbox") {
        apiUrl = `/api/dropbox/folder?path=${encodeURIComponent(currentPath)}`;
      } else if (providerId === "onedrive") {
        apiUrl = `/api/onedrive/folder?path=${encodeURIComponent(currentPath)}`;
      }

      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error("Failed to fetch folder contents");
      }

      const data = await response.json();
      const fetchedItems = (data.items || []).map((item: {
        uuid: string;
        name: string;
        path: string;
        size: number;
        mime?: string;
        mimeType?: string;
        modified?: number;
        modifiedAt?: string;
        isFolder: boolean;
      }) => ({
        cloudId: item.uuid,
        name: item.name,
        path: item.path,
        size: item.size || 0,
        mimeType: item.mime || item.mimeType || "application/octet-stream",
        modifiedAt: new Date(item.modified || item.modifiedAt || Date.now()),
        provider: providerId,
        isFolder: item.isFolder,
      }));

      // Sort: folders first, then by name
      fetchedItems.sort((a: CloudFile, b: CloudFile) => {
        if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      setItems(fetchedItems);
    } catch (err) {
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
      className={`flex flex-col h-full ${
        isDragOver || isDragTarget
          ? "bg-purple-500/10 border-purple-500/50"
          : "bg-white/[0.02]"
      } transition-colors`}
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

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground overflow-x-auto">
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
      </div>

      {/* Content: File List */}
      <div className="flex-1 overflow-y-auto">
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
                           hover:bg-white/5 transition-colors
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
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Drop Zone Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-purple-500/20 border-2 border-dashed border-purple-500/50 rounded-lg flex items-center justify-center pointer-events-none">
          <p className="text-purple-300 text-sm font-medium">Drop to copy here</p>
        </div>
      )}
    </div>
  );
}
