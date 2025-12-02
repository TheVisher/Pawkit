"use client";

import { useState, useEffect } from "react";
import { Cloud, HardDrive, Cloudy, ShieldCheck, Triangle, Box, ChevronDown, Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { GlowButton } from "@/components/ui/glow-button";
import { useConnectorStore } from "@/lib/stores/connector-store";
import {
  useStorageStrategyStore,
  CONTENT_TYPE_CONFIG,
  type StorageProviderId,
  type ContentType,
  type BackupBehavior,
} from "@/lib/stores/storage-strategy-store";
import { useToastStore } from "@/lib/stores/toast-store";

// Provider configuration
const PROVIDER_CONFIG: Record<StorageProviderId, { name: string; icon: typeof Cloud; color: string }> = {
  filen: { name: "Filen", icon: ShieldCheck, color: "text-emerald-400" },
  "google-drive": { name: "Google Drive", icon: Triangle, color: "text-yellow-400" },
  dropbox: { name: "Dropbox", icon: Box, color: "text-blue-400" },
  onedrive: { name: "OneDrive", icon: Cloud, color: "text-sky-400" },
};

interface ProviderDropdownProps {
  value: StorageProviderId | null;
  onChange: (value: StorageProviderId | null) => void;
  connectedProviders: StorageProviderId[];
  allowNull?: boolean;
  nullLabel?: string;
  excludeProvider?: StorageProviderId | null;
}

function ProviderDropdown({
  value,
  onChange,
  connectedProviders,
  allowNull = false,
  nullLabel = "Select provider...",
  excludeProvider,
}: ProviderDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const availableProviders = connectedProviders.filter((p) => p !== excludeProvider);
  const selectedProvider = value ? PROVIDER_CONFIG[value] : null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg
                   bg-white/5 border border-white/10 hover:border-white/20
                   transition-colors text-sm"
      >
        {selectedProvider ? (
          <>
            <selectedProvider.icon className={`h-4 w-4 ${selectedProvider.color}`} />
            <span className="flex-1 text-left text-foreground">{selectedProvider.name}</span>
          </>
        ) : (
          <span className="flex-1 text-left text-muted-foreground">{nullLabel}</span>
        )}
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          {/* Dropdown */}
          <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-surface-90 border border-white/10 rounded-lg shadow-xl overflow-hidden">
            {allowNull && (
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setIsOpen(false);
                }}
                className={`flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-white/5 transition-colors ${
                  value === null ? "bg-white/5 text-accent" : "text-muted-foreground"
                }`}
              >
                <span className="flex-1 text-left">{nullLabel}</span>
                {value === null && <Check className="h-4 w-4" />}
              </button>
            )}
            {availableProviders.map((providerId) => {
              const provider = PROVIDER_CONFIG[providerId];
              const isSelected = value === providerId;

              return (
                <button
                  key={providerId}
                  type="button"
                  onClick={() => {
                    onChange(providerId);
                    setIsOpen(false);
                  }}
                  className={`flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-white/5 transition-colors ${
                    isSelected ? "bg-white/5 text-accent" : "text-foreground"
                  }`}
                >
                  <provider.icon className={`h-4 w-4 ${provider.color}`} />
                  <span className="flex-1 text-left">{provider.name}</span>
                  {isSelected && <Check className="h-4 w-4" />}
                </button>
              );
            })}
            {availableProviders.length === 0 && (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No providers available
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function StorageStrategySettings() {
  const toast = useToastStore();

  // Get connected providers from connector store
  const filenConnected = useConnectorStore((state) => state.filen.connected);
  const gdriveConnected = useConnectorStore((state) => state.googleDrive.connected);
  const dropboxConnected = useConnectorStore((state) => state.dropbox.connected);
  const onedriveConnected = useConnectorStore((state) => state.onedrive.connected);

  const connectedProviders: StorageProviderId[] = [
    ...(filenConnected ? ["filen" as const] : []),
    ...(gdriveConnected ? ["google-drive" as const] : []),
    ...(dropboxConnected ? ["dropbox" as const] : []),
    ...(onedriveConnected ? ["onedrive" as const] : []),
  ];

  // Storage strategy store
  const strategy = useStorageStrategyStore((state) => state.strategy);
  const setPrimaryProvider = useStorageStrategyStore((state) => state.setPrimaryProvider);
  const setSecondaryProvider = useStorageStrategyStore((state) => state.setSecondaryProvider);
  const setSecondaryEnabled = useStorageStrategyStore((state) => state.setSecondaryEnabled);
  const setBackupBehavior = useStorageStrategyStore((state) => state.setBackupBehavior);
  const setRoutingEnabled = useStorageStrategyStore((state) => state.setRoutingEnabled);
  const setRouteForType = useStorageStrategyStore((state) => state.setRouteForType);

  // Auto-select primary provider if none set and providers are connected
  useEffect(() => {
    if (!strategy.primaryProvider && connectedProviders.length > 0) {
      setPrimaryProvider(connectedProviders[0]);
    }
  }, [strategy.primaryProvider, connectedProviders, setPrimaryProvider]);

  // Clear secondary if it becomes unavailable
  useEffect(() => {
    if (strategy.secondaryProvider && !connectedProviders.includes(strategy.secondaryProvider)) {
      setSecondaryProvider(null);
      setSecondaryEnabled(false);
    }
  }, [strategy.secondaryProvider, connectedProviders, setSecondaryProvider, setSecondaryEnabled]);

  // Clear primary if it becomes unavailable
  useEffect(() => {
    if (strategy.primaryProvider && !connectedProviders.includes(strategy.primaryProvider)) {
      toast.warning("Your primary storage provider was disconnected. Please select a new one.");
      // Select next available provider or null
      const nextProvider = connectedProviders[0] || null;
      setPrimaryProvider(nextProvider);
    }
  }, [strategy.primaryProvider, connectedProviders, setPrimaryProvider, toast]);

  const handleSecondaryToggle = (enabled: boolean) => {
    setSecondaryEnabled(enabled);
    if (!enabled) {
      setSecondaryProvider(null);
    }
  };

  const handleRoutingToggle = (enabled: boolean) => {
    setRoutingEnabled(enabled);
    // Reset all routes to null (use primary) when disabling
    if (!enabled) {
      const contentTypes: ContentType[] = ["notes", "bookmarks", "images", "documents", "audio", "video", "other"];
      contentTypes.forEach((type) => setRouteForType(type, null));
    }
  };

  if (connectedProviders.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <Label className="text-gray-300">Storage Strategy</Label>
          <p className="text-sm text-gray-500 mt-1">
            Configure where your content is stored
          </p>
        </div>
        <div className="p-4 rounded-lg border border-white/10 bg-white/[0.02] text-center">
          <Cloud className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Connect a cloud provider in the Connectors tab to configure your storage strategy.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-gray-300">Storage Strategy</Label>
        <p className="text-sm text-gray-500 mt-1">
          Configure where your content is stored
        </p>
      </div>

      {/* Primary Provider */}
      <div className="p-4 rounded-lg border border-white/10 bg-white/[0.02] space-y-3">
        <div>
          <Label className="text-gray-300 text-sm">Primary Provider</Label>
          <p className="text-xs text-gray-500 mt-0.5">
            The default destination for all your content
          </p>
        </div>
        <ProviderDropdown
          value={strategy.primaryProvider}
          onChange={(p) => p && setPrimaryProvider(p)}
          connectedProviders={connectedProviders}
        />
      </div>

      {/* Secondary Provider */}
      <div className="p-4 rounded-lg border border-white/10 bg-white/[0.02] space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-gray-300 text-sm">Enable Secondary Backup</Label>
            <p className="text-xs text-gray-500 mt-0.5">
              Sync files to both primary and secondary providers
            </p>
          </div>
          <input
            type="checkbox"
            className="h-5 w-5 rounded"
            checked={strategy.secondaryEnabled}
            onChange={(e) => handleSecondaryToggle(e.target.checked)}
            disabled={connectedProviders.length < 2}
          />
        </div>

        {strategy.secondaryEnabled && (
          <div className="pt-2 border-t border-white/5 space-y-4">
            <div>
              <Label className="text-gray-400 text-xs mb-2 block">Secondary Provider</Label>
              <ProviderDropdown
                value={strategy.secondaryProvider}
                onChange={setSecondaryProvider}
                connectedProviders={connectedProviders}
                allowNull
                nullLabel="Select secondary provider..."
                excludeProvider={strategy.primaryProvider}
              />
            </div>

            {/* Backup Behavior */}
            {strategy.secondaryProvider && (
              <div>
                <Label className="text-gray-400 text-xs mb-2 block">Backup Behavior</Label>
                <div className="space-y-2">
                  <label className="flex items-start gap-3 p-3 rounded-lg border border-white/10 hover:bg-white/5 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="backupBehavior"
                      value="mirror"
                      checked={strategy.backupBehavior === "mirror"}
                      onChange={() => setBackupBehavior("mirror")}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-sm font-medium text-foreground">Mirror</div>
                      <div className="text-xs text-muted-foreground">
                        Deleting a file removes it from both primary and backup
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 rounded-lg border border-white/10 hover:bg-white/5 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="backupBehavior"
                      value="independent"
                      checked={strategy.backupBehavior === "independent"}
                      onChange={() => setBackupBehavior("independent")}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-sm font-medium text-foreground">Independent backup</div>
                      <div className="text-xs text-muted-foreground">
                        Deleting a file only removes from primary. Backup copy is preserved until manually deleted.
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        {connectedProviders.length < 2 && (
          <p className="text-xs text-muted-foreground">
            Connect at least 2 providers to enable secondary backup
          </p>
        )}
      </div>

      {/* Content Type Routing */}
      <div className="p-4 rounded-lg border border-white/10 bg-white/[0.02] space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-gray-300 text-sm">Route by Content Type</Label>
            <p className="text-xs text-gray-500 mt-0.5">
              Override primary provider for specific file types
            </p>
          </div>
          <input
            type="checkbox"
            className="h-5 w-5 rounded"
            checked={strategy.routingEnabled}
            onChange={(e) => handleRoutingToggle(e.target.checked)}
          />
        </div>

        {strategy.routingEnabled && (
          <div className="pt-3 border-t border-white/5 space-y-2">
            {(Object.entries(CONTENT_TYPE_CONFIG) as [ContentType, { label: string; emoji: string }][]).map(
              ([type, config]) => {
                const currentRoute = strategy.routing[type];
                const effectiveProvider = currentRoute || strategy.primaryProvider;
                const providerConfig = effectiveProvider ? PROVIDER_CONFIG[effectiveProvider] : null;

                return (
                  <div key={type} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <span>{config.emoji}</span>
                      <span className="text-sm text-foreground">{config.label}</span>
                    </div>
                    <div className="flex-1 max-w-[200px]">
                      <ProviderDropdown
                        value={currentRoute}
                        onChange={(p) => setRouteForType(type, p)}
                        connectedProviders={connectedProviders}
                        allowNull
                        nullLabel={
                          strategy.primaryProvider
                            ? `Use primary (${PROVIDER_CONFIG[strategy.primaryProvider].name})`
                            : "Use primary"
                        }
                      />
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>

      {/* Current Strategy Summary */}
      <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
        <p className="text-xs text-purple-300">
          <span className="font-medium">Current strategy:</span>{" "}
          {strategy.primaryProvider ? (
            <>
              Content syncs to {PROVIDER_CONFIG[strategy.primaryProvider].name}
              {strategy.secondaryEnabled && strategy.secondaryProvider && (
                <> + {PROVIDER_CONFIG[strategy.secondaryProvider].name} backup</>
              )}
              {strategy.routingEnabled && (
                <> with custom routing per content type</>
              )}
            </>
          ) : (
            "No primary provider selected"
          )}
        </p>
      </div>
    </div>
  );
}
