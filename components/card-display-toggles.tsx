"use client";

import { useSettingsStore } from "@/lib/hooks/settings-store";
import { Eye, EyeOff, RotateCcw } from "lucide-react";
import { useState } from "react";

type CardDisplayTogglesProps = {
  onResetAll?: () => void;
};

export function CardDisplayToggles({ onResetAll }: CardDisplayTogglesProps) {
  const showCardTitles = useSettingsStore((state) => state.showCardTitles);
  const showCardUrls = useSettingsStore((state) => state.showCardUrls);
  const showCardTags = useSettingsStore((state) => state.showCardTags);
  const cardPadding = useSettingsStore((state) => state.cardPadding);
  const setShowCardTitles = useSettingsStore((state) => state.setShowCardTitles);
  const setShowCardUrls = useSettingsStore((state) => state.setShowCardUrls);
  const setShowCardTags = useSettingsStore((state) => state.setShowCardTags);
  const setCardPadding = useSettingsStore((state) => state.setCardPadding);

  const paddingLabels = ["None", "XS", "SM", "MD", "LG"];

  return (
    <div className="space-y-2 px-2 py-2">
      <div className="text-xs font-medium text-muted-foreground px-2 py-1">
        Card Display
      </div>

      {/* Title Toggle */}
      <button
        onClick={() => setShowCardTitles(!showCardTitles)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-md hover:bg-surface-soft transition-colors"
      >
        <span className="flex items-center gap-2">
          {showCardTitles ? (
            <Eye className="h-4 w-4 text-green-500" />
          ) : (
            <EyeOff className="h-4 w-4 text-gray-500" />
          )}
          <span>Titles</span>
        </span>
        <span className="text-xs text-muted-foreground">
          {showCardTitles ? "Visible" : "Hidden"}
        </span>
      </button>

      {/* URL Toggle */}
      <button
        onClick={() => setShowCardUrls(!showCardUrls)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-md hover:bg-surface-soft transition-colors"
      >
        <span className="flex items-center gap-2">
          {showCardUrls ? (
            <Eye className="h-4 w-4 text-green-500" />
          ) : (
            <EyeOff className="h-4 w-4 text-gray-500" />
          )}
          <span>URLs</span>
        </span>
        <span className="text-xs text-muted-foreground">
          {showCardUrls ? "Visible" : "Hidden"}
        </span>
      </button>

      {/* Tags Toggle */}
      <button
        onClick={() => setShowCardTags(!showCardTags)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-md hover:bg-surface-soft transition-colors"
      >
        <span className="flex items-center gap-2">
          {showCardTags ? (
            <Eye className="h-4 w-4 text-green-500" />
          ) : (
            <EyeOff className="h-4 w-4 text-gray-500" />
          )}
          <span>Tags</span>
        </span>
        <span className="text-xs text-muted-foreground">
          {showCardTags ? "Visible" : "Hidden"}
        </span>
      </button>

      <div className="border-t border-gray-800 my-2" />

      {/* Padding Slider */}
      <div className="px-3 py-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">Card Padding</span>
          <span className="text-xs text-muted-foreground">{paddingLabels[cardPadding]}</span>
        </div>
        <input
          type="range"
          min="0"
          max="4"
          step="1"
          value={cardPadding}
          onChange={(e) => setCardPadding(Number(e.target.value))}
          className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
        />
        <div className="flex justify-between mt-1">
          {paddingLabels.map((label, index) => (
            <button
              key={label}
              onClick={() => setCardPadding(index)}
              className={`text-[10px] ${cardPadding === index ? 'text-purple-400' : 'text-gray-600'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Reset Button */}
      {onResetAll && (
        <>
          <div className="border-t border-gray-800 my-2" />
          <button
            onClick={onResetAll}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-surface-soft transition-colors text-muted-foreground"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reset All Cards</span>
          </button>
        </>
      )}
    </div>
  );
}

// Confirmation Modal Component
type ResetConfirmationModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  customizedCount: number;
};

export function ResetConfirmationModal({
  open,
  onClose,
  onConfirm,
  customizedCount
}: ResetConfirmationModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-gray-950 rounded-lg p-6 w-full max-w-md shadow-xl border border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold text-gray-100 mb-4">Reset All Cards?</h2>
        <p className="text-sm text-gray-400 mb-4">
          {customizedCount > 0
            ? `This will reset ${customizedCount} customized card${customizedCount !== 1 ? 's' : ''} to follow the global display settings. This action cannot be undone.`
            : "This will reset all cards to follow the global display settings."}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded bg-gray-900 px-4 py-2 text-sm font-medium text-gray-100 hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 rounded bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
          >
            Reset All
          </button>
        </div>
      </div>
    </div>
  );
}
