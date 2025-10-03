"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PawkitsHeaderProps = {
  parentSlug?: string | null;
};

export function PawkitsHeader({ parentSlug = null }: PawkitsHeaderProps) {
  const [showModal, setShowModal] = useState(false);
  const [pawkitName, setPawkitName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      // TODO: need to get parent ID from slug if creating sub-pawkit
      if (parentSlug) {
        // payload.parentId = parentId from slug
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
          <button className="flex items-center justify-center h-9 w-9 rounded text-gray-400 hover:bg-gray-900 hover:text-gray-100 transition-colors">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>
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
    </>
  );
}
