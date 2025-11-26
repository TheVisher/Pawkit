"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudOff, RefreshCw, CheckCircle2, AlertCircle, Clock, Wifi, WifiOff } from "lucide-react";
import { syncQueue } from "@/lib/services/sync-queue";
import { useSettingsStore } from "@/lib/hooks/settings-store";
import { useEventStore } from "@/lib/hooks/use-event-store";

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

  // Handle mounting
  useEffect(() => {
    setMounted(true);
  }, []);

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
      // If events are currently syncing, show syncing state
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
    const interval = setInterval(checkQueue, 3000); // Check every 3 seconds

    return () => clearInterval(interval);
  }, [isOnline, mounted, serverSync, isEventsSyncing]);

  // Manual sync
  const handleSync = async () => {
    if (!serverSync || !isOnline) return;

    setSyncState({ status: "syncing", progress: "Syncing..." });

    try {
      // Sync both cards (via queue) and events in parallel
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

  // Don't render until mounted (prevents hydration issues)
  if (!mounted) {
    return null;
  }

  // Handle toggle
  const handleToggleSync = () => {
    setServerSync(!serverSync);
  };

  // Render based on state
  const renderStatus = () => {
    switch (syncState.status) {
      case "synced":
        return (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                <span>All changes saved</span>
              </div>
              <span className="text-[10px] opacity-60">
                {formatLastSync(syncState.lastSync)}
              </span>
            </div>
            <button
              onClick={handleSync}
              className="flex items-center justify-between w-full hover:text-foreground transition-colors"
            >
              <span>Sync now</span>
              <kbd className="px-2 py-0.5 rounded bg-white/10 font-mono text-xs flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />
              </kbd>
            </button>
          </>
        );

      case "syncing":
        return (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-3.5 w-3.5 text-blue-500 animate-spin" />
                <span>{syncState.progress}</span>
              </div>
            </div>
          </>
        );

      case "offline":
        return (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CloudOff className="h-3.5 w-3.5 text-orange-500" />
                <span>Offline</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-orange-400">
              <span>{syncState.pendingCount} change{syncState.pendingCount !== 1 ? "s" : ""} pending</span>
              <Clock className="h-3.5 w-3.5" />
            </div>
            <p className="text-[10px] opacity-60 mt-1">
              Will sync when connection restored
            </p>
          </>
        );

      case "pending":
        return (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="h-3.5 w-3.5 text-yellow-500" />
                <span>Changes pending</span>
              </div>
            </div>
            <button
              onClick={handleSync}
              className="flex items-center justify-between w-full hover:text-foreground transition-colors text-yellow-400"
            >
              <span>Sync {syncState.pendingCount} change{syncState.pendingCount !== 1 ? "s" : ""}</span>
              <kbd className="px-2 py-0.5 rounded bg-white/10 font-mono text-xs flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />
              </kbd>
            </button>
          </>
        );

      case "error":
        return (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                <span>Sync failed</span>
              </div>
            </div>
            <button
              onClick={handleSync}
              className="flex items-center justify-between w-full hover:text-foreground transition-colors text-red-400"
            >
              <span>Retry sync</span>
              <kbd className="px-2 py-0.5 rounded bg-white/10 font-mono text-xs flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />
              </kbd>
            </button>
            <p className="text-[10px] opacity-60 mt-1 truncate">
              {syncState.message}
            </p>
          </>
        );
    }
  };

  return (
    <div className="px-4 py-3 border-t border-white/5">
      <div className="text-xs text-muted-foreground space-y-2">
        {/* Online/Offline Indicator */}
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <>
                <Wifi className="h-3.5 w-3.5 text-green-500" />
                <span className="text-green-500">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5 text-orange-500" />
                <span className="text-orange-500">Offline</span>
              </>
            )}
          </div>
        </div>

        {/* Sync Mode Toggle */}
        <button
          onClick={handleToggleSync}
          className="flex items-center justify-between w-full hover:bg-white/5 -mx-1 px-1 py-1 rounded transition-colors"
        >
          <div className="flex items-center gap-2">
            {serverSync ? (
              <>
                <Cloud className="h-3.5 w-3.5 text-blue-500" />
                <span>Server Sync</span>
              </>
            ) : (
              <>
                <CloudOff className="h-3.5 w-3.5" />
                <span>Local-only</span>
              </>
            )}
          </div>
          <div
            className={`relative w-9 h-5 rounded-full transition-colors ${
              serverSync ? "bg-blue-500" : "bg-white/10"
            }`}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                serverSync ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </div>
        </button>

        {/* Sync Status - Only show when server sync is enabled */}
        {serverSync && (
          <div className="pt-2 border-t border-white/5 space-y-2">
            {renderStatus()}
          </div>
        )}

        {/* Explanation when local-only mode */}
        {!serverSync && (
          <p className="text-[10px] opacity-60 pt-1">
            Changes are stored locally only
          </p>
        )}
      </div>
    </div>
  );
}
