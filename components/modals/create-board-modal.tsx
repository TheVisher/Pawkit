"use client";

import { useState } from "react";
import { KanbanSquare, Plus, X, GripVertical } from "lucide-react";
import { GlassModal } from "@/components/ui/glass-modal";
import { BoardColumn, DEFAULT_BOARD_COLUMNS } from "@/lib/types/board";

interface CreateBoardModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string, columns: BoardColumn[]) => Promise<void>;
  parentId?: string;
}

export function CreateBoardModal({
  open,
  onClose,
  onSubmit,
  parentId,
}: CreateBoardModalProps) {
  const [name, setName] = useState("");
  const [columns, setColumns] = useState<BoardColumn[]>(DEFAULT_BOARD_COLUMNS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Board name is required");
      return;
    }
    if (columns.length === 0) {
      setError("At least one column is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(name.trim(), columns);
      // Reset form on success
      setName("");
      setColumns(DEFAULT_BOARD_COLUMNS);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create board");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setName("");
      setColumns(DEFAULT_BOARD_COLUMNS);
      setError(null);
      onClose();
    }
  };

  const addColumn = () => {
    const newTag = `status:column-${columns.length + 1}`;
    setColumns([...columns, { tag: newTag, label: `Column ${columns.length + 1}` }]);
  };

  const updateColumn = (index: number, updates: Partial<BoardColumn>) => {
    setColumns(columns.map((col, i) => (i === index ? { ...col, ...updates } : col)));
  };

  const removeColumn = (index: number) => {
    if (columns.length > 1) {
      setColumns(columns.filter((_, i) => i !== index));
    }
  };

  return (
    <GlassModal open={open} onClose={handleClose} maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20">
            <KanbanSquare className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Create Board</h2>
            <p className="text-sm text-gray-400">
              Organize cards into columns with drag-and-drop
            </p>
          </div>
        </div>

        {/* Board Name */}
        <div className="space-y-2">
          <label htmlFor="board-name" className="text-sm font-medium text-gray-300">
            Board Name
          </label>
          <input
            id="board-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Project Tasks, Content Pipeline"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
            autoFocus
            disabled={isSubmitting}
          />
        </div>

        {/* Columns */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-300">Columns</label>
            <button
              type="button"
              onClick={addColumn}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-purple-400 hover:bg-purple-500/10 transition-colors"
              disabled={isSubmitting}
            >
              <Plus size={14} />
              Add Column
            </button>
          </div>

          <div className="space-y-2">
            {columns.map((column, index) => (
              <div
                key={index}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2"
              >
                <GripVertical size={16} className="text-gray-500 cursor-grab" />
                <input
                  type="text"
                  value={column.label}
                  onChange={(e) => updateColumn(index, { label: e.target.value })}
                  placeholder="Column name"
                  className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => removeColumn(index)}
                  className="rounded p-1 text-gray-500 hover:bg-white/10 hover:text-gray-300 transition-colors disabled:opacity-50"
                  disabled={columns.length <= 1 || isSubmitting}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-500">
            Cards are assigned to columns using status tags (e.g., status:todo)
          </p>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl px-4 py-2 text-sm text-gray-400 hover:bg-white/5 transition-colors"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Creating..." : "Create Board"}
          </button>
        </div>
      </form>
    </GlassModal>
  );
}
