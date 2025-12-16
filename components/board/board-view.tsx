"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { CardDTO } from "@/lib/server/cards";
import { BoardColumn, BoardConfig, getStatusFromTags, updateStatusTag } from "@/lib/types/board";
import { BoardCard } from "./board-card";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
} from "@dnd-kit/core";
import { useDataStore } from "@/lib/stores/data-store";
import { useToastStore } from "@/lib/stores/toast-store";

interface BoardViewProps {
  cards: CardDTO[];
  boardConfig: BoardConfig;
  collectionSlug: string;
  onCardClick?: (card: CardDTO) => void;
  onAddCard?: (columnTag: string) => void;
}

export function BoardView({
  cards,
  boardConfig,
  collectionSlug,
  onCardClick,
  onAddCard
}: BoardViewProps) {
  const { updateCard } = useDataStore();
  const toast = useToastStore();
  const [activeCard, setActiveCard] = useState<CardDTO | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // Configure sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    })
  );

  // Group cards by their status tag
  const cardsByColumn = useMemo(() => {
    const grouped: Record<string, CardDTO[]> = {};

    // Initialize all columns with empty arrays
    boardConfig.columns.forEach(col => {
      grouped[col.tag] = [];
    });

    // Add an "uncategorized" column for cards without a status
    grouped["uncategorized"] = [];

    // Sort cards into columns based on their status tag
    cards.forEach(card => {
      const statusTag = getStatusFromTags(card.tags || []);

      if (statusTag && grouped[statusTag]) {
        grouped[statusTag].push(card);
      } else {
        // Check if card has any of the column tags
        const matchingTag = boardConfig.columns.find(col =>
          card.tags?.includes(col.tag)
        );

        if (matchingTag) {
          grouped[matchingTag.tag].push(card);
        } else {
          grouped["uncategorized"].push(card);
        }
      }
    });

    return grouped;
  }, [cards, boardConfig.columns]);

  // Calculate if we should show uncategorized column
  const showUncategorized = cardsByColumn["uncategorized"]?.length > 0;
  const totalColumns = boardConfig.columns.length + (showUncategorized ? 1 : 0);

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const card = cards.find(c => c.id === active.id);
    if (card) {
      setActiveCard(card);
    }
  };

  // Handle drag over (for visual feedback)
  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    setOverId(over?.id as string || null);
  };

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveCard(null);
    setOverId(null);

    if (!over) return;

    const cardId = active.id as string;
    const targetColumnTag = over.id as string;

    // Find the card
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    // Get current status tag
    const currentStatusTag = getStatusFromTags(card.tags || []);

    // If dropping in the same column, do nothing
    if (currentStatusTag === targetColumnTag) return;

    // If dropping from uncategorized to uncategorized, do nothing
    if (!currentStatusTag && targetColumnTag === "uncategorized") return;

    try {
      // Update the card's tags
      const newTags = targetColumnTag === "uncategorized"
        ? (card.tags || []).filter(t => !t.startsWith("status:"))
        : updateStatusTag(card.tags || [], targetColumnTag);

      await updateCard(cardId, { tags: newTags });

      // Find column label for toast
      const targetColumn = boardConfig.columns.find(c => c.tag === targetColumnTag);
      const columnLabel = targetColumn?.label || (targetColumnTag === "uncategorized" ? "No Status" : targetColumnTag);

      toast.success(`Moved to ${columnLabel}`);
    } catch (error) {
      toast.error("Failed to move card");
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 pb-4 min-h-[600px]">
        {/* Render each column */}
        {boardConfig.columns.map((column) => (
          <DroppableColumn
            key={column.tag}
            column={column}
            cards={cardsByColumn[column.tag] || []}
            onCardClick={onCardClick}
            onAddCard={onAddCard}
            totalColumns={totalColumns}
            isOver={overId === column.tag}
          />
        ))}

        {/* Uncategorized column if there are cards without status */}
        {showUncategorized && (
          <DroppableColumn
            column={{ tag: "uncategorized", label: "No Status", color: "gray" }}
            cards={cardsByColumn["uncategorized"]}
            onCardClick={onCardClick}
            onAddCard={onAddCard}
            totalColumns={totalColumns}
            isOver={overId === "uncategorized"}
          />
        )}
      </div>

      {/* Drag Overlay - Shows the card being dragged */}
      <DragOverlay>
        {activeCard ? (
          <div className="opacity-90 rotate-3 scale-105">
            <BoardCard card={activeCard} isDragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

interface DroppableColumnProps {
  column: BoardColumn;
  cards: CardDTO[];
  onCardClick?: (card: CardDTO) => void;
  onAddCard?: (columnTag: string) => void;
  totalColumns: number;
  isOver: boolean;
}

function DroppableColumn({
  column,
  cards,
  onCardClick,
  onAddCard,
  totalColumns,
  isOver
}: DroppableColumnProps) {
  const { setNodeRef, isOver: isOverDroppable } = useDroppable({
    id: column.tag,
  });

  // Get column accent color
  const getColumnColor = (color?: string) => {
    switch (color) {
      case "red": return "bg-red-500/20 border-red-500/30";
      case "orange": return "bg-orange-500/20 border-orange-500/30";
      case "yellow": return "bg-yellow-500/20 border-yellow-500/30";
      case "green": return "bg-green-500/20 border-green-500/30";
      case "blue": return "bg-blue-500/20 border-blue-500/30";
      case "purple": return "bg-purple-500/20 border-purple-500/30";
      case "gray": return "bg-gray-500/20 border-gray-500/30";
      default: return "bg-accent/10 border-accent/20";
    }
  };

  const getHeaderColor = (color?: string) => {
    switch (color) {
      case "red": return "text-red-400";
      case "orange": return "text-orange-400";
      case "yellow": return "text-yellow-400";
      case "green": return "text-green-400";
      case "blue": return "text-blue-400";
      case "purple": return "text-purple-400";
      case "gray": return "text-gray-400";
      default: return "text-accent";
    }
  };

  const showDropIndicator = isOver || isOverDroppable;

  return (
    <div className="flex-1 min-w-[280px] max-w-[400px]">
      {/* Column Header */}
      <div className={`rounded-t-xl px-4 py-3 border ${getColumnColor(column.color)}`}>
        <div className="flex items-center justify-between">
          <h3 className={`font-semibold text-sm ${getHeaderColor(column.color)}`}>
            {column.label}
          </h3>
          <span className="text-xs text-muted-foreground bg-surface/80 px-2.5 py-1 rounded-full font-medium">
            {cards.length}
          </span>
        </div>
      </div>

      {/* Column Content - Droppable Zone */}
      <div
        ref={setNodeRef}
        className={`bg-surface-soft/30 border border-t-0 border-subtle rounded-b-xl p-3 min-h-[500px] space-y-3 transition-all duration-200 ${
          showDropIndicator
            ? "bg-accent/10 border-accent/30 ring-2 ring-accent/20 ring-inset"
            : ""
        }`}
      >
        {cards.map((card) => (
          <DraggableBoardCard
            key={card.id}
            card={card}
            onClick={() => onCardClick?.(card)}
          />
        ))}

        {/* Drop indicator when empty and dragging over */}
        {cards.length === 0 && showDropIndicator && (
          <div className="h-24 rounded-lg border-2 border-dashed border-accent/40 bg-accent/5 flex items-center justify-center">
            <span className="text-xs text-accent/60">Drop here</span>
          </div>
        )}

        {/* Add Card Button */}
        {onAddCard && (
          <button
            onClick={() => onAddCard(column.tag)}
            className="w-full py-2 px-3 rounded-lg border border-dashed border-subtle text-muted-foreground hover:text-foreground hover:border-accent/50 hover:bg-accent/5 transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Plus size={14} />
            Add card
          </button>
        )}
      </div>
    </div>
  );
}

// Draggable wrapper for BoardCard
import { useDraggable } from "@dnd-kit/core";

interface DraggableBoardCardProps {
  card: CardDTO;
  onClick?: () => void;
}

function DraggableBoardCard({ card, onClick }: DraggableBoardCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`touch-none ${isDragging ? "opacity-50" : ""}`}
      style={{ cursor: isDragging ? "grabbing" : "grab" }}
    >
      <BoardCard
        card={card}
        onClick={onClick}
        isDragging={isDragging}
      />
    </div>
  );
}
