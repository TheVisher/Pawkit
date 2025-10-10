"use client";

import { useState, useEffect } from "react";
import { useSettingsStore } from "@/lib/hooks/settings-store";
import { Maximize2, Minimize2 } from "lucide-react";

type CardSizeSliderProps = {
  open: boolean;
  onClose: () => void;
};

export function CardSizeSlider({ open, onClose }: CardSizeSliderProps) {
  const cardSize = useSettingsStore((state) => state.cardSize);
  const setCardSize = useSettingsStore((state) => state.setCardSize);
  const [localSize, setLocalSize] = useState(cardSize);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile on mount and window resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!open) return null;

  // Mobile uses 1-3, desktop uses 1-5
  const maxSize = isMobile ? 3 : 5;
  const steps = isMobile ? [1, 2, 3] : [1, 2, 3, 4, 5];

  const handleChange = (value: number) => {
    setLocalSize(value);
    setCardSize(value);
  };

  const getSizeLabel = (size: number) => {
    if (isMobile) {
      switch (size) {
        case 1: return "Small";
        case 2: return "Medium";
        case 3: return "Large";
        default: return "Medium";
      }
    }
    switch (size) {
      case 1: return "Extra Small";
      case 2: return "Small";
      case 3: return "Medium";
      case 4: return "Large";
      case 5: return "Extra Large";
      default: return "Medium";
    }
  };

  return (
    <>
      {/* Backdrop - click to close */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Floating Slider */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md">
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
              max={maxSize}
              step="1"
              value={localSize}
              onChange={(e) => handleChange(Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb"
              style={{
                background: `linear-gradient(to right, rgb(109, 92, 255) 0%, rgb(109, 92, 255) ${((localSize - 1) / (maxSize - 1)) * 100}%, rgb(55, 65, 81) ${((localSize - 1) / (maxSize - 1)) * 100}%, rgb(55, 65, 81) 100%)`
              }}
            />
            {/* Step markers */}
            <div className="flex justify-between mt-2 px-1">
              {steps.map((step) => (
                <button
                  key={step}
                  onClick={() => handleChange(step)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    localSize >= step ? 'bg-accent' : 'bg-gray-600'
                  }`}
                  aria-label={`Set size to ${getSizeLabel(step)}`}
                />
              ))}
            </div>
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
}
