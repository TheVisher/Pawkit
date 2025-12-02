"use client";

import { Cloud, CheckCircle2, XCircle, Loader2, FolderOpen, Plus, ShieldCheck, Triangle, Box } from "lucide-react";
import type { CloudProviderId } from "@/lib/services/cloud-storage/types";

interface ProviderInfo {
  id: CloudProviderId;
  slug: string;
  name: string;
  connected: boolean;
  email?: string;
  status: "idle" | "connecting" | "syncing" | "error";
  lastSync: Date | null;
}

interface CloudProviderItemProps {
  provider: ProviderInfo;
  onBrowse?: () => void;
  onConnect?: () => void;
}

// Provider icons with Lucide icons and colors
const PROVIDER_CONFIG: Record<CloudProviderId, { icon: typeof Cloud; color: string; bgColor: string }> = {
  filen: { icon: ShieldCheck, color: "text-emerald-400", bgColor: "bg-emerald-500/20" },
  "google-drive": { icon: Triangle, color: "text-yellow-400", bgColor: "bg-yellow-500/20" },
  dropbox: { icon: Box, color: "text-blue-400", bgColor: "bg-blue-500/20" },
  onedrive: { icon: Cloud, color: "text-sky-400", bgColor: "bg-sky-500/20" },
};

export function CloudProviderItem({ provider, onBrowse, onConnect }: CloudProviderItemProps) {
  const isConnected = provider.connected;
  const isSyncing = provider.status === "syncing";
  const isConnecting = provider.status === "connecting";
  const hasError = provider.status === "error";

  const config = PROVIDER_CONFIG[provider.id] || { icon: Cloud, color: "text-muted-foreground", bgColor: "bg-white/5" };
  const Icon = config.icon;

  return (
    <div
      className={`
        flex items-center gap-3 p-2.5 rounded-lg transition-all
        ${isConnected
          ? "bg-white/5 border border-white/10 hover:border-purple-500/30"
          : "bg-white/[0.02] border border-white/5 hover:border-white/10"
        }
      `}
    >
      {/* Provider Icon */}
      <div className={`relative flex-shrink-0 w-8 h-8 rounded-lg ${isConnected ? config.bgColor : "bg-white/5"} flex items-center justify-center`}>
        <Icon className={`h-4 w-4 ${isConnected ? config.color : "text-muted-foreground"}`} />

        {/* Status indicator overlay */}
        {isConnected && (
          <div className="absolute -bottom-0.5 -right-0.5">
            {isSyncing ? (
              <div className="w-3 h-3 rounded-full bg-background flex items-center justify-center">
                <Loader2 className="h-2 w-2 animate-spin text-accent" />
              </div>
            ) : hasError ? (
              <div className="w-3 h-3 rounded-full bg-background flex items-center justify-center">
                <XCircle className="h-2.5 w-2.5 text-red-400" />
              </div>
            ) : (
              <div className="w-3 h-3 rounded-full bg-background flex items-center justify-center">
                <CheckCircle2 className="h-2.5 w-2.5 text-green-400" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Provider Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {provider.name}
        </p>
        {isConnected && provider.email && (
          <p className="text-xs text-muted-foreground truncate">
            {provider.email}
          </p>
        )}
        {!isConnected && (
          <p className="text-xs text-muted-foreground">
            Not connected
          </p>
        )}
      </div>

      {/* Action Button */}
      {isConnected ? (
        <button
          onClick={onBrowse}
          disabled={isConnecting || isSyncing}
          className="flex-shrink-0 p-1.5 rounded-md text-muted-foreground
                     hover:text-accent hover:bg-purple-500/10
                     transition-colors disabled:opacity-50"
          title={`Browse ${provider.name}`}
        >
          <FolderOpen className="h-4 w-4" />
        </button>
      ) : (
        <button
          onClick={onConnect}
          className="flex-shrink-0 p-1.5 rounded-md text-muted-foreground
                     hover:text-accent hover:bg-purple-500/10
                     transition-colors"
          title={`Connect ${provider.name}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
