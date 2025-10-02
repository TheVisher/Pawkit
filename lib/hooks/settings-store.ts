"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

const DEFAULT_PREVIEW_URL = process.env.NEXT_PUBLIC_PREVIEW_SERVICE_URL ?? "http://localhost:8787/preview?url={{url}}";

export type SettingsState = {
  autoFetchMetadata: boolean;
  showThumbnails: boolean;
  previewServiceUrl: string;
  setAutoFetchMetadata: (value: boolean) => void;
  setShowThumbnails: (value: boolean) => void;
  setPreviewServiceUrl: (value: string) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      autoFetchMetadata: true,
      showThumbnails: true,
      previewServiceUrl: DEFAULT_PREVIEW_URL,
      setAutoFetchMetadata: (value) => set({ autoFetchMetadata: value }),
      setShowThumbnails: (value) => set({ showThumbnails: value }),
      setPreviewServiceUrl: (value) => set({ previewServiceUrl: value })
    }),
    {
      name: "vbm-settings"
    }
  )
);
