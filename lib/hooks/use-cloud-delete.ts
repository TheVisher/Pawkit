/**
 * Cloud Delete Hook
 *
 * Handles the delete flow for cloud files based on backup behavior settings.
 * Shows confirmation modal in independent backup mode.
 */

import { useState, useCallback } from "react";
import { useStorageStrategyStore } from "@/lib/stores/storage-strategy-store";
import type { StorageProviderId } from "@/lib/stores/storage-strategy-store";

export interface CloudFileForDelete {
  name: string;
  cloudId: string;
  provider: StorageProviderId;
}

interface UseCloudDeleteResult {
  // Modal state
  showModal: boolean;
  pendingFile: CloudFileForDelete | null;
  secondaryProvider: StorageProviderId | null;
  primaryProvider: StorageProviderId | null;

  // Actions
  initiateDelete: (file: CloudFileForDelete) => { immediate: boolean };
  closeModal: () => void;
  confirmDelete: (deleteFromBackup: boolean) => void;

  // Helpers
  needsConfirmation: boolean;
}

export function useCloudDelete(
  onDelete: (file: CloudFileForDelete, deleteFromBackup: boolean) => Promise<void>
): UseCloudDeleteResult {
  const [showModal, setShowModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<CloudFileForDelete | null>(null);

  const strategy = useStorageStrategyStore((state) => state.strategy);

  // Check if we need to show confirmation modal
  const needsConfirmation =
    strategy.secondaryEnabled &&
    strategy.secondaryProvider !== null &&
    strategy.backupBehavior === "independent";

  const initiateDelete = useCallback(
    (file: CloudFileForDelete) => {
      if (needsConfirmation) {
        setPendingFile(file);
        setShowModal(true);
        return { immediate: false };
      } else {
        // Mirror mode or no backup - delete immediately (both copies)
        onDelete(file, true);
        return { immediate: true };
      }
    },
    [needsConfirmation, onDelete]
  );

  const closeModal = useCallback(() => {
    setShowModal(false);
    setPendingFile(null);
  }, []);

  const confirmDelete = useCallback(
    async (deleteFromBackup: boolean) => {
      if (pendingFile) {
        await onDelete(pendingFile, deleteFromBackup);
        closeModal();
      }
    },
    [pendingFile, onDelete, closeModal]
  );

  return {
    showModal,
    pendingFile,
    secondaryProvider: strategy.secondaryProvider,
    primaryProvider: strategy.primaryProvider,
    initiateDelete,
    closeModal,
    confirmDelete,
    needsConfirmation,
  };
}
