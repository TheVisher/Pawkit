// Kanban board type definitions

export type KanbanColumnId = string;

export type KanbanColumn = {
  id: KanbanColumnId;
  title: string;
  color?: string; // Optional accent color for the column
  cardIds: string[]; // Card IDs in this column
};

export type KanbanBoard = {
  id: string;
  name: string;
  columns: KanbanColumn[];
  // Column that new cards are added to by default
  defaultColumnId?: KanbanColumnId;
};

// Default columns for a new kanban board
export const DEFAULT_KANBAN_COLUMNS: KanbanColumn[] = [
  { id: "backlog", title: "Backlog", color: "#6b7280", cardIds: [] },
  { id: "todo", title: "To Do", color: "#3b82f6", cardIds: [] },
  { id: "in-progress", title: "In Progress", color: "#f59e0b", cardIds: [] },
  { id: "done", title: "Done", color: "#10b981", cardIds: [] },
];

// Priority levels for context menu
export type CardPriority = "high" | "medium" | "low" | "none";

export const PRIORITY_COLORS: Record<CardPriority, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#3b82f6",
  none: "transparent",
};
