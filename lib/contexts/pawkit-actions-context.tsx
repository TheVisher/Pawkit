"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type PawkitActions = {
  onCreateSubPawkit?: () => void;
  onRenamePawkit?: () => void;
  onMovePawkit?: () => void;
  onDeletePawkit?: () => void;
};

type PawkitActionsContextType = {
  pawkitActions: PawkitActions | null;
  setPawkitActions: (actions: PawkitActions | null) => void;
  onCreatePawkit: (() => void) | null;
  setOnCreatePawkit: (action: (() => void) | null) => void;
};

const PawkitActionsContext = createContext<PawkitActionsContextType | undefined>(undefined);

export function PawkitActionsProvider({ children }: { children: ReactNode }) {
  const [pawkitActions, setPawkitActions] = useState<PawkitActions | null>(null);
  const [onCreatePawkit, setOnCreatePawkit] = useState<(() => void) | null>(null);

  return (
    <PawkitActionsContext.Provider value={{ pawkitActions, setPawkitActions, onCreatePawkit, setOnCreatePawkit }}>
      {children}
    </PawkitActionsContext.Provider>
  );
}

export function usePawkitActions() {
  const context = useContext(PawkitActionsContext);
  if (!context) {
    throw new Error("usePawkitActions must be used within a PawkitActionsProvider");
  }
  return context;
}

