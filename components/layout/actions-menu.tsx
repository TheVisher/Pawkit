"use client";

import { useState } from "react";
import { MoreVertical, RefreshCw, FolderInput, Trash2, Plus, Edit, Move, FolderX } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useDataStore } from "@/lib/stores/data-store";
import { useSelection } from "@/lib/hooks/selection-store";
import { MoveToPawkitModal } from "@/components/modals/move-to-pawkit-modal";
import { GlowButton } from "@/components/ui/glow-button";
import type { ViewType } from "@/lib/hooks/view-settings-store";
import { useToastStore } from "@/lib/stores/toast-store";

type PawkitActions = {
  onCreateSubPawkit?: () => void;
  onRenamePawkit?: () => void;
  onMovePawkit?: () => void;
  onDeletePawkit?: () => void;
};

type ActionsMenuProps = {
  view: ViewType;
  onRefresh?: () => Promise<void>;
  pawkitActions?: PawkitActions;
  onCreatePawkit?: () => void; // For Pawkits main page and Den
};

export function ActionsMenu({ view, onRefresh, pawkitActions, onCreatePawkit }: ActionsMenuProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showMoveToPawkitModal, setShowMoveToPawkitModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const { refresh } = useDataStore();
  const selectedCardIds = useSelection((state) => state.selectedIds);
  const clearSelection = useSelection((state) => state.clear);
  const hasSelection = selectedCardIds.length > 0;
  const toast = useToastStore();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      } else {
        await refresh();
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleMoveToPawkit = () => {
    if (!hasSelection) return;
    setShowMoveToPawkitModal(true);
  };

  const handleDelete = () => {
    if (!hasSelection) return;
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!hasSelection) return;

    try {
      // Delete all selected cards
      const deletePromises = selectedCardIds.map((cardId: string) =>
        fetch(`/api/cards/${cardId}`, { method: 'DELETE' })
      );
      
      await Promise.all(deletePromises);
      
      // Refresh the view
      await refresh();
      
      // Clear selection
      clearSelection();
      setShowDeleteConfirm(false);
    } catch (error) {
      toast.error('Failed to delete some cards. Please try again.');
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" title="Actions">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {/* Refresh */}
          <DropdownMenuItem
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="cursor-pointer"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </DropdownMenuItem>

          {/* Create Pawkit Action (for Pawkits and Den main pages) */}
          {onCreatePawkit && (
            <>
              <DropdownMenuSeparator />
              
              <DropdownMenuItem
                onClick={onCreatePawkit}
                className="cursor-pointer"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Pawkit
              </DropdownMenuItem>
            </>
          )}

          {/* Pawkit Management Actions */}
          {pawkitActions && (
            <>
              <DropdownMenuSeparator />
              
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                Pawkit Actions
              </div>

              {pawkitActions.onCreateSubPawkit && (
                <DropdownMenuItem
                  onClick={pawkitActions.onCreateSubPawkit}
                  className="cursor-pointer"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Sub-Pawkit
                </DropdownMenuItem>
              )}

              {pawkitActions.onRenamePawkit && (
                <DropdownMenuItem
                  onClick={pawkitActions.onRenamePawkit}
                  className="cursor-pointer"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Rename Pawkit
                </DropdownMenuItem>
              )}

              {pawkitActions.onMovePawkit && (
                <DropdownMenuItem
                  onClick={pawkitActions.onMovePawkit}
                  className="cursor-pointer"
                >
                  <Move className="mr-2 h-4 w-4" />
                  Move Pawkit
                </DropdownMenuItem>
              )}

              {pawkitActions.onDeletePawkit && (
                <DropdownMenuItem
                  onClick={pawkitActions.onDeletePawkit}
                  className="cursor-pointer text-red-600 focus:text-red-600"
                >
                  <FolderX className="mr-2 h-4 w-4" />
                  Delete Pawkit
                </DropdownMenuItem>
              )}
            </>
          )}

          {/* Show bulk actions only if cards are selected */}
          {hasSelection && (
            <>
              <DropdownMenuSeparator />
              
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                {selectedCardIds.length} card{selectedCardIds.length !== 1 ? 's' : ''} selected
              </div>

              {/* Move to Pawkit */}
              <DropdownMenuItem
                onClick={handleMoveToPawkit}
                className="cursor-pointer"
              >
                <FolderInput className="mr-2 h-4 w-4" />
                Move to Pawkit
              </DropdownMenuItem>

              {/* Delete */}
              <DropdownMenuItem
                onClick={handleDelete}
                className="cursor-pointer text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Move to Pawkit Modal */}
      {showMoveToPawkitModal && (
        <MoveToPawkitModal
          open={showMoveToPawkitModal}
          onClose={() => setShowMoveToPawkitModal(false)}
          onConfirm={async (slug: string) => {
            // Move all selected cards to the pawkit
            await Promise.all(
              selectedCardIds.map((cardId: string) =>
                fetch(`/api/cards/${cardId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ collections: [slug] }),
                })
              )
            );
            await refresh();
            setShowMoveToPawkitModal(false);
            clearSelection();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-lg p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold text-gray-100 mb-4">
              Delete {selectedCardIds.length} card{selectedCardIds.length !== 1 ? 's' : ''}?
            </h2>
            <p className="text-sm text-gray-400 mb-6">
              This will move the selected cards to trash. You can restore them later from the trash.
            </p>
            <div className="flex gap-3">
              <GlowButton
                onClick={() => setShowDeleteConfirm(false)}
                variant="primary"
                size="md"
                className="flex-1"
              >
                Cancel
              </GlowButton>
              <GlowButton
                onClick={handleConfirmDelete}
                variant="danger"
                size="md"
                className="flex-1"
              >
                Delete
              </GlowButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

