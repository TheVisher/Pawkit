"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { DisplayOverrides } from "@/lib/types";

type CardDisplayControlsProps = {
  displayOverrides?: DisplayOverrides | null;
  onUpdate: (overrides: DisplayOverrides | null) => void;
};

export function CardDisplayControls({ displayOverrides, onUpdate }: CardDisplayControlsProps) {
  const [titleVisible, setTitleVisible] = useState(
    displayOverrides?.title?.visible ?? true
  );
  const [urlVisible, setUrlVisible] = useState(
    displayOverrides?.url?.visible ?? true
  );
  const [tagsVisible, setTagsVisible] = useState(
    displayOverrides?.tags?.visible ?? true
  );

  const handleToggleTitle = () => {
    const newValue = !titleVisible;
    setTitleVisible(newValue);
    updateOverrides({ title: { visible: newValue } });
  };

  const handleToggleUrl = () => {
    const newValue = !urlVisible;
    setUrlVisible(newValue);
    updateOverrides({ url: { visible: newValue } });
  };

  const handleToggleTags = () => {
    const newValue = !tagsVisible;
    setTagsVisible(newValue);
    updateOverrides({ tags: { visible: newValue } });
  };

  const updateOverrides = (update: Partial<DisplayOverrides>) => {
    const newOverrides: DisplayOverrides = {
      title: displayOverrides?.title || { visible: true },
      url: displayOverrides?.url || { visible: true },
      tags: displayOverrides?.tags || { visible: true },
      ...update
    };
    onUpdate(newOverrides);
  };

  const handleResetToGlobal = () => {
    setTitleVisible(true);
    setUrlVisible(true);
    setTagsVisible(true);
    onUpdate(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium text-gray-200 mb-2">Card Display Overrides</h4>
        <p className="text-xs text-gray-400 mb-4">
          Customize what information is shown on this specific card. These settings override global display preferences.
        </p>
      </div>

      <div className="space-y-3">
        {/* Title Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-900/50 border border-gray-800">
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleTitle}
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              {titleVisible ? (
                <Eye className="h-5 w-5 text-green-500" />
              ) : (
                <EyeOff className="h-5 w-5 text-gray-500" />
              )}
            </button>
            <div>
              <div className="text-sm font-medium text-gray-200">Title</div>
              <div className="text-xs text-gray-500">
                {titleVisible ? "Visible" : "Hidden"}
              </div>
            </div>
          </div>
        </div>

        {/* URL Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-900/50 border border-gray-800">
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleUrl}
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              {urlVisible ? (
                <Eye className="h-5 w-5 text-green-500" />
              ) : (
                <EyeOff className="h-5 w-5 text-gray-500" />
              )}
            </button>
            <div>
              <div className="text-sm font-medium text-gray-200">URL</div>
              <div className="text-xs text-gray-500">
                {urlVisible ? "Visible" : "Hidden"}
              </div>
            </div>
          </div>
        </div>

        {/* Tags Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-900/50 border border-gray-800">
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleTags}
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              {tagsVisible ? (
                <Eye className="h-5 w-5 text-green-500" />
              ) : (
                <EyeOff className="h-5 w-5 text-gray-500" />
              )}
            </button>
            <div>
              <div className="text-sm font-medium text-gray-200">Tags/Pawkits</div>
              <div className="text-xs text-gray-500">
                {tagsVisible ? "Visible" : "Hidden"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Button */}
      <button
        onClick={handleResetToGlobal}
        className="w-full py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors border border-gray-800 rounded-lg hover:bg-gray-900/50"
      >
        Reset to Global Settings
      </button>
    </div>
  );
}
