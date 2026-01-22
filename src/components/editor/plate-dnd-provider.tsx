'use client';

import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ReactNode, createContext, useContext } from 'react';

// Context to track if we're inside the Plate DndProvider
export const PlateDndContext = createContext(false);

/**
 * Global DndProvider for Plate editors.
 * Place this high in the component tree so it never unmounts.
 * Prevents "Cannot have two HTML5 backends" error.
 */
export function PlateDndProvider({ children }: { children: ReactNode }) {
  return (
    <DndProvider backend={HTML5Backend}>
      <PlateDndContext.Provider value={true}>
        {children}
      </PlateDndContext.Provider>
    </DndProvider>
  );
}

/**
 * Hook to check if we're inside PlateDndProvider
 */
export function useIsInsidePlateDnd() {
  return useContext(PlateDndContext);
}
