"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDataStore } from "@/lib/stores/data-store";

type DenPawkitActionsProps = {
  pawkitId: string;
  pawkitName: string;
  isPinned?: boolean;
  hasChildren?: boolean;
  allPawkits?: Array<{ id: string; name: string; slug: string }>;
  onUpdate?: () => void;
};

export function DenPawkitActions({ pawkitId, pawkitName, isPinned = false, hasChildren = false, allPawkits = [], onUpdate }: DenPawkitActionsProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameValue, setRenameValue] = useState(pawkitName);
  const [loading, setLoading] = useState(false);
  const [deleteCards, setDeleteCards] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { updateCollection } = useDataStore();

  const handleDelete = async () => {
    setLoading(true);
    try {
      // Call Den-specific API endpoint directly
      const response = await fetch(`/api/den/pawkits/${pawkitId}?deleteCards=${deleteCards}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete Den Pawkit');
      }

      setShowDeleteConfirm(false);

      // Call onUpdate to refresh the Den Pawkits list
      if (onUpdate) {
        onUpdate();
      }
    } catch (err) {
      alert("Failed to delete Den Pawkit");
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async () => {
    if (!renameValue.trim()) return;

    setLoading(true);
    try {
      // Use data store - updates IndexedDB first, then syncs to server
      await updateCollection(pawkitId, { name: renameValue.trim() });

      setShowRenameModal(false);

      // Call onUpdate to refresh the Den Pawkits list
      if (onUpdate) {
        onUpdate();
      }
    } catch (err) {
      alert("Failed to rename Den Pawkit");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
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
      <div className="relative" ref={menuRef}>
        <button
          onClick={(e) => {
            e.stopPropagation();
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

        {showMenu && (
          <div className="absolute right-0 mt-2 w-48 rounded-lg bg-gray-900 border border-gray-800 shadow-lg py-1 z-50">
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
                setShowDeleteConfirm(true);
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-rose-400 hover:bg-gray-800 hover:text-rose-300 transition-colors"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="bg-gray-950 rounded-lg p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold text-gray-100 mb-4">Delete Den Pawkit?</h2>
            <p className="text-sm text-gray-400 mb-4">
              This will permanently delete this Den Pawkit.
            </p>

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
                  ? "All cards will be permanently deleted"
                  : "Cards will remain in The Den"}
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
        </div>
      )}

      {/* Rename Modal */}
      {showRenameModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => !loading && setShowRenameModal(false)}
        >
          <div
            className="bg-gray-950 rounded-lg p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold text-gray-100 mb-4">Rename Den Pawkit</h2>
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
        </div>
      )}
    </>
  );
}
