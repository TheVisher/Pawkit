"use client";

import { useEffect, useState } from "react";
import { CardModel, CollectionNode } from "@/lib/types";
import { Toast } from "@/components/ui/toast";

type Tab = "pawkits" | "pin" | "notes" | "summary" | "actions";

type CardDetailModalProps = {
  card: CardModel;
  collections: CollectionNode[];
  onClose: () => void;
  onUpdate: (card: CardModel) => void;
  onDelete: () => void;
};

export function CardDetailModal({ card, collections, onClose, onUpdate, onDelete }: CardDetailModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("pawkits");
  const [notes, setNotes] = useState(card.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isPinned, setIsPinned] = useState(card.pinned ?? false);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Auto-save notes with debounce
  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (notes === (card.notes ?? "")) return;
      setSaving(true);
      try {
        const response = await fetch(`/api/cards/${card.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes })
        });
        if (response.ok) {
          const updated = await response.json();
          onUpdate(updated);
        }
      } catch (error) {
        console.error("Failed to save notes:", error);
      } finally {
        setSaving(false);
      }
    }, 600);
    return () => clearTimeout(timeout);
  }, [notes, card.id, card.notes, onUpdate]);

  const handleSaveNotes = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes })
      });
      if (response.ok) {
        const updated = await response.json();
        onUpdate(updated);
        setToast("Notes saved");
      }
    } catch (error) {
      console.error("Failed to save notes:", error);
      setToast("Failed to save notes");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePin = async () => {
    const newPinned = !isPinned;
    setIsPinned(newPinned);

    try {
      const response = await fetch(`/api/cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: newPinned })
      });
      if (response.ok) {
        const updated = await response.json();
        onUpdate(updated);
        setToast(newPinned ? "Pinned to home" : "Unpinned from home");
      } else {
        // Rollback on error
        setIsPinned(!newPinned);
        setToast("Failed to update pin status");
      }
    } catch (error) {
      // Rollback on error
      setIsPinned(!newPinned);
      setToast("Failed to update pin status");
    }
  };

  const handleAddToPawkit = async (slug: string) => {
    const isAlreadyIn = card.collections.includes(slug);
    const nextCollections = isAlreadyIn
      ? card.collections.filter((s) => s !== slug)
      : Array.from(new Set([slug, ...card.collections]));

    try {
      const response = await fetch(`/api/cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collections: nextCollections })
      });
      if (response.ok) {
        const updated = await response.json();
        onUpdate(updated);
        setToast(isAlreadyIn ? "Removed from Pawkit" : "Added to Pawkit");
      }
    } catch (error) {
      console.error("Failed to update pawkit:", error);
      setToast("Failed to update Pawkit");
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/cards/${card.id}`, { method: "DELETE" });
      if (response.ok) {
        onDelete();
      } else {
        setToast("Failed to delete card");
      }
    } catch (error) {
      console.error("Failed to delete card:", error);
      setToast("Failed to delete card");
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <div
          className="bg-gray-950 rounded-lg border border-gray-800 shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Left Panel - Image */}
          <div className="flex-1 flex flex-col bg-gray-900/50">
            <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
              {card.image ? (
                <img
                  src={card.image}
                  alt={card.title || "Card preview"}
                  className="max-w-full max-h-full object-contain rounded"
                />
              ) : (
                <div className="text-center space-y-4">
                  <img
                    src="/PawkitLogo.png"
                    alt="Pawkit"
                    className="w-32 h-32 mx-auto opacity-50"
                  />
                  <h3 className="text-xl font-semibold text-gray-300">
                    {card.title || card.domain || card.url}
                  </h3>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-96 border-l border-gray-800 flex flex-col">
            {/* Header with Close Button */}
            <div className="border-b border-gray-800 p-4 flex items-center justify-between">
              <h2 className="font-semibold text-gray-100">Card Details</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-200 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-800 px-4 flex gap-1 overflow-x-auto">
              <TabButton
                active={activeTab === "pawkits"}
                onClick={() => setActiveTab("pawkits")}
                label="Pawkits"
              />
              <TabButton
                active={activeTab === "pin"}
                onClick={() => setActiveTab("pin")}
                label="Pin"
              />
              <TabButton
                active={activeTab === "notes"}
                onClick={() => setActiveTab("notes")}
                label="Notes"
              />
              <TabButton
                active={activeTab === "summary"}
                onClick={() => setActiveTab("summary")}
                label="Summary"
              />
              <TabButton
                active={activeTab === "actions"}
                onClick={() => setActiveTab("actions")}
                label="Actions"
              />
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeTab === "pawkits" && (
                <PawkitsTab
                  collections={collections}
                  currentCollections={card.collections}
                  onSelect={handleAddToPawkit}
                />
              )}
              {activeTab === "pin" && (
                <PinTab isPinned={isPinned} onToggle={handleTogglePin} />
              )}
              {activeTab === "notes" && (
                <NotesTab
                  notes={notes}
                  onChange={setNotes}
                  onSave={handleSaveNotes}
                  saving={saving}
                />
              )}
              {activeTab === "summary" && <SummaryTab card={card} />}
              {activeTab === "actions" && <ActionsTab />}

              {/* Metadata Section - Always Visible Below Tab Content */}
              <MetadataSection card={card} />
            </div>

            {/* Delete Button at Bottom */}
            <div className="border-t border-gray-800 p-4">
              <button
                onClick={handleDelete}
                className="w-full rounded bg-rose-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-700 transition-colors"
              >
                Delete Card
              </button>
            </div>
          </div>
        </div>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}

// Tab Button Component
function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 text-xs font-medium transition-colors border-b-2 ${
        active
          ? "border-accent text-accent"
          : "border-transparent text-gray-400 hover:text-gray-200"
      }`}
    >
      {label}
    </button>
  );
}

// Pawkits Tab
type PawkitsTabProps = {
  collections: CollectionNode[];
  currentCollections: string[];
  onSelect: (slug: string) => void;
};

function PawkitsTab({ collections, currentCollections, onSelect }: PawkitsTabProps) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-gray-500 mb-3">
        Click to add or remove this card from Pawkits
      </p>
      {collections.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">No Pawkits available</p>
      ) : (
        collections.map((collection) => (
          <PawkitTreeItem
            key={collection.id}
            node={collection}
            depth={0}
            currentCollections={currentCollections}
            onSelect={onSelect}
          />
        ))
      )}
    </div>
  );
}

type PawkitTreeItemProps = {
  node: CollectionNode;
  depth: number;
  currentCollections: string[];
  onSelect: (slug: string) => void;
};

function PawkitTreeItem({ node, depth, currentCollections, onSelect }: PawkitTreeItemProps) {
  const hasChildren = node.children && node.children.length > 0;
  const paddingLeft = 16 + (depth * 16);
  const isActive = currentCollections.includes(node.slug);

  return (
    <>
      <button
        onClick={() => onSelect(node.slug)}
        style={{ paddingLeft: `${paddingLeft}px` }}
        className={`w-full text-left rounded pr-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
          isActive
            ? "bg-accent/20 text-accent border border-accent/30"
            : "bg-gray-800 text-gray-200 hover:bg-gray-700"
        }`}
      >
        <span className="flex items-center gap-2">
          📁 {node.name}
        </span>
        {isActive && <span className="text-accent text-lg">✓</span>}
      </button>
      {hasChildren && node.children.map((child) => (
        <PawkitTreeItem
          key={child.id}
          node={child}
          depth={depth + 1}
          currentCollections={currentCollections}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

// Pin Tab
function PinTab({ isPinned, onToggle }: { isPinned: boolean; onToggle: () => void }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Pin this card to quick access on your home page
      </p>
      <button
        onClick={onToggle}
        className={`w-full rounded px-6 py-3 text-sm font-medium transition-colors ${
          isPinned
            ? "bg-accent text-gray-900 hover:bg-accent/90"
            : "bg-gray-800 text-gray-200 hover:bg-gray-700"
        }`}
      >
        {isPinned ? "📌 Pinned" : "Pin to Home"}
      </button>
      {isPinned && (
        <p className="text-xs text-gray-500 text-center">
          This card appears in your home page quick access
        </p>
      )}
    </div>
  );
}

// Notes Tab
function NotesTab({
  notes,
  onChange,
  onSave,
  saving
}: {
  notes: string;
  onChange: (value: string) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-3">
      <textarea
        value={notes}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Add notes about this card..."
        className="w-full min-h-[200px] rounded border border-gray-800 bg-gray-900 p-3 text-sm text-gray-100 placeholder-gray-500 resize-none focus:border-accent focus:outline-none"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {saving ? "Saving..." : "Auto-saves as you type"}
        </span>
        <button
          onClick={onSave}
          disabled={saving}
          className="rounded bg-accent px-4 py-2 text-xs font-medium text-gray-900 hover:bg-accent/90 transition-colors disabled:opacity-50"
        >
          Save Now
        </button>
      </div>
    </div>
  );
}

// Summary Tab
function SummaryTab({ card }: { card: CardModel }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        AI-powered summaries coming soon
      </p>
      {card.description && (
        <div className="rounded bg-gray-900/50 p-4">
          <h4 className="text-xs font-medium text-gray-400 mb-2">Description</h4>
          <p className="text-sm text-gray-300">{card.description}</p>
        </div>
      )}
      <div className="text-center py-8">
        <div className="text-4xl mb-2">🤖</div>
        <p className="text-sm text-gray-500">Summary feature coming soon</p>
      </div>
    </div>
  );
}

// Actions Tab
function ActionsTab() {
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 mb-4">
        Additional actions for this card
      </p>
      <button className="w-full text-left rounded bg-gray-800 px-4 py-3 text-sm text-gray-200 hover:bg-gray-700 transition-colors">
        🔗 Copy Link
      </button>
      <button className="w-full text-left rounded bg-gray-800 px-4 py-3 text-sm text-gray-200 hover:bg-gray-700 transition-colors">
        📤 Share
      </button>
      <button className="w-full text-left rounded bg-gray-800 px-4 py-3 text-sm text-gray-200 hover:bg-gray-700 transition-colors">
        📋 Duplicate
      </button>
      <div className="text-center py-8">
        <p className="text-xs text-gray-500">More actions coming soon</p>
      </div>
    </div>
  );
}

// Metadata Section
function MetadataSection({ card }: { card: CardModel }) {
  return (
    <div className="border-t border-gray-800 pt-4 mt-4 space-y-3">
      <h3 className="text-xs font-medium text-gray-500 uppercase">Details</h3>

      <div>
        <h4 className="text-lg font-semibold text-gray-100 mb-1">
          {card.title || card.domain || "Untitled"}
        </h4>
        <a
          href={card.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-accent hover:underline break-all"
        >
          {card.url}
        </a>
      </div>

      {card.collections.length > 0 && (
        <div>
          <h5 className="text-xs text-gray-500 mb-1">Pawkits</h5>
          <div className="flex flex-wrap gap-2">
            {card.collections.map((collection) => (
              <span
                key={collection}
                className="inline-block rounded bg-gray-800 px-2 py-1 text-xs text-gray-300"
              >
                📁 {collection}
              </span>
            ))}
          </div>
        </div>
      )}

      {card.tags.length > 0 && (
        <div>
          <h5 className="text-xs text-gray-500 mb-1">Tags</h5>
          <div className="flex flex-wrap gap-2">
            {card.tags.map((tag) => (
              <span
                key={tag}
                className="inline-block rounded bg-gray-800 px-2 py-1 text-xs text-gray-300"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2 text-xs text-gray-400">
        <div className="flex justify-between">
          <span>Status</span>
          <span className={`px-2 py-0.5 rounded text-xs ${
            card.status === "READY" ? "bg-green-900/30 text-green-400" :
            card.status === "ERROR" ? "bg-rose-900/30 text-rose-400" :
            "bg-yellow-900/30 text-yellow-400"
          }`}>
            {card.status}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Domain</span>
          <span className="text-gray-300">{card.domain || "—"}</span>
        </div>
        <div className="flex justify-between">
          <span>Created</span>
          <span className="text-gray-300">
            {new Date(card.createdAt).toLocaleDateString()}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Updated</span>
          <span className="text-gray-300">
            {new Date(card.updatedAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}
