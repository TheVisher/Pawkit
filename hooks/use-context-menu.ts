import { useState, useCallback, MouseEvent } from "react";

export interface ContextMenuState {
  isOpen: boolean;
  position: { x: number; y: number };
}

export interface UseContextMenuReturn {
  contextMenu: ContextMenuState;
  handleContextMenu: (event: MouseEvent) => void;
  closeContextMenu: () => void;
  openContextMenu: (x: number, y: number) => void;
}

/**
 * Hook to manage context menu state and positioning
 *
 * @example
 * ```tsx
 * const { contextMenu, handleContextMenu, closeContextMenu } = useContextMenu();
 *
 * return (
 *   <div onContextMenu={handleContextMenu}>
 *     Right click me
 *     {contextMenu.isOpen && (
 *       <CustomMenu
 *         position={contextMenu.position}
 *         onClose={closeContextMenu}
 *       />
 *     )}
 *   </div>
 * );
 * ```
 */
export function useContextMenu(): UseContextMenuReturn {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    position: { x: 0, y: 0 },
  });

  const handleContextMenu = useCallback((event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    setContextMenu({
      isOpen: true,
      position: {
        x: event.clientX,
        y: event.clientY,
      },
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  const openContextMenu = useCallback((x: number, y: number) => {
    setContextMenu({
      isOpen: true,
      position: { x, y },
    });
  }, []);

  return {
    contextMenu,
    handleContextMenu,
    closeContextMenu,
    openContextMenu,
  };
}
