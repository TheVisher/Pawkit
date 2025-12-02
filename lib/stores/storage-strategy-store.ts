import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ContentType = "notes" | "bookmarks" | "images" | "documents" | "audio" | "video" | "other";
export type StorageProviderId = "filen" | "google-drive" | "dropbox" | "onedrive";

export interface StorageStrategy {
  // Primary provider - required, all content goes here by default
  primaryProvider: StorageProviderId | null;

  // Secondary provider - optional backup
  secondaryEnabled: boolean;
  secondaryProvider: StorageProviderId | null;

  // Custom routing - optional per-type destinations
  routingEnabled: boolean;
  routing: Record<ContentType, StorageProviderId | null>;
}

interface StorageStrategyStore {
  strategy: StorageStrategy;

  setPrimaryProvider: (provider: StorageProviderId | null) => void;
  setSecondaryProvider: (provider: StorageProviderId | null) => void;
  setSecondaryEnabled: (enabled: boolean) => void;
  setRoutingEnabled: (enabled: boolean) => void;
  setRouteForType: (type: ContentType, provider: StorageProviderId | null) => void;
  resetStrategy: () => void;

  // Helper to get destination(s) for a given content type
  getDestinations: (contentType: ContentType) => StorageProviderId[];
}

const defaultStrategy: StorageStrategy = {
  primaryProvider: null,
  secondaryEnabled: false,
  secondaryProvider: null,
  routingEnabled: false,
  routing: {
    notes: null, // null = use primary
    bookmarks: null,
    images: null,
    documents: null,
    audio: null,
    video: null,
    other: null,
  },
};

export const useStorageStrategyStore = create<StorageStrategyStore>()(
  persist(
    (set, get) => ({
      strategy: defaultStrategy,

      setPrimaryProvider: (provider) =>
        set((state) => ({
          strategy: { ...state.strategy, primaryProvider: provider },
        })),

      setSecondaryProvider: (provider) =>
        set((state) => ({
          strategy: { ...state.strategy, secondaryProvider: provider },
        })),

      setSecondaryEnabled: (enabled) =>
        set((state) => ({
          strategy: { ...state.strategy, secondaryEnabled: enabled },
        })),

      setRoutingEnabled: (enabled) =>
        set((state) => ({
          strategy: { ...state.strategy, routingEnabled: enabled },
        })),

      setRouteForType: (type, provider) =>
        set((state) => ({
          strategy: {
            ...state.strategy,
            routing: { ...state.strategy.routing, [type]: provider },
          },
        })),

      resetStrategy: () =>
        set({ strategy: defaultStrategy }),

      getDestinations: (contentType) => {
        const { strategy } = get();
        const destinations: StorageProviderId[] = [];

        // Determine primary destination
        let primary: StorageProviderId | null = strategy.primaryProvider;

        // Override with custom routing if enabled and set
        if (strategy.routingEnabled && strategy.routing[contentType]) {
          primary = strategy.routing[contentType];
        }

        if (primary) {
          destinations.push(primary);
        }

        // Add secondary if enabled and different from primary
        if (
          strategy.secondaryEnabled &&
          strategy.secondaryProvider &&
          strategy.secondaryProvider !== primary
        ) {
          destinations.push(strategy.secondaryProvider);
        }

        return destinations;
      },
    }),
    {
      name: "pawkit-storage-strategy",
    }
  )
);

// Content type labels and icons for UI
export const CONTENT_TYPE_CONFIG: Record<ContentType, { label: string; emoji: string }> = {
  notes: { label: "Notes", emoji: "📝" },
  bookmarks: { label: "Bookmarks", emoji: "🔖" },
  images: { label: "Images", emoji: "🖼️" },
  documents: { label: "Documents", emoji: "📄" },
  audio: { label: "Audio", emoji: "🎵" },
  video: { label: "Videos", emoji: "🎬" },
  other: { label: "Other", emoji: "📎" },
};

// Helper to determine content type from card type and mime type
export function getContentTypeFromCard(cardType: string, mimeType?: string | null): ContentType {
  // Check card type first
  if (cardType === "md-note" || cardType === "text-note") {
    return "notes";
  }
  if (cardType === "bookmark" || cardType === "link") {
    return "bookmarks";
  }
  if (cardType === "image") {
    return "images";
  }
  if (cardType === "audio") {
    return "audio";
  }
  if (cardType === "video") {
    return "video";
  }

  // Fall back to mime type if available
  if (mimeType) {
    if (mimeType.startsWith("image/")) return "images";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.startsWith("audio/")) return "audio";
    if (
      mimeType === "application/pdf" ||
      mimeType.includes("document") ||
      mimeType.includes("word") ||
      mimeType.includes("spreadsheet") ||
      mimeType.includes("presentation")
    ) {
      return "documents";
    }
  }

  return "other";
}
