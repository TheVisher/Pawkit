"use client";

import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

type ConfirmDeleteModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  itemName?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

export function ConfirmDeleteModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  itemName,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
}: ConfirmDeleteModalProps) {
  if (!open || typeof document === 'undefined') return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-950 rounded-lg border border-gray-800 shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-gray-800 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10">
              <AlertTriangle className="h-5 w-5 text-rose-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-100">{title}</h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-3">
          <p className="text-sm text-gray-300">{message}</p>
          {itemName && (
            <div className="p-3 rounded-lg bg-gray-900/60 border border-gray-800">
              <p className="text-sm font-medium text-gray-100">{itemName}</p>
            </div>
          )}
          <p className="text-xs text-gray-500">
            This action cannot be undone. The item will be moved to trash.
          </p>
        </div>

        {/* Actions */}
        <div className="border-t border-gray-800 p-4 flex gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
            size="lg"
          >
            {cancelLabel}
          </Button>
          <Button
            onClick={handleConfirm}
            className="flex-1 bg-rose-600 hover:bg-rose-700 text-white"
            size="lg"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
