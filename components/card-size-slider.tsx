"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useViewSettingsStore, type ViewType } from "@/lib/hooks/view-settings-store";
import { Maximize2, Minimize2 } from "lucide-react";

type CardSizeSliderProps = {
  open: boolean;
  onClose: () => void;
  view: ViewType;
};

export function CardSizeSlider({ open, onClose, view }: CardSizeSliderProps) {
  const settings = useViewSettingsStore((state) => state.getSettings(view));
  const setCardSize = useViewSettingsStore((state) => state.setCardSize);
  const [localSize, setLocalSize] = useState(settings.cardSize);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Detect mobile on mount and window resize
  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Update local size when settings change
  useEffect(() => {
    setLocalSize(settings.cardSize);
  }, [settings.cardSize]);

  const handleChange = (value: number) => {
    setLocalSize(value);
    setCardSize(view, value);
  };

  if (!open || !mounted) return null;

  const getSizeLabel = (size: number) => {
    return `${size}%`;
  };

  const sliderContent = (
    <>
      {/* Backdrop - click to close */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Floating Slider */}
      <div 
        className="fixed left-1/2 w-[90%] max-w-md"
        style={{ bottom: '24px', transform: 'translateX(-50%)', zIndex: 9999 }}
      >
        <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Minimize2 className="h-5 w-5 text-gray-400" />
              <div>
                <h3 className="text-sm font-semibold text-gray-100">Card Size</h3>
                <p className="text-xs text-gray-400">{getSizeLabel(localSize)}</p>
              </div>
            </div>
            <Maximize2 className="h-5 w-5 text-gray-400" />
          </div>

          {/* Slider */}
          <div className="relative">
            <input
              type="range"
              min="1"
              max="100"
              step="1"
              value={localSize}
              onChange={(e) => handleChange(Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb"
              style={{
                background: `linear-gradient(to right, rgb(109, 92, 255) 0%, rgb(109, 92, 255) ${((localSize - 1) / 99) * 100}%, rgb(55, 65, 81) ${((localSize - 1) / 99) * 100}%, rgb(55, 65, 81) 100%)`
              }}
            />
          </div>

          <button
            onClick={onClose}
            className="w-full py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
          >
            Done
          </button>
        </div>
      </div>

      <style jsx>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: rgb(109, 92, 255);
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .slider-thumb::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: rgb(109, 92, 255);
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .slider-thumb:focus {
          outline: none;
        }

        .slider-thumb::-webkit-slider-thumb:hover {
          background: rgb(93, 76, 239);
        }

        .slider-thumb::-moz-range-thumb:hover {
          background: rgb(93, 76, 239);
        }
      `}</style>
    </>
  );

  return createPortal(sliderContent, document.body);
}
