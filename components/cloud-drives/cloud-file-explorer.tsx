"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, RefreshCw, Loader2, List, FolderTree } from "lucide-react";
import { useRouter } from "next/navigation";
import { GlowButton } from "@/components/ui/glow-button";
import { CloudBreadcrumb } from "./cloud-breadcrumb";
import { CloudFileList } from "./cloud-file-list";
import { CloudFilePreview } from "./cloud-file-preview";
import { CloudUploadButton } from "./cloud-upload-button";
import { CloudFolderTree } from "./cloud-folder-tree";
import { cloudStorage } from "@/lib/services/cloud-storage";
import { useToastStore } from "@/lib/stores/toast-store";
import { useCloudDrivesStore } from "@/lib/stores/cloud-drives-store";
import type { CloudFile, CloudProviderId } from "@/lib/services/cloud-storage/types";

const VIEW_MODE_KEY = "cloud-drives-view-mode";

interface CloudFileExplorerProps {
  providerId: CloudProviderId;
  providerName: string;
}

export function CloudFileExplorer({ providerId, providerName }: CloudFileExplorerProps) {
  const router = useRouter();
  const [currentPath, setCurrentPath] = useState("/Pawkit");
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<CloudFile | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "tree">(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(VIEW_MODE_KEY);
      return (stored === "list" || stored === "tree") ? stored : "tree";
    }
    return "tree";
  });
  const toast = useToastStore();

  // Persist view mode preference
  useEffect(() => {
    localStorage.setItem(VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

  // Cloud drives store for sidebar selection
  const setStoreSelectedFile = useCloudDrivesStore((state) => state.setSelectedFile);
  const clearStoreSelection = useCloudDrivesStore((state) => state.clearSelection);

  const loadFolder = useCallback(async (path: string) => {
    setLoading(true);
    try {
      const provider = cloudStorage.getProvider(providerId);
      if (!provider) {
        toast.error("Provider not found");
        return;
      }

      const result = await provider.listFiles(path);
      setFiles(result);
    } catch (error) {
      console.error("[CloudFileExplorer] Failed to load folder:", error);
      toast.error("Failed to load folder");
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [providerId, toast]);

  useEffect(() => {
    loadFolder(currentPath);
  }, [currentPath, loadFolder]);

  const handleNavigate = (path: string) => {
    setCurrentPath(path || "/Pawkit");
    // Clear file selection when navigating to a new folder
    clearStoreSelection();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFolder(currentPath);
    setRefreshing(false);
    toast.success("Refreshed");
  };

  const handleDownload = async (file: CloudFile) => {
    try {
      const provider = cloudStorage.getProvider(providerId);
      if (!provider) return;

      toast.info(`Downloading ${file.name}...`);
      const blob = await provider.downloadFile(file.cloudId);

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Downloaded ${file.name}`);
    } catch (error) {
      console.error("[CloudFileExplorer] Download failed:", error);
      toast.error("Download failed");
    }
  };

  const handleDelete = async (file: CloudFile) => {
    const confirmed = window.confirm(`Delete "${file.name}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      const provider = cloudStorage.getProvider(providerId);
      if (!provider) return;

      await provider.deleteFile(file.cloudId);
      toast.success(`Deleted ${file.name}`);

      // Refresh the file list
      await loadFolder(currentPath);
    } catch (error) {
      console.error("[CloudFileExplorer] Delete failed:", error);
      toast.error("Delete failed");
    }
  };

  const handlePreview = (file: CloudFile) => {
    // Update store for sidebar selection (single click)
    setStoreSelectedFile(file);
    // Also set local state and open preview modal
    setSelectedFile(file);
    setShowPreview(true);
  };

  const handleUploadComplete = () => {
    // Refresh the file list after upload
    loadFolder(currentPath);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/cloud-drives")}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Back to Cloud Drives"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-semibold text-white">{providerName}</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded transition-colors ${
                viewMode === "list"
                  ? "bg-purple-500/20 text-purple-400"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
              title="List View"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("tree")}
              className={`p-1.5 rounded transition-colors ${
                viewMode === "tree"
                  ? "bg-purple-500/20 text-purple-400"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
              title="Tree View"
            >
              <FolderTree className="h-4 w-4" />
            </button>
          </div>

          <CloudUploadButton
            providerId={providerId}
            currentPath={currentPath}
            onUploadComplete={handleUploadComplete}
          />
          <GlowButton
            onClick={handleRefresh}
            variant="primary"
            size="sm"
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </GlowButton>
        </div>
      </div>

      {/* Breadcrumb - only show in list view */}
      {viewMode === "list" && (
        <div className="mb-4 px-2">
          <CloudBreadcrumb path={currentPath} onNavigate={handleNavigate} />
        </div>
      )}

      {/* File view - list or tree */}
      <div className="flex-1 overflow-auto">
        {viewMode === "tree" ? (
          <div className="p-2">
            <CloudFolderTree
              providerId={providerId}
              onFileSelect={(file) => {
                setStoreSelectedFile(file);
                setSelectedFile(file);
                setShowPreview(true);
              }}
              selectedFileId={selectedFile?.cloudId}
              rootPath="/Pawkit"
            />
          </div>
        ) : (
          <CloudFileList
            files={files}
            loading={loading}
            currentPath={currentPath}
            onNavigate={handleNavigate}
            onDownload={handleDownload}
            onDelete={handleDelete}
            onPreview={handlePreview}
          />
        )}
      </div>

      {/* Preview modal */}
      {showPreview && selectedFile && (
        <CloudFilePreview
          file={selectedFile}
          providerId={providerId}
          onClose={() => {
            setShowPreview(false);
            setSelectedFile(null);
          }}
          onDownload={() => handleDownload(selectedFile)}
        />
      )}
    </div>
  );
}
