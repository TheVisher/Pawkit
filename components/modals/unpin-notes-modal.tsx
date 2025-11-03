"use client";

import { CardModel } from "@/lib/types";
import { Pin } from "lucide-react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

type UnpinNotesModalProps = {
  open: boolean;
  onClose: () => void;
  pinnedNotes: CardModel[];
  onUnpin: (noteId: string) => void;
};

export function UnpinNotesModal({ open, onClose, pinnedNotes, onUnpin }: UnpinNotesModalProps) {
  if (!open || typeof document === 'undefined') return null;

  const handleUnpin = (noteId: string) => {
    onUnpin(noteId);
    onClose();
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        className="bg-gray-950 rounded-lg border border-gray-800 shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-gray-800 p-4">
          <h2 className="text-xl font-semibold text-gray-100">Maximum Pins Reached</h2>
          <p className="text-sm text-gray-400 mt-1">
            You can only pin 10 notes. Unpin one to add a new one.
          </p>
        </div>

        <div className="p-6 space-y-3">
          {pinnedNotes.map((note) => (
            <div
              key={note.id}
              className="flex items-center justify-between p-3 rounded-lg bg-gray-900/60 border border-gray-800 hover:bg-gray-900/80 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Pin size={16} className="flex-shrink-0 text-purple-400" />
                <span className="text-sm text-gray-100 truncate">{note.title}</span>
              </div>
              <Button
                onClick={() => handleUnpin(note.id)}
                variant="outline"
                size="sm"
                className="flex-shrink-0 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
              >
                Unpin
              </Button>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-800 p-4">
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full"
            size="lg"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
