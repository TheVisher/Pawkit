"use client";

import { create } from "zustand";
import type { CloudFile } from "@/lib/services/cloud-storage/types";

interface CloudDrivesState {
  // Selected file (for sidebar details)
  selectedFile: CloudFile | null;
  setSelectedFile: (file: CloudFile | null) => void;
  clearSelection: () => void;

  // Current provider being viewed (for context)
  currentProvider: string | null;
  setCurrentProvider: (providerId: string | null) => void;
}

export const useCloudDrivesStore = create<CloudDrivesState>((set) => ({
  selectedFile: null,
  currentProvider: null,

  setSelectedFile: (file) => set({ selectedFile: file }),

  clearSelection: () => set({ selectedFile: null }),

  setCurrentProvider: (providerId) => set({ currentProvider: providerId }),
}));
