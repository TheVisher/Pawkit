"use client";

import { useMemo } from "react";
import { Plus } from "lucide-react";
import { CardDTO } from "@/lib/server/cards";
import { BoardColumn, BoardConfig, getStatusFromTags } from "@/lib/types/board";
import { BoardCard } from "./board-card";

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

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[500px]">
      {/* Render each column */}
      {boardConfig.columns.map((column) => (
        <BoardColumnComponent
          key={column.tag}
          column={column}
          cards={cardsByColumn[column.tag] || []}
          onCardClick={onCardClick}
          onAddCard={onAddCard}
        />
      ))}

      {/* Uncategorized column if there are cards without status */}
      {cardsByColumn["uncategorized"]?.length > 0 && (
        <BoardColumnComponent
          column={{ tag: "uncategorized", label: "No Status", color: "gray" }}
          cards={cardsByColumn["uncategorized"]}
          onCardClick={onCardClick}
          onAddCard={onAddCard}
        />
      )}
    </div>
  );
}

interface BoardColumnComponentProps {
  column: BoardColumn;
  cards: CardDTO[];
  onCardClick?: (card: CardDTO) => void;
  onAddCard?: (columnTag: string) => void;
}

function BoardColumnComponent({
  column,
  cards,
  onCardClick,
  onAddCard
}: BoardColumnComponentProps) {
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

  return (
    <div className="flex-shrink-0 w-72">
      {/* Column Header */}
      <div className={`rounded-t-lg px-3 py-2 border ${getColumnColor(column.color)}`}>
        <div className="flex items-center justify-between">
          <h3 className={`font-medium text-sm ${getHeaderColor(column.color)}`}>
            {column.label}
          </h3>
          <span className="text-xs text-muted-foreground bg-surface-soft px-2 py-0.5 rounded-full">
            {cards.length}
          </span>
        </div>
      </div>

      {/* Column Content */}
      <div className="bg-surface-soft/50 border border-t-0 border-subtle rounded-b-lg p-2 min-h-[400px] space-y-2">
        {cards.map((card) => (
          <BoardCard
            key={card.id}
            card={card}
            onClick={() => onCardClick?.(card)}
          />
        ))}

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
