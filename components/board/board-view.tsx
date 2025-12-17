"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { Plus, ChevronDown, ChevronRight, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { CardDTO } from "@/lib/server/cards";
import { BoardColumn, BoardConfig, getStatusFromTags, updateStatusTag } from "@/lib/types/board";
import { BoardCard } from "./board-card";
import { AddColumnButton } from "./add-column-button";
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
  onColumnsChange?: (columns: BoardColumn[]) => void;
}

export function BoardView({
  cards,
  boardConfig,
  collectionSlug,
  onCardClick,
  onAddCard,
  onColumnsChange
}: BoardViewProps) {
  const { updateCard } = useDataStore();
  const toast = useToastStore();
  const [activeCard, setActiveCard] = useState<CardDTO | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // Track collapsed columns (typically Done column)
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(() => {
    // Load from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`board-${collectionSlug}-collapsed`);
      if (saved) {
        try {
          return new Set(JSON.parse(saved));
        } catch {
          return new Set();
        }
      }
    }
    return new Set();
  });

  // Save collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem(
      `board-${collectionSlug}-collapsed`,
      JSON.stringify([...collapsedColumns])
    );
  }, [collapsedColumns, collectionSlug]);

  // Toggle column collapse
  const toggleColumnCollapse = useCallback((columnTag: string) => {
    setCollapsedColumns(prev => {
      const next = new Set(prev);
      if (next.has(columnTag)) {
        next.delete(columnTag);
      } else {
        next.add(columnTag);
      }
      return next;
    });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // 'n' key to add card to first column (To Do)
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        const firstColumn = boardConfig.columns[0];
        if (firstColumn && onAddCard) {
          onAddCard(firstColumn.tag);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [boardConfig.columns, onAddCard]);

  // Handle adding a new column
  const handleAddColumn = useCallback((newColumn: BoardColumn) => {
    if (onColumnsChange) {
      onColumnsChange([...boardConfig.columns, newColumn]);
      toast.success(`Added "${newColumn.label}" column`);
    }
  }, [boardConfig.columns, onColumnsChange, toast]);

  // Handle deleting a column
  const handleDeleteColumn = useCallback((columnTag: string, cardCount: number) => {
    if (!onColumnsChange) return;

    if (cardCount > 0) {
      const confirmed = window.confirm(
        `This column has ${cardCount} card(s). Deleting it will move them to "No Status". Continue?`
      );
      if (!confirmed) return;
    }

    const newColumns = boardConfig.columns.filter(col => col.tag !== columnTag);
    onColumnsChange(newColumns);
    toast.success("Column deleted");
  }, [boardConfig.columns, onColumnsChange, toast]);

  // Handle renaming a column
  const handleRenameColumn = useCallback((columnTag: string, currentLabel: string) => {
    if (!onColumnsChange) return;

    const newLabel = window.prompt("Rename column:", currentLabel);
    if (!newLabel || newLabel.trim() === "" || newLabel === currentLabel) return;

    const newColumns = boardConfig.columns.map(col =>
      col.tag === columnTag ? { ...col, label: newLabel.trim() } : col
    );
    onColumnsChange(newColumns);
    toast.success("Column renamed");
  }, [boardConfig.columns, onColumnsChange, toast]);

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

  // Total columns includes "No Status" which is always shown first
  const totalColumns = boardConfig.columns.length + 1;

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
      {/* Scrollable container for mobile, centered on desktop */}
      <div className="flex justify-center gap-3 md:gap-4 pb-4 min-h-[500px] md:min-h-[600px] overflow-x-auto snap-x snap-mandatory md:snap-none -mx-4 px-4 md:mx-0 md:px-0">
        {/* No Status column first - for cards without status tags */}
        <DroppableColumn
          column={{ tag: "uncategorized", label: "No Status", color: "gray" }}
          cards={cardsByColumn["uncategorized"] || []}
          onCardClick={onCardClick}
          onAddCard={onAddCard}
          totalColumns={totalColumns}
          isOver={overId === "uncategorized"}
          isCollapsed={collapsedColumns.has("uncategorized")}
          onToggleCollapse={() => toggleColumnCollapse("uncategorized")}
        />

        {/* Render configured columns */}
        {boardConfig.columns.map((column) => (
          <DroppableColumn
            key={column.tag}
            column={column}
            cards={cardsByColumn[column.tag] || []}
            onCardClick={onCardClick}
            onAddCard={onAddCard}
            totalColumns={totalColumns}
            isOver={overId === column.tag}
            isCollapsed={collapsedColumns.has(column.tag)}
            onToggleCollapse={() => toggleColumnCollapse(column.tag)}
            onDeleteColumn={onColumnsChange ? handleDeleteColumn : undefined}
            onRenameColumn={onColumnsChange ? handleRenameColumn : undefined}
          />
        ))}

        {/* Add Column Button */}
        {onColumnsChange && (
          <AddColumnButton onAddColumn={handleAddColumn} />
        )}
      </div>

      {/* Drag Overlay - Shows the card being dragged */}
      <DragOverlay>
        {activeCard ? (
          <div className="opacity-90 rotate-3 scale-105">
            <BoardCard card={activeCard} isDragging isDragOverlay />
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
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onDeleteColumn?: (columnTag: string, cardCount: number) => void;
  onRenameColumn?: (columnTag: string, currentLabel: string) => void;
}

function DroppableColumn({
  column,
  cards,
  onCardClick,
  onAddCard,
  totalColumns,
  isOver,
  isCollapsed,
  onToggleCollapse,
  onDeleteColumn,
  onRenameColumn
}: DroppableColumnProps) {
  const [showMenu, setShowMenu] = useState(false);
  const { setNodeRef, isOver: isOverDroppable } = useDroppable({
    id: column.tag,
  });

  // Check if this is a "done" type column
  const isDoneColumn = column.tag.includes('done') || column.tag.includes('complete');

  // Get column header background (grey shades)
  const getColumnColor = (color?: string) => {
    switch (color) {
      case "none": return "bg-transparent border-subtle";
      case "light": return "bg-white/[0.03] border-white/10";
      case "medium": return "bg-white/[0.06] border-white/10";
      case "dark": return "bg-white/[0.09] border-white/10";
      case "darker": return "bg-white/[0.12] border-white/10";
      // Legacy color support (maps to grey shades)
      case "gray": return "bg-transparent border-subtle";
      case "purple": return "bg-white/[0.03] border-white/10";
      case "amber": return "bg-white/[0.06] border-white/10";
      case "green": return "bg-white/[0.09] border-white/10";
      default: return "bg-white/[0.03] border-white/10";
    }
  };

  // Get column content background (grey shades - slightly lighter than header)
  const getContentBg = (color?: string) => {
    switch (color) {
      case "none": return "bg-transparent";
      case "light": return "bg-white/[0.02]";
      case "medium": return "bg-white/[0.04]";
      case "dark": return "bg-white/[0.06]";
      case "darker": return "bg-white/[0.08]";
      // Legacy color support
      case "gray": return "bg-transparent";
      case "purple": return "bg-white/[0.02]";
      case "amber": return "bg-white/[0.04]";
      case "green": return "bg-white/[0.06]";
      default: return "bg-white/[0.02]";
    }
  };

  const showDropIndicator = isOver || isOverDroppable;

  // When collapsed, show minimal version
  if (isCollapsed) {
    return (
      <div
        ref={setNodeRef}
        className="flex-shrink-0 w-12 md:w-14 snap-start"
      >
        {/* Collapsed Column */}
        <div
          className={`h-full rounded-xl border ${getColumnColor(column.color)} cursor-pointer hover:opacity-80 transition-opacity ${
            showDropIndicator ? "ring-2 ring-accent/40" : ""
          }`}
          onClick={onToggleCollapse}
        >
          <div className="p-2 h-full flex flex-col items-center">
            <ChevronRight size={14} className="text-muted-foreground mb-2" />
            <span className="text-xs font-semibold text-foreground [writing-mode:vertical-rl] rotate-180">
              {column.label}
            </span>
            <span className="mt-auto text-xs text-muted-foreground bg-surface/80 px-1.5 py-0.5 rounded-full font-medium">
              {cards.length}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 w-[280px] md:w-[320px] lg:flex-1 lg:min-w-[280px] lg:max-w-[400px] snap-start">
      {/* Column Header */}
      <div className={`rounded-t-xl px-3 md:px-4 py-2.5 md:py-3 border ${getColumnColor(column.color)}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Collapse button for Done column */}
            {isDoneColumn && (
              <button
                onClick={onToggleCollapse}
                className="p-0.5 rounded hover:bg-white/10 transition-colors flex-shrink-0"
                title="Collapse column"
              >
                <ChevronDown size={14} className="text-muted-foreground" />
              </button>
            )}
            <h3 className="font-semibold text-sm truncate text-foreground">
              {column.label}
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground bg-surface/80 px-2 md:px-2.5 py-0.5 md:py-1 rounded-full font-medium flex-shrink-0">
              {cards.length}
            </span>
            {/* Column menu - only show for non-uncategorized columns when handlers are available */}
            {column.tag !== "uncategorized" && (onDeleteColumn || onRenameColumn) && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1 rounded hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
                  title="Column options"
                >
                  <MoreHorizontal size={14} />
                </button>
                {showMenu && (
                  <>
                    {/* Backdrop to close menu */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowMenu(false)}
                    />
                    {/* Dropdown menu */}
                    <div className="absolute right-0 top-full mt-1 z-20 bg-surface border border-subtle rounded-lg shadow-lg py-1 min-w-[140px]">
                      {onRenameColumn && (
                        <button
                          onClick={() => {
                            setShowMenu(false);
                            onRenameColumn(column.tag, column.label);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-surface-soft flex items-center gap-2 transition-colors"
                        >
                          <Pencil size={14} />
                          Rename
                        </button>
                      )}
                      {onDeleteColumn && (
                        <button
                          onClick={() => {
                            setShowMenu(false);
                            onDeleteColumn(column.tag, cards.length);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Column Content - Droppable Zone */}
      <div
        ref={setNodeRef}
        className={`${getContentBg(column.color)} border border-t-0 border-subtle rounded-b-xl p-2 md:p-3 min-h-[400px] md:min-h-[500px] space-y-2 md:space-y-3 transition-all duration-200 ${
          showDropIndicator
            ? "!bg-accent/10 border-accent/30 ring-2 ring-accent/20 ring-inset"
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
          <div className="h-20 md:h-24 rounded-lg border-2 border-dashed border-accent/40 bg-accent/5 flex items-center justify-center">
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
            <span className="hidden sm:inline">Add card</span>
            <span className="sm:hidden">Add</span>
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
