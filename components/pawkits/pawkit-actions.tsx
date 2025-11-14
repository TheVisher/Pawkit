"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useDemoAwareStore } from "@/lib/hooks/use-demo-aware-store";
import { useToastStore } from "@/lib/stores/toast-store";

type PawkitActionsProps = {
  pawkitId: string;
  pawkitName: string;
  isPinned?: boolean;
  isPrivate?: boolean;
  hidePreview?: boolean;
  useCoverAsBackground?: boolean;
  hasChildren?: boolean;
  allPawkits?: Array<{ id: string; name: string; slug: string }>;
  onDeleteSuccess?: () => void;
};

export function PawkitActions({ pawkitId, pawkitName, isPinned = false, isPrivate = false, hidePreview = false, useCoverAsBackground = false, hasChildren = false, allPawkits = [], onDeleteSuccess }: PawkitActionsProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [renameValue, setRenameValue] = useState(pawkitName);
  const [selectedMoveTarget, setSelectedMoveTarget] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteCards, setDeleteCards] = useState(false);
  const [deleteSubPawkits, setDeleteSubPawkits] = useState(false);
  const [pinned, setPinned] = useState(isPinned);
  const [isPrivateState, setIsPrivateState] = useState(isPrivate);
  const [hidePreviewState, setHidePreviewState] = useState(hidePreview);
  const [useCoverAsBackgroundState, setUseCoverAsBackgroundState] = useState(useCoverAsBackground);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const { deleteCollection, updateCollection } = useDemoAwareStore();
  const toast = useToastStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteCollection(pawkitId, deleteCards, deleteSubPawkits);
      setShowDeleteConfirm(false);
      router.push("/pawkits");
      onDeleteSuccess?.();
    } catch (err) {
      toast.error("Failed to delete Pawkit");
      setLoading(false);
    }
  };

  const handleRename = async () => {
    if (!renameValue.trim()) return;

    setLoading(true);
    try {
      await updateCollection(pawkitId, { name: renameValue.trim() });
      setShowRenameModal(false);
      setLoading(false);
    } catch (err) {
      toast.error("Failed to rename Pawkit");
      setLoading(false);
    }
  };

  const handleMove = async () => {
    setLoading(true);
    try {
      await updateCollection(pawkitId, { parentId: selectedMoveTarget });
      setShowMoveModal(false);
      setSelectedMoveTarget(null);
      setLoading(false);
    } catch (err) {
      toast.error("Failed to move Pawkit");
      setLoading(false);
    }
  };

  const handlePinToggle = async () => {
    try {
      setPinned(!pinned);
      setShowMenu(false);
      await updateCollection(pawkitId, { pinned: !pinned });
    } catch (err) {
      toast.error("Failed to toggle pin");
      setPinned(pinned); // Revert on error
    }
  };

  const handlePrivateToggle = async () => {
    try {
      setIsPrivateState(!isPrivateState);
      setShowMenu(false);
      await updateCollection(pawkitId, { isPrivate: !isPrivateState });
    } catch (err) {
      toast.error("Failed to toggle privacy");
      setIsPrivateState(isPrivateState); // Revert on error
    }
  };

  const handleHidePreviewToggle = async () => {
    try {
      setHidePreviewState(!hidePreviewState);
      setShowMenu(false);
      await updateCollection(pawkitId, { hidePreview: !hidePreviewState });
    } catch (err) {
      // Silently revert on error - database columns may not exist yet
      console.warn("Failed to toggle preview visibility (database migration may be pending):", err);
      setHidePreviewState(hidePreviewState);
    }
  };

  const handleCoverAsBackgroundToggle = async () => {
    try {
      setUseCoverAsBackgroundState(!useCoverAsBackgroundState);
      setShowMenu(false);
      await updateCollection(pawkitId, { useCoverAsBackground: !useCoverAsBackgroundState });
    } catch (err) {
      // Silently revert on error - database columns may not exist yet
      console.warn("Failed to toggle cover background (database migration may be pending):", err);
      setUseCoverAsBackgroundState(useCoverAsBackgroundState);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      // Check if click is outside both the button container AND the portal menu
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        menuRef.current && !menuRef.current.contains(target)
      ) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu]);

  return (
    <>
      <div className="relative" ref={containerRef}>
        <button
          ref={buttonRef}
          onClick={(e) => {
            e.stopPropagation();
            if (!showMenu && buttonRef.current) {
              const rect = buttonRef.current.getBoundingClientRect();
              setMenuPosition({
                top: rect.bottom + 8,
                left: rect.right - 224 // 224px = w-56 menu width
              });
            }
            setShowMenu(!showMenu);
          }}
          className="flex items-center justify-center h-9 w-9 rounded text-gray-400 hover:bg-gray-900 hover:text-gray-100 transition-colors"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="19" r="1.5" />
          </svg>
        </button>

        {showMenu && mounted && createPortal(
          <div
            ref={menuRef}
            className="fixed w-56 rounded-lg bg-gray-900 border border-gray-800 shadow-lg py-1 z-[9999]"
            style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePinToggle();
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-gray-100 transition-colors"
            >
              {pinned ? "Unpin from Quick Access" : "Pin to Quick Access"}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrivateToggle();
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-gray-100 transition-colors"
            >
              {isPrivateState ? "🔓 Mark as Public" : "🔒 Mark as Private"}
            </button>
            <div className="border-t border-gray-800 my-1" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleHidePreviewToggle();
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-gray-100 transition-colors"
            >
              {hidePreviewState ? "Show Preview" : "Hide Preview"}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCoverAsBackgroundToggle();
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-gray-100 transition-colors"
            >
              {useCoverAsBackgroundState ? "Remove Cover Background" : "Use Cover as Background"}
            </button>
            <div className="border-t border-gray-800 my-1" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowRenameModal(true);
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-gray-100 transition-colors"
            >
              Rename
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMoveModal(true);
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-gray-100 transition-colors"
            >
              Move to another Pawkit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(true);
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-rose-400 hover:bg-gray-800 hover:text-rose-300 transition-colors"
            >
              Delete
            </button>
          </div>,
          document.body
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && mounted && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="bg-gray-950 rounded-lg p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold text-gray-100 mb-4">Delete Pawkit?</h2>

            {hasChildren && (
              <div className="mb-4 p-3 rounded bg-yellow-900/20 border border-yellow-700/50">
                <p className="text-sm text-yellow-200 font-medium">⚠️ Warning</p>
                <p className="text-xs text-yellow-300/80 mt-1">
                  This Pawkit contains sub-Pawkits. Choose whether to delete them or move them to root level.
                </p>
              </div>
            )}

            <p className="text-sm text-gray-400 mb-4">
              This will move this Pawkit to Trash. You can restore it within 30 days.
            </p>

            {hasChildren && (
              <div className="mb-4 p-3 rounded bg-gray-900 border border-gray-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deleteSubPawkits}
                    onChange={(e) => setDeleteSubPawkits(e.target.checked)}
                    className="rounded bg-gray-800 border-gray-700 text-accent focus:ring-accent"
                  />
                  <span className="text-sm text-gray-300">Delete all sub-Pawkits</span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  {deleteSubPawkits
                    ? "All sub-Pawkits will be moved to Trash individually"
                    : "Sub-Pawkits will be moved to root level"}
                </p>
              </div>
            )}

            <div className="mb-4 p-3 rounded bg-gray-900 border border-gray-800">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteCards}
                  onChange={(e) => setDeleteCards(e.target.checked)}
                  className="rounded bg-gray-800 border-gray-700 text-accent focus:ring-accent"
                />
                <span className="text-sm text-gray-300">Also delete all cards inside this Pawkit</span>
              </label>
              <p className="text-xs text-gray-500 mt-1 ml-6">
                {deleteCards
                  ? "All cards will be moved to Trash"
                  : "Cards will remain in your Library"}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded bg-gray-900 px-4 py-2 text-sm font-medium text-gray-100 hover:bg-gray-800 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 rounded bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 transition-colors disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Rename Modal */}
      {showRenameModal && mounted && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => !loading && setShowRenameModal(false)}
        >
          <div
            className="bg-gray-950 rounded-lg p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold text-gray-100 mb-4">Rename Pawkit</h2>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Enter new name"
              className="w-full rounded bg-gray-900 px-4 py-2 text-sm text-gray-100 placeholder-gray-500 border border-gray-800 focus:border-accent focus:outline-none"
              autoFocus
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleRename();
                } else if (e.key === "Escape") {
                  setShowRenameModal(false);
                }
              }}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowRenameModal(false)}
                className="flex-1 rounded bg-gray-900 px-4 py-2 text-sm font-medium text-gray-100 hover:bg-gray-800 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleRename}
                className="flex-1 rounded bg-accent px-4 py-2 text-sm font-medium text-gray-950 hover:bg-accent/90 transition-colors disabled:opacity-50"
                disabled={loading || !renameValue.trim()}
              >
                {loading ? "Renaming..." : "Rename"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Move Modal */}
      {showMoveModal && mounted && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => !loading && setShowMoveModal(false)}
        >
          <div
            className="bg-gray-950 rounded-lg p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold text-gray-100 mb-4">Move to another Pawkit</h2>
            <p className="text-sm text-gray-400 mb-4">
              Select a Pawkit to move this into, or select &quot;Root&quot; to make it a top-level Pawkit.
            </p>
            <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
              <button
                onClick={() => setSelectedMoveTarget(null)}
                className={`w-full rounded px-4 py-2 text-left text-sm transition-colors ${
                  selectedMoveTarget === null
                    ? "bg-accent text-gray-950"
                    : "bg-gray-900 text-gray-300 hover:bg-gray-800"
                }`}
              >
                Root (Top Level)
              </button>
              {allPawkits
                .filter((p) => p.id !== pawkitId)
                .map((pawkit) => (
                  <button
                    key={pawkit.id}
                    onClick={() => setSelectedMoveTarget(pawkit.id)}
                    className={`w-full rounded px-4 py-2 text-left text-sm transition-colors ${
                      selectedMoveTarget === pawkit.id
                        ? "bg-accent text-gray-950"
                        : "bg-gray-900 text-gray-300 hover:bg-gray-800"
                    }`}
                  >
                    {pawkit.name}
                  </button>
                ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowMoveModal(false)}
                className="flex-1 rounded bg-gray-900 px-4 py-2 text-sm font-medium text-gray-100 hover:bg-gray-800 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleMove}
                className="flex-1 rounded bg-accent px-4 py-2 text-sm font-medium text-gray-950 hover:bg-accent/90 transition-colors disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "Moving..." : "Move"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
