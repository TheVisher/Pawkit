"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { X, GripVertical } from "lucide-react";
import { CloudSplitPane } from "./cloud-split-pane";
import { transferFile } from "@/lib/services/cloud-storage/transfer-service";
import { useConnectorStore } from "@/lib/stores/connector-store";
import { useToastStore } from "@/lib/stores/toast-store";
import type { CloudFile, CloudProviderId } from "@/lib/services/cloud-storage/types";

interface CloudDrivesSplitViewProps {
  onClose: () => void;
  initialLeftProvider?: CloudProviderId;
  initialRightProvider?: CloudProviderId;
}

interface ProviderOption {
  id: CloudProviderId;
  name: string;
  slug: string;
}

const STORAGE_KEY = "cloud-drives-split-position";

export function CloudDrivesSplitView({
  onClose,
  initialLeftProvider,
  initialRightProvider,
}: CloudDrivesSplitViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Get connected providers from store
  const filenConnected = useConnectorStore((state) => state.filen.connected);
  const gdriveConnected = useConnectorStore((state) => state.googleDrive.connected);
  const dropboxConnected = useConnectorStore((state) => state.dropbox.connected);
  const onedriveConnected = useConnectorStore((state) => state.onedrive.connected);

  const connectedProviders: ProviderOption[] = [
    ...(filenConnected ? [{ id: "filen" as const, name: "Filen", slug: "filen" }] : []),
    ...(gdriveConnected ? [{ id: "google-drive" as const, name: "Google Drive", slug: "gdrive" }] : []),
    ...(dropboxConnected ? [{ id: "dropbox" as const, name: "Dropbox", slug: "dropbox" }] : []),
    ...(onedriveConnected ? [{ id: "onedrive" as const, name: "OneDrive", slug: "onedrive" }] : []),
  ];

  // State
  const [leftProvider, setLeftProvider] = useState<CloudProviderId>(
    initialLeftProvider || connectedProviders[0]?.id || "filen"
  );
  const [rightProvider, setRightProvider] = useState<CloudProviderId>(
    initialRightProvider || connectedProviders[1]?.id || connectedProviders[0]?.id || "google-drive"
  );
  const [leftPath, setLeftPath] = useState("/Pawkit");
  const [rightPath, setRightPath] = useState("/Pawkit");

  // Divider state
  const [dividerPosition, setDividerPosition] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? parseFloat(stored) : 50;
    }
    return 50;
  });
  const [isDragging, setIsDragging] = useState(false);

  // Drag and drop state
  const [draggedFile, setDraggedFile] = useState<CloudFile | null>(null);
  const [dragTargetPane, setDragTargetPane] = useState<"left" | "right" | null>(null);

  // Toast store
  const toast = useToastStore();

  // Divider drag handlers
  const handleDividerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);

      const startX = e.clientX;
      const startPos = dividerPosition;

      const handleMouseMove = (e: MouseEvent) => {
        if (!containerRef.current) return;
        const containerWidth = containerRef.current.offsetWidth;
        const delta = e.clientX - startX;
        const deltaPercent = (delta / containerWidth) * 100;
        const newPos = Math.min(80, Math.max(20, startPos + deltaPercent));
        setDividerPosition(newPos);
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        // Save position
        localStorage.setItem(STORAGE_KEY, String(dividerPosition));
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [dividerPosition]
  );

  const handleDividerDoubleClick = useCallback(() => {
    setDividerPosition(50);
    localStorage.setItem(STORAGE_KEY, "50");
  }, []);

  // Save divider position on change
  useEffect(() => {
    if (!isDragging) {
      localStorage.setItem(STORAGE_KEY, String(dividerPosition));
    }
  }, [dividerPosition, isDragging]);

  // File drag handlers
  const handleFileDragStart = useCallback((file: CloudFile, e: React.DragEvent) => {
    setDraggedFile(file);
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        file,
        sourceProvider: file.provider,
      })
    );
    e.dataTransfer.effectAllowed = "copy";
  }, []);

  const handleFileDrop = useCallback(
    async (targetPane: "left" | "right", targetPath: string) => {
      if (!draggedFile) return;

      const targetProvider = targetPane === "left" ? leftProvider : rightProvider;

      // Can't drop to same provider
      if (draggedFile.provider === targetProvider) {
        toast.warning("Can't copy to the same provider");
        setDraggedFile(null);
        setDragTargetPane(null);
        return;
      }

      // Start transfer
      const loadingToast = toast.loading(`Copying ${draggedFile.name}...`);

      const result = await transferFile({
        sourceProvider: draggedFile.provider,
        sourceFile: draggedFile,
        targetProvider,
        targetPath,
        onProgress: (percent, status) => {
          // Could update toast here
        },
      });

      toast.dismissToast(loadingToast);

      if (result.success) {
        toast.success(`Copied ${draggedFile.name}`);
      } else {
        toast.error(result.error || "Transfer failed");
      }

      setDraggedFile(null);
      setDragTargetPane(null);
    },
    [draggedFile, leftProvider, rightProvider, toast]
  );

  // Not enough providers connected
  if (connectedProviders.length < 2) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="bg-surface-90 border border-white/10 rounded-2xl p-8 max-w-md text-center">
          <h2 className="text-xl font-semibold text-white mb-4">
            Connect More Providers
          </h2>
          <p className="text-muted-foreground mb-6">
            You need at least 2 cloud providers connected to use Split View for
            transferring files between them.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-purple-500/20 text-purple-300 rounded-lg
                       hover:bg-purple-500/30 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div>
          <h2 className="text-lg font-semibold text-white">Split View</h2>
          <p className="text-sm text-muted-foreground">
            Drag files between providers to copy them
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
          title="Close split view"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Split Panes */}
      <div
        ref={containerRef}
        className={`flex-1 flex overflow-hidden ${isDragging ? "cursor-col-resize select-none" : ""}`}
      >
        {/* Left Pane */}
        <div style={{ width: `${dividerPosition}%` }} className="relative h-full">
          <CloudSplitPane
            providerId={leftProvider}
            onProviderChange={setLeftProvider}
            connectedProviders={connectedProviders}
            currentPath={leftPath}
            onNavigate={setLeftPath}
            onFileDragStart={handleFileDragStart}
            onFileDrop={(path) => handleFileDrop("left", path)}
            isDragTarget={dragTargetPane === "left"}
          />
        </div>

        {/* Divider */}
        <div
          onMouseDown={handleDividerMouseDown}
          onDoubleClick={handleDividerDoubleClick}
          className={`flex-shrink-0 w-2 bg-white/5 hover:bg-purple-500/20
                     transition-colors cursor-col-resize
                     flex items-center justify-center
                     ${isDragging ? "bg-purple-500/30" : ""}`}
        >
          <GripVertical className="h-6 w-6 text-muted-foreground/50" />
        </div>

        {/* Right Pane */}
        <div style={{ width: `${100 - dividerPosition}%` }} className="relative h-full">
          <CloudSplitPane
            providerId={rightProvider}
            onProviderChange={setRightProvider}
            connectedProviders={connectedProviders}
            currentPath={rightPath}
            onNavigate={setRightPath}
            onFileDragStart={handleFileDragStart}
            onFileDrop={(path) => handleFileDrop("right", path)}
            isDragTarget={dragTargetPane === "right"}
          />
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex-shrink-0 px-6 py-3 border-t border-white/10 bg-white/[0.02]">
        <p className="text-xs text-muted-foreground text-center">
          {draggedFile
            ? `Dragging: ${draggedFile.name}`
            : "Drag files from one pane to the other to copy them"}
        </p>
      </div>
    </div>
  );
}
