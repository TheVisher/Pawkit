"use client";

import { useState, useMemo, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  pointerWithin,
  rectIntersection,
  getFirstCollision,
  UniqueIdentifier,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { CardModel } from "@/lib/types";
import { KanbanColumn } from "./kanban-column";
import { KanbanCard } from "./kanban-card";
import {
  KanbanColumn as KanbanColumnType,
  DEFAULT_KANBAN_COLUMNS,
} from "./kanban-types";
import { Plus, Settings } from "lucide-react";

type KanbanViewProps = {
  cards: CardModel[];
  initialColumns?: KanbanColumnType[];
  onColumnsChange?: (columns: KanbanColumnType[]) => void;
  onCardMove?: (cardId: string, fromColumn: string, toColumn: string) => void;
};

export function KanbanView({
  cards,
  initialColumns,
  onColumnsChange,
  onCardMove,
}: KanbanViewProps) {
  // Initialize columns - distribute cards across columns
  const [columns, setColumns] = useState<KanbanColumnType[]>(() => {
    if (initialColumns && initialColumns.length > 0) {
      return initialColumns;
    }

    // Default: put all cards in backlog
    const defaultCols = DEFAULT_KANBAN_COLUMNS.map((col) => ({ ...col }));
    defaultCols[0].cardIds = cards.map((c) => c.id);
    return defaultCols;
  });

  // Track the active dragged item
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [activeColumn, setActiveColumn] = useState<string | null>(null);

  // Find the active card being dragged
  const activeCard = useMemo(() => {
    if (!activeId) return null;
    return cards.find((c) => c.id === activeId);
  }, [activeId, cards]);

  // Create a map of cardId -> card for quick lookups
  const cardMap = useMemo(() => {
    const map = new Map<string, CardModel>();
    cards.forEach((c) => map.set(c.id, c));
    return map;
  }, [cards]);

  // Get cards for a column
  const getColumnCards = useCallback(
    (columnId: string): CardModel[] => {
      const col = columns.find((c) => c.id === columnId);
      if (!col) return [];
      return col.cardIds
        .map((id) => cardMap.get(id))
        .filter(Boolean) as CardModel[];
    },
    [columns, cardMap]
  );

  // Configure sensors - use pointer sensor with activation constraint
  // to prevent drag from interfering with click
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    })
  );

  // Custom collision detection - prefer column drops
  const collisionDetectionStrategy = useCallback(
    (args: Parameters<typeof closestCorners>[0]) => {
      // First, check if we're over a column
      const pointerCollisions = pointerWithin(args);
      const columnCollision = pointerCollisions.find(
        (collision) =>
          columns.some((col) => col.id === collision.id)
      );

      if (columnCollision) {
        return [columnCollision];
      }

      // Fall back to rect intersection for cards
      const rectCollisions = rectIntersection(args);
      return rectCollisions;
    },
    [columns]
  );

  // Find which column a card is in
  const findColumnForCard = useCallback(
    (cardId: string): string | null => {
      for (const col of columns) {
        if (col.cardIds.includes(cardId)) {
          return col.id;
        }
      }
      return null;
    },
    [columns]
  );

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id);
    setActiveColumn(findColumnForCard(active.id as string));
  };

  // Handle drag over (for moving between columns)
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeCardId = active.id as string;
    const overId = over.id as string;

    // Find source and destination columns
    const sourceCol = findColumnForCard(activeCardId);

    // Check if we're over a column directly
    const isOverColumn = columns.some((col) => col.id === overId);
    const destCol = isOverColumn ? overId : findColumnForCard(overId);

    if (!sourceCol || !destCol || sourceCol === destCol) return;

    // Move card to new column
    setColumns((cols) =>
      cols.map((col) => {
        if (col.id === sourceCol) {
          return {
            ...col,
            cardIds: col.cardIds.filter((id) => id !== activeCardId),
          };
        }
        if (col.id === destCol) {
          // If dropping on a card, insert at that position
          if (!isOverColumn) {
            const overIndex = col.cardIds.indexOf(overId);
            const newIds = [...col.cardIds];
            newIds.splice(overIndex, 0, activeCardId);
            return { ...col, cardIds: newIds };
          }
          // If dropping on column, add to end
          return {
            ...col,
            cardIds: [...col.cardIds, activeCardId],
          };
        }
        return col;
      })
    );
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      setActiveColumn(null);
      return;
    }

    const activeCardId = active.id as string;
    const overId = over.id as string;

    // Find source column
    const sourceCol = findColumnForCard(activeCardId);
    if (!sourceCol) {
      setActiveId(null);
      setActiveColumn(null);
      return;
    }

    // Check if reordering within same column
    const col = columns.find((c) => c.id === sourceCol);
    if (col && col.cardIds.includes(overId)) {
      const oldIndex = col.cardIds.indexOf(activeCardId);
      const newIndex = col.cardIds.indexOf(overId);

      if (oldIndex !== newIndex) {
        setColumns((cols) =>
          cols.map((c) => {
            if (c.id === sourceCol) {
              return {
                ...c,
                cardIds: arrayMove(c.cardIds, oldIndex, newIndex),
              };
            }
            return c;
          })
        );
      }
    }

    // Notify parent of changes
    if (activeColumn && sourceCol !== activeColumn) {
      onCardMove?.(activeCardId, activeColumn, sourceCol);
    }

    // Notify of column changes
    onColumnsChange?.(columns);

    setActiveId(null);
    setActiveColumn(null);
  };

  // Get all columns for move menu
  const allColumns = columns.map((col) => ({ id: col.id, title: col.title }));

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetectionStrategy}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full flex flex-col">
        {/* Board Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-subtle">
          <h2 className="text-lg font-semibold text-foreground">Kanban Board</h2>
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-surface-soft rounded-lg transition-colors"
              onClick={() => {
                // TODO: Add column
              }}
            >
              <Plus size={16} />
              Add Column
            </button>
            <button
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-surface-soft rounded-lg transition-colors"
              onClick={() => {
                // TODO: Board settings
              }}
            >
              <Settings size={16} />
            </button>
          </div>
        </div>

        {/* Columns Container - horizontal scroll */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
          <div className="flex gap-4 h-full">
            {columns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                cards={getColumnCards(column.id)}
                allColumns={allColumns}
                onMoveCard={(cardId, toColumnId) => {
                  // Move card to different column via context menu
                  const fromCol = findColumnForCard(cardId);
                  if (!fromCol || fromCol === toColumnId) return;

                  setColumns((cols) =>
                    cols.map((col) => {
                      if (col.id === fromCol) {
                        return {
                          ...col,
                          cardIds: col.cardIds.filter((id) => id !== cardId),
                        };
                      }
                      if (col.id === toColumnId) {
                        return {
                          ...col,
                          cardIds: [...col.cardIds, cardId],
                        };
                      }
                      return col;
                    })
                  );

                  onCardMove?.(cardId, fromCol, toColumnId);
                  onColumnsChange?.(columns);
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Drag Overlay - renders the card being dragged */}
      {/* Uses createPortal internally to render at document root */}
      {/* This fixes the drag offset issue by rendering outside the scrollable container */}
      <DragOverlay
        dropAnimation={{
          duration: 200,
          easing: "ease",
        }}
      >
        {activeId && activeCard ? (
          <KanbanCard
            card={activeCard}
            columnId={activeColumn || ""}
            isDragOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
