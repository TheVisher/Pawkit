"use client";

import { getAllShortcuts, KeyboardShortcut } from "@/lib/hooks/use-keyboard-shortcuts";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

interface KeyboardShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ open, onClose }: KeyboardShortcutsModalProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    if (open) {
      setIsMounted(true);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  const shortcuts = getAllShortcuts();
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.group]) {
      acc[shortcut.group] = [];
    }
    acc[shortcut.group].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative z-10 w-full max-w-3xl rounded-3xl border border-white/10 bg-surface-elevated/95 p-8 shadow-2xl backdrop-blur-xl transition-all ${
          isMounted ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-foreground">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-muted transition-colors hover:bg-white/5 hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Shortcuts Grid */}
        <div className="max-h-[70vh] space-y-8 overflow-y-auto pr-2">
          {Object.entries(groupedShortcuts).map(([group, shortcuts]) => (
            <div key={group}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
                {group}
              </h3>
              <div className="space-y-2">
                {shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-3 transition-colors hover:border-white/10 hover:bg-white/10"
                  >
                    <span className="text-foreground-secondary">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.key.split(" ").map((part, i) => {
                        if (part.toLowerCase() === "then") {
                          return (
                            <span key={i} className="px-1 text-xs text-muted">
                              then
                            </span>
                          );
                        }
                        return (
                          <kbd
                            key={i}
                            className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 font-mono text-sm font-semibold text-foreground shadow-sm"
                          >
                            {part}
                          </kbd>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 border-t border-white/10 pt-4 text-center text-sm text-muted">
          Press <kbd className="rounded bg-white/10 px-2 py-1 font-mono">?</kbd>{" "}
          to toggle this help dialog
        </div>
      </div>
    </div>
  );
}
