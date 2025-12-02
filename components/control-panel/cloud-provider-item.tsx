"use client";

import { Cloud, CheckCircle2, XCircle, Loader2, FolderOpen, Plus } from "lucide-react";
import Image from "next/image";
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

// Provider icons/logos
const PROVIDER_ICONS: Record<CloudProviderId, string> = {
  filen: "/icons/filen.svg",
  "google-drive": "/icons/google-drive.svg",
  dropbox: "/icons/dropbox.svg",
  onedrive: "/icons/onedrive.svg",
};

export function CloudProviderItem({ provider, onBrowse, onConnect }: CloudProviderItemProps) {
  const isConnected = provider.connected;
  const isSyncing = provider.status === "syncing";
  const isConnecting = provider.status === "connecting";
  const hasError = provider.status === "error";

  const iconSrc = PROVIDER_ICONS[provider.id];

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
      <div className="relative flex-shrink-0 w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden">
        {iconSrc ? (
          <Image
            src={iconSrc}
            alt={provider.name}
            width={20}
            height={20}
            className="object-contain"
          />
        ) : (
          <Cloud className="h-4 w-4 text-muted-foreground" />
        )}

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
