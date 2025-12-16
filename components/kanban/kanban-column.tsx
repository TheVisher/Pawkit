"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CardModel } from "@/lib/types";
import { DraggableKanbanCard } from "./kanban-card";
import { KanbanColumn as KanbanColumnType } from "./kanban-types";
import { Plus } from "lucide-react";

type KanbanColumnProps = {
  column: KanbanColumnType;
  cards: CardModel[];
  onAddCard?: (columnId: string) => void;
  onMoveCard?: (cardId: string, toColumnId: string) => void;
  allColumns?: { id: string; title: string }[];
};

export function KanbanColumn({
  column,
  cards,
  onAddCard,
  onMoveCard,
  allColumns = [],
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: "column",
      columnId: column.id,
    },
  });

  return (
    <div
      className={`flex flex-col w-72 min-w-72 rounded-xl bg-surface-soft/50 border transition-colors ${
        isOver ? "border-accent bg-accent/5" : "border-transparent"
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between p-3 border-b border-subtle">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: column.color || "#6b7280" }}
          />
          <h3 className="text-sm font-medium text-foreground">{column.title}</h3>
          <span className="text-xs text-muted-foreground bg-surface-soft px-1.5 py-0.5 rounded">
            {cards.length}
          </span>
        </div>
        {onAddCard && (
          <button
            onClick={() => onAddCard(column.id)}
            className="p-1 rounded hover:bg-surface-soft text-muted-foreground hover:text-foreground transition-colors"
            title="Add card"
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      {/* Cards Container */}
      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[200px]"
      >
        <SortableContext
          items={cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((card) => (
            <DraggableKanbanCard
              key={card.id}
              card={card}
              columnId={column.id}
              onMoveToColumn={onMoveCard}
              availableColumns={allColumns}
            />
          ))}
        </SortableContext>

        {/* Empty state */}
        {cards.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-muted-foreground border border-dashed border-subtle rounded-lg">
            Drop cards here
          </div>
        )}
      </div>
    </div>
  );
}
