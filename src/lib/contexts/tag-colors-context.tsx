/**
 * Tag Colors Context
 * Provides custom tag colors from workspace preferences globally
 */

import { createContext, useContext, useMemo, ReactNode } from 'react';
import { useCurrentWorkspace } from '@/lib/stores/workspace-store';

interface TagColorsContextValue {
  /** Get custom color for a tag (returns undefined if no custom color) */
  getCustomColor: (tag: string) => string | undefined;
  /** All custom tag colors */
  tagColors: Record<string, string>;
}

const TagColorsContext = createContext<TagColorsContextValue>({
  getCustomColor: () => undefined,
  tagColors: {},
});

export function TagColorsProvider({ children }: { children: ReactNode }) {
  const workspace = useCurrentWorkspace();

  const value = useMemo<TagColorsContextValue>(() => {
    const tagColors = (workspace?.preferences?.tagColors as Record<string, string>) || {};

    return {
      getCustomColor: (tag: string) => tagColors[tag],
      tagColors,
    };
  }, [workspace?.preferences?.tagColors]);

  return (
    <TagColorsContext.Provider value={value}>
      {children}
    </TagColorsContext.Provider>
  );
}

/**
 * Hook to get custom tag colors
 */
export function useTagColors() {
  return useContext(TagColorsContext);
}

/**
 * Hook to get custom color for a specific tag
 */
export function useTagCustomColor(tag: string): string | undefined {
  const { getCustomColor } = useContext(TagColorsContext);
  return getCustomColor(tag);
}
