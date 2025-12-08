"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useViewSettingsStore, type ViewType } from "@/lib/hooks/view-settings-store";
import { Eye, EyeOff, Minus, Plus } from "lucide-react";

type CardDisplayControlsProps = {
  open: boolean;
  onClose: () => void;
  view: ViewType;
};

export function CardDisplayControls({ open, onClose, view }: CardDisplayControlsProps) {
  const settings = useViewSettingsStore((state) => state.getSettings(view));
  const setShowMetadata = useViewSettingsStore((state) => state.setShowMetadata);
  const setShowLabels = useViewSettingsStore((state) => state.setShowLabels);
  const setShowTags = useViewSettingsStore((state) => state.setShowTags);
  const setCardPadding = useViewSettingsStore((state) => state.setCardPadding);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open || !mounted) return null;

  const { showMetadata: showTitles, showLabels: showUrls, showTags, cardPadding } = settings;
  const paddingLabels = ["None", "XS", "SM", "MD", "LG"];

  const handleResetAll = () => {
    setShowMetadata(view, true);
    setShowLabels(view, true);
    setShowTags(view, true);
    setCardPadding(view, 2); // Default SM
  };

  const modalContent = (
    <>
      {/* Backdrop - click to close */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div 
        className="fixed left-1/2 w-[90%] max-w-md rounded-2xl border border-gray-800 bg-gray-950 p-6 shadow-2xl"
        style={{ bottom: '24px', transform: 'translateX(-50%)', zIndex: 9999 }}
      >
        <div className="space-y-4">
          <div>
            <h4 className="text-lg font-semibold text-gray-100 mb-1">Display Options</h4>
            <p className="text-xs text-gray-500">
              Customize what information is shown on cards
            </p>
          </div>

          <div className="space-y-3">
            {/* Title Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-900/50 border border-gray-800">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowMetadata(view, !showTitles)}
                  className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                >
                  {showTitles ? (
                    <Eye className="h-5 w-5 text-green-500" />
                  ) : (
                    <EyeOff className="h-5 w-5 text-gray-500" />
                  )}
                </button>
                <div>
                  <div className="text-sm font-medium text-gray-200">Titles</div>
                  <div className="text-xs text-gray-500">
                    {showTitles ? "Visible" : "Hidden"}
                  </div>
                </div>
              </div>
            </div>

            {/* URL Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-900/50 border border-gray-800">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowLabels(view, !showUrls)}
                  className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                >
                  {showUrls ? (
                    <Eye className="h-5 w-5 text-green-500" />
                  ) : (
                    <EyeOff className="h-5 w-5 text-gray-500" />
                  )}
                </button>
                <div>
                  <div className="text-sm font-medium text-gray-200">URLs</div>
                  <div className="text-xs text-gray-500">
                    {showUrls ? "Visible" : "Hidden"}
                  </div>
                </div>
              </div>
            </div>

            {/* Tags Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-900/50 border border-gray-800">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowTags(view, !showTags)}
                  className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                >
                  {showTags ? (
                    <Eye className="h-5 w-5 text-green-500" />
                  ) : (
                    <EyeOff className="h-5 w-5 text-gray-500" />
                  )}
                </button>
                <div>
                  <div className="text-sm font-medium text-gray-200">Tags/Pawkits</div>
                  <div className="text-xs text-gray-500">
                    {showTags ? "Visible" : "Hidden"}
                  </div>
                </div>
              </div>
            </div>

            {/* Padding Control */}
            <div className="p-3 rounded-lg bg-gray-900/50 border border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm font-medium text-gray-200">Card Padding</div>
                  <div className="text-xs text-gray-500">{paddingLabels[cardPadding]}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCardPadding(view, Math.max(0, cardPadding - 1))}
                  disabled={cardPadding === 0}
                  className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <div className="flex-1 flex gap-1">
                  {paddingLabels.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCardPadding(view, index)}
                      className={`flex-1 h-2 rounded-full transition-colors ${
                        index <= cardPadding ? "bg-accent" : "bg-gray-800"
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setCardPadding(view, Math.min(4, cardPadding + 1))}
                  disabled={cardPadding === 4}
                  className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Reset Button */}
          <button
            onClick={handleResetAll}
            className="w-full py-2.5 text-sm font-medium text-gray-400 hover:text-gray-200 transition-colors border border-gray-800 rounded-lg hover:bg-gray-900/50"
          >
            Reset to Defaults
          </button>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}
