"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

type PawkitsHeaderProps = {
  parentSlug?: string | null;
  parentId?: string | null;
  allPawkits?: Array<{ id: string; name: string; slug: string }>;
};

export function PawkitsHeader({ parentSlug = null, parentId = null, allPawkits = [] }: PawkitsHeaderProps) {
  const [showModal, setShowModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [pawkitName, setPawkitName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [selectedMoveTarget, setSelectedMoveTarget] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const isSubPawkit = !!parentSlug;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = pawkitName.trim();
    if (!trimmedName) {
      setError("Pawkit name cannot be empty");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload: { name: string; parentId?: string } = {
        name: trimmedName,
      };
      // Only include parentId if we're creating a sub-pawkit
      if (parentId) {
        payload.parentId = parentId;
      }

      const response = await fetch("/api/pawkits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || "Failed to create Pawkit");
        setLoading(false);
        return;
      }

      setPawkitName("");
      setShowModal(false);
      setLoading(false);
      router.refresh();
    } catch (err) {
      setError("Failed to create Pawkit");
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setShowModal(false);
      setPawkitName("");
      setError(null);
    }
  };

  const handleDelete = async () => {
    if (!parentId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/pawkits/${parentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete Pawkit");
      }

      router.push("/pawkits");
      router.refresh();
    } catch (err) {
      alert("Failed to delete Pawkit");
      setLoading(false);
    }
  };

  const handleRename = async () => {
    if (!parentId || !renameValue.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/pawkits/${parentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameValue.trim() }),
      });

      if (!response.ok) {
        throw new Error("Failed to rename Pawkit");
      }

      setShowRenameModal(false);
      setRenameValue("");
      setLoading(false);
      router.refresh();
    } catch (err) {
      alert("Failed to rename Pawkit");
      setLoading(false);
    }
  };

  const handleMove = async () => {
    if (!parentId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/pawkits/${parentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId: selectedMoveTarget }),
      });

      if (!response.ok) {
        throw new Error("Failed to move Pawkit");
      }

      setShowMoveModal(false);
      setSelectedMoveTarget(null);
      setLoading(false);
      router.push("/pawkits");
      router.refresh();
    } catch (err) {
      alert("Failed to move Pawkit");
      setLoading(false);
    }
  };

  // Click outside to close menu
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
      <div className="flex items-center justify-between mb-6">
        {!isSubPawkit && (
          <div>
            <h1 className="text-3xl font-semibold text-gray-100">Pawkits</h1>
            <p className="text-sm text-gray-400">
              Organize cards into visual groups. Open a Pawkit to filter the library or manage the hierarchy below.
            </p>
          </div>
        )}
        <div className={`flex items-center gap-2 ${isSubPawkit ? "ml-auto" : ""}`}>
          <button
            onClick={() => setShowModal(true)}
            className="rounded bg-accent px-4 py-2 text-sm font-medium text-gray-950 hover:bg-accent/90 transition-colors"
          >
            + Create {isSubPawkit ? "Sub-" : ""}Pawkit
          </button>
          {isSubPawkit && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
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
                    onClick={() => {
                      setShowRenameModal(true);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-gray-100 transition-colors"
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => {
                      setShowMoveModal(true);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-gray-100 transition-colors"
                  >
                    Move to another Pawkit
                  </button>
                  <button
                    onClick={() => {
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
          )}
        </div>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        >
          <div
            className="bg-gray-950 rounded-lg p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold text-gray-100 mb-4">
              Create {isSubPawkit ? "Sub-" : ""}Pawkit
            </h2>
            <form onSubmit={handleCreate}>
              <input
                type="text"
                value={pawkitName}
                onChange={(e) => {
                  setPawkitName(e.target.value);
                  setError(null);
                }}
                placeholder="Enter Pawkit name"
                className="w-full rounded bg-gray-900 px-4 py-2 text-sm text-gray-100 placeholder-gray-500 border border-gray-800 focus:border-accent focus:outline-none"
                autoFocus
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    handleClose();
                  }
                }}
              />
              {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 rounded bg-gray-900 px-4 py-2 text-sm font-medium text-gray-100 hover:bg-gray-800 transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded bg-accent px-4 py-2 text-sm font-medium text-gray-950 hover:bg-accent/90 transition-colors disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
            <h2 className="text-xl font-semibold text-gray-100 mb-4">Delete Pawkit?</h2>
            <p className="text-sm text-gray-400 mb-6">
              This will permanently delete this Pawkit and all its contents. This action cannot be undone.
            </p>
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
        </div>
      )}

      {/* Move Modal */}
      {showMoveModal && (
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
                .filter((p) => p.id !== parentId)
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
        </div>
      )}
    </>
  );
}
