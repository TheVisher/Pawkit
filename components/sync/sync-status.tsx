"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle } from "lucide-react";
import { syncQueue } from "@/lib/services/sync-queue";
import { useSettingsStore } from "@/lib/hooks/settings-store";
import { useEventStore } from "@/lib/hooks/use-event-store";
import { useFileStore } from "@/lib/stores/file-store";
import {
  formatFileSize,
  getStorageUsagePercent,
  STORAGE_SOFT_LIMIT,
} from "@/lib/utils/file-utils";

type SyncState =
  | { status: "synced"; lastSync: number }
  | { status: "syncing"; progress: string }
  | { status: "offline"; pendingCount: number }
  | { status: "error"; message: string }
  | { status: "pending"; pendingCount: number };

export function SyncStatus() {
  const [syncState, setSyncState] = useState<SyncState>({ status: "synced", lastSync: Date.now() });
  const [isOnline, setIsOnline] = useState(true);
  const [mounted, setMounted] = useState(false);
  const serverSync = useSettingsStore((state) => state.serverSync);
  const setServerSync = useSettingsStore((state) => state.setServerSync);
  const syncEvents = useEventStore((state) => state.sync);
  const isEventsSyncing = useEventStore((state) => state.isSyncing);

  // File store for storage indicator
  const totalSize = useFileStore((state) => state.totalSize);
  const loadFiles = useFileStore((state) => state.loadFiles);
  const isFilesLoaded = useFileStore((state) => state.isLoaded);

  // Handle mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load files for storage indicator
  useEffect(() => {
    if (mounted && !isFilesLoaded) {
      loadFiles();
    }
  }, [mounted, isFilesLoaded, loadFiles]);

  // Check online status
  useEffect(() => {
    if (!mounted) return;

    const updateOnlineStatus = () => setIsOnline(navigator.onLine);

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, [mounted]);

  // Check sync queue periodically
  useEffect(() => {
    if (!mounted || !serverSync) return;

    const checkQueue = async () => {
      if (isEventsSyncing) {
        setSyncState({ status: "syncing", progress: "Syncing events..." });
        return;
      }

      const pending = await syncQueue.getPending();

      if (!isOnline && pending.length > 0) {
        setSyncState({ status: "offline", pendingCount: pending.length });
      } else if (pending.length > 0) {
        setSyncState({ status: "pending", pendingCount: pending.length });
      } else {
        setSyncState({ status: "synced", lastSync: Date.now() });
      }
    };

    checkQueue();
    const interval = setInterval(checkQueue, 3000);

    return () => clearInterval(interval);
  }, [isOnline, mounted, serverSync, isEventsSyncing]);

  // Manual sync
  const handleSync = async () => {
    if (!serverSync || !isOnline) return;

    setSyncState({ status: "syncing", progress: "Syncing..." });

    try {
      await Promise.all([
        syncQueue.process(),
        syncEvents(),
      ]);
      setSyncState({ status: "synced", lastSync: Date.now() });
    } catch (error) {
      setSyncState({
        status: "error",
        message: error instanceof Error ? error.message : "Sync failed"
      });
    }
  };

  // Format last sync time
  const formatLastSync = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  // Don't render until mounted
  if (!mounted) {
    return null;
  }

  // Handle toggle
  const handleToggleSync = () => {
    setServerSync(!serverSync);
  };

  // Storage calculations
  const usagePercent = getStorageUsagePercent(totalSize);
  const usedFormatted = formatFileSize(totalSize);
  const limitFormatted = formatFileSize(STORAGE_SOFT_LIMIT);

  // Get storage bar color based on usage
  const getStorageBarColor = () => {
    if (usagePercent >= 80) return "bg-red-500";
    if (usagePercent >= 50) return "bg-amber-500";
    return "bg-green-500";
  };

  // Get sync status info
  const getSyncStatusInfo = () => {
    if (!serverSync) {
      return { icon: null, text: "Local only", color: "text-muted-foreground" };
    }

    switch (syncState.status) {
      case "synced":
        return {
          icon: <Check className="w-3 h-3 text-green-500" />,
          text: formatLastSync(syncState.lastSync),
          color: "text-muted-foreground"
        };
      case "syncing":
        return {
          icon: <RefreshCw className="w-3 h-3 text-blue-500 animate-spin" />,
          text: "Syncing...",
          color: "text-blue-400"
        };
      case "offline":
        return {
          icon: <CloudOff className="w-3 h-3 text-orange-500" />,
          text: `${syncState.pendingCount} pending`,
          color: "text-orange-400"
        };
      case "pending":
        return {
          icon: <Cloud className="w-3 h-3 text-yellow-500" />,
          text: `${syncState.pendingCount} pending`,
          color: "text-yellow-400"
        };
      case "error":
        return {
          icon: <AlertCircle className="w-3 h-3 text-red-500" />,
          text: "Sync failed",
          color: "text-red-400"
        };
    }
  };

  const statusInfo = getSyncStatusInfo();
  const isSyncing = syncState.status === "syncing";

  return (
    <div className="px-3 py-3 border-t border-white/5 space-y-3">
      {/* Storage Bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${getStorageBarColor()}`}
            style={{ width: `${Math.min(usagePercent, 100)}%` }}
          />
        </div>
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
          {usedFormatted} / {limitFormatted}
        </span>
      </div>

      {/* Sync Row - Single Line */}
      <div className="flex items-center justify-between">
        {/* Left: Cloud toggle */}
        <button
          onClick={handleToggleSync}
          className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
          title={serverSync ? "Disable server sync" : "Enable server sync"}
        >
          {serverSync ? (
            <Cloud className="w-4 h-4 text-blue-500" />
          ) : (
            <CloudOff className="w-4 h-4 text-muted-foreground" />
          )}
          <div
            className={`relative w-7 h-4 rounded-full transition-colors ${
              serverSync ? "bg-blue-500" : "bg-white/10"
            }`}
          >
            <div
              className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                serverSync ? "translate-x-3.5" : "translate-x-0.5"
              }`}
            />
          </div>
        </button>

        {/* Center: Status */}
        <div className={`flex items-center gap-1.5 text-[11px] ${statusInfo.color}`}>
          {statusInfo.icon}
          <span>{statusInfo.text}</span>
        </div>

        {/* Right: Sync button + Online indicator */}
        <div className="flex items-center gap-2">
          {serverSync && (
            <button
              onClick={handleSync}
              disabled={isSyncing || !isOnline}
              className="p-1 hover:bg-white/10 rounded transition-colors disabled:opacity-50"
              title="Sync now"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${isSyncing ? "animate-spin" : ""}`} />
            </button>
          )}
          {/* Online indicator - small signal bars */}
          <div
            className="flex items-end gap-[2px]"
            title={isOnline ? "Online" : "Offline"}
          >
            <div className={`w-[3px] h-[5px] rounded-[1px] ${isOnline ? "bg-green-500" : "bg-red-500"}`} />
            <div className={`w-[3px] h-[8px] rounded-[1px] ${isOnline ? "bg-green-500" : "bg-red-500"}`} />
            <div className={`w-[3px] h-[11px] rounded-[1px] ${isOnline ? "bg-green-500" : "bg-gray-600"}`} />
          </div>
        </div>
      </div>
    </div>
  );
}
