"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { BoardColumn } from "@/lib/types/board";

interface AddColumnButtonProps {
  onAddColumn: (column: BoardColumn) => void;
}

type ColumnColor = "gray" | "purple" | "blue" | "green" | "amber" | "red";

const COLOR_OPTIONS: { value: ColumnColor; label: string; className: string }[] = [
  { value: "gray", label: "Gray", className: "bg-gray-500" },
  { value: "purple", label: "Purple", className: "bg-purple-500" },
  { value: "blue", label: "Blue", className: "bg-blue-500" },
  { value: "green", label: "Green", className: "bg-green-500" },
  { value: "amber", label: "Amber", className: "bg-amber-500" },
  { value: "red", label: "Red", className: "bg-red-500" },
];

export function AddColumnButton({ onAddColumn }: AddColumnButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState<ColumnColor>("purple");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const slug = name.trim().toLowerCase().replace(/\s+/g, "-");
    const tag = `status:${slug}`;

    onAddColumn({
      tag,
      label: name.trim(),
      color,
    });

    setName("");
    setColor("purple");
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex-shrink-0 w-[280px] md:w-[320px] h-20 rounded-xl border-2 border-dashed border-subtle flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-accent/50 hover:bg-accent/5 transition-colors"
      >
        <Plus size={18} />
        <span className="text-sm font-medium">Add Column</span>
      </button>
    );
  }

  return (
    <div className="flex-shrink-0 w-[280px] md:w-[320px] rounded-xl border border-subtle bg-surface p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-foreground">New Column</h4>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 rounded hover:bg-surface-soft text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Column name..."
          className="w-full px-3 py-2 rounded-lg bg-surface-soft border border-subtle text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
          autoFocus
        />

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Color</label>
          <div className="flex gap-2">
            {COLOR_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setColor(opt.value)}
                className={`w-6 h-6 rounded-full ${opt.className} transition-all ${
                  color === opt.value
                    ? "ring-2 ring-offset-2 ring-offset-surface ring-white/50 scale-110"
                    : "opacity-60 hover:opacity-100"
                }`}
                title={opt.label}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="flex-1 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-surface-soft transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="flex-1 px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent/90 transition-colors"
          >
            Add Column
          </button>
        </div>
      </form>
    </div>
  );
}
