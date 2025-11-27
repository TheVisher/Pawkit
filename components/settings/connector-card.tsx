"use client";

import { Loader2, Settings } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { GlowButton } from "@/components/ui/glow-button";

export type ConnectorStatus =
  | "connected"
  | "disconnected"
  | "coming_soon"
  | "syncing"
  | "error";

interface ConnectorCardProps {
  name: string;
  description: string;
  icon: React.ReactNode;
  status: ConnectorStatus;
  category: string;
  lastSync?: Date | null;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onSettings?: () => void;
}

export function ConnectorCard({
  name,
  description,
  icon,
  status,
  category,
  lastSync,
  onConnect,
  onDisconnect,
  onSettings,
}: ConnectorCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 transition-all duration-200",
        "backdrop-blur-md bg-white/5 border-white/10",
        status === "connected" && "border-purple-500/30",
        status === "error" && "border-rose-500/30"
      )}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className={cn(
            "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl",
            "backdrop-blur-sm bg-white/5 border border-white/10",
            status === "connected" && "bg-purple-500/10 border-purple-500/20"
          )}
        >
          {icon}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white">{name}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-400">
              {category}
            </span>
            {status === "connected" && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30 text-green-400">
                Connected
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400 mt-1">{description}</p>

          {/* Status / Last sync */}
          {status === "connected" && lastSync && (
            <p className="text-xs text-gray-500 mt-2">
              Last synced: {formatDistanceToNow(lastSync)} ago
            </p>
          )}
          {status === "error" && (
            <p className="text-xs text-rose-400 mt-2">
              Connection error - please reconnect
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {status === "coming_soon" && (
            <span className="text-xs text-gray-500 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
              Coming Soon
            </span>
          )}

          {status === "disconnected" && (
            <GlowButton onClick={onConnect} size="sm" variant="primary">
              Connect
            </GlowButton>
          )}

          {status === "connected" && (
            <div className="flex items-center gap-2">
              <button
                onClick={onSettings}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                aria-label="Connector settings"
              >
                <Settings className="h-4 w-4" />
              </button>
              <GlowButton onClick={onDisconnect} size="sm" variant="danger">
                Disconnect
              </GlowButton>
            </div>
          )}

          {status === "syncing" && (
            <div className="flex items-center gap-2 text-purple-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">Syncing...</span>
            </div>
          )}

          {status === "error" && (
            <GlowButton onClick={onConnect} size="sm" variant="danger">
              Reconnect
            </GlowButton>
          )}
        </div>
      </div>
    </div>
  );
}
