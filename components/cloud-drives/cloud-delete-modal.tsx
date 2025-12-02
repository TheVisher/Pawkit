"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Triangle, Box, Cloud } from "lucide-react";
import type { StorageProviderId } from "@/lib/stores/storage-strategy-store";

const PROVIDER_CONFIG: Record<StorageProviderId, { name: string; icon: typeof Cloud; color: string }> = {
  filen: { name: "Filen", icon: ShieldCheck, color: "text-emerald-400" },
  "google-drive": { name: "Google Drive", icon: Triangle, color: "text-yellow-400" },
  dropbox: { name: "Dropbox", icon: Box, color: "text-blue-400" },
  onedrive: { name: "OneDrive", icon: Cloud, color: "text-sky-400" },
};

interface CloudDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  primaryProvider: StorageProviderId;
  secondaryProvider: StorageProviderId | null;
  onConfirm: (deleteFromBackup: boolean) => void;
}

export function CloudDeleteModal({
  isOpen,
  onClose,
  fileName,
  primaryProvider,
  secondaryProvider,
  onConfirm,
}: CloudDeleteModalProps) {
  const [deleteFromBackup, setDeleteFromBackup] = useState(false);

  const primaryConfig = PROVIDER_CONFIG[primaryProvider];
  const secondaryConfig = secondaryProvider ? PROVIDER_CONFIG[secondaryProvider] : null;

  const handleConfirm = () => {
    onConfirm(deleteFromBackup);
    onClose();
    // Reset for next use
    setDeleteFromBackup(false);
  };

  const handleClose = () => {
    onClose();
    setDeleteFromBackup(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete &ldquo;{fileName}&rdquo;?</DialogTitle>
          <DialogDescription>
            This file exists in multiple locations:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File locations */}
          <ul className="text-sm space-y-2">
            <li className="flex items-center gap-2">
              <primaryConfig.icon className={`h-4 w-4 ${primaryConfig.color}`} />
              <span>{primaryConfig.name}</span>
              <span className="text-xs text-muted-foreground">(primary)</span>
            </li>
            {secondaryConfig && (
              <li className="flex items-center gap-2">
                <secondaryConfig.icon className={`h-4 w-4 ${secondaryConfig.color}`} />
                <span>{secondaryConfig.name}</span>
                <span className="text-xs text-muted-foreground">(backup)</span>
              </li>
            )}
          </ul>

          {/* Delete options */}
          <div className="space-y-2">
            <label className="flex items-start gap-3 p-3 rounded-lg border border-white/10 hover:bg-white/5 cursor-pointer transition-colors">
              <input
                type="radio"
                name="deleteScope"
                checked={!deleteFromBackup}
                onChange={() => setDeleteFromBackup(false)}
                className="mt-0.5"
              />
              <div>
                <div className="text-sm font-medium text-foreground">Delete from primary only</div>
                <div className="text-xs text-muted-foreground">
                  Backup copy will be preserved in {secondaryConfig?.name}
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-lg border border-white/10 hover:bg-white/5 cursor-pointer transition-colors">
              <input
                type="radio"
                name="deleteScope"
                checked={deleteFromBackup}
                onChange={() => setDeleteFromBackup(true)}
                className="mt-0.5"
              />
              <div>
                <div className="text-sm font-medium text-foreground">Delete from both</div>
                <div className="text-xs text-muted-foreground">
                  Remove from primary and backup permanently
                </div>
              </div>
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
