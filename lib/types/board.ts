/**
 * Kanban View Type Definitions
 *
 * Kanban is a view mode for Pawkits (like Grid, List, Masonry).
 * Cards are assigned to columns via status tags (e.g., "status:todo").
 * Column configuration is stored in Pawkit metadata.kanbanColumns.
 */

// Column color options for tinted backgrounds
export type KanbanColumnColor = "gray" | "purple" | "amber" | "green" | "red" | "blue";

// Kanban column configuration
export interface KanbanColumn {
  id: string;                    // Unique column ID
  tag: string | null;            // Status tag (e.g., "status:todo") or null for "Unsorted"
  label: string;                 // Display label (e.g., "To Do")
  color?: KanbanColumnColor;     // Column accent/tint color
}

// Extended Pawkit (Collection) metadata
export interface PawkitMetadata {
  // Legacy field - will be removed after migration
  type?: "default" | "board";
  boardConfig?: {
    columns: { tag: string; label: string; color?: string }[];
  };

  // New kanban columns config
  kanbanColumns?: KanbanColumn[];
}

// Default columns for Kanban view
export const DEFAULT_KANBAN_COLUMNS: KanbanColumn[] = [
  { id: "unsorted", tag: null, label: "Unsorted", color: "gray" },
  { id: "todo", tag: "status:todo", label: "To Do", color: "purple" },
  { id: "doing", tag: "status:doing", label: "In Progress", color: "amber" },
  { id: "done", tag: "status:done", label: "Done", color: "green" },
];

// Column background tints (5-8% opacity)
export const COLUMN_TINTS: Record<KanbanColumnColor, string> = {
  gray: "bg-gray-500/5",
  purple: "bg-purple-500/6",
  amber: "bg-amber-500/6",
  green: "bg-green-500/6",
  red: "bg-red-500/6",
  blue: "bg-blue-500/6",
};

// Column header accent colors
export const COLUMN_HEADER_COLORS: Record<KanbanColumnColor, string> = {
  gray: "text-gray-400",
  purple: "text-purple-400",
  amber: "text-amber-400",
  green: "text-green-400",
  red: "text-red-400",
  blue: "text-blue-400",
};

// Status tag constants
export const STATUS_TAGS = {
  IDEA: "status:idea",
  TODO: "status:todo",
  DOING: "status:doing",
  BLOCKED: "status:blocked",
  DONE: "status:done"
} as const;

// Priority tag constants
export const PRIORITY_TAGS = {
  HIGH: "priority:high",
  MEDIUM: "priority:medium",
  LOW: "priority:low"
} as const;

// Type tag constants (for card type icons)
export const CARD_TYPE_TAGS = {
  FEATURE: "type:feature",
  BUG: "type:bug",
  CHORE: "type:chore",
  IDEA: "type:idea",
  QUESTION: "type:question"
} as const;

// Helper to get priority indicator
export function getPriorityIndicator(tags: string[]): { color: string; label: string } | null {
  if (tags.includes(PRIORITY_TAGS.HIGH)) return { color: "red", label: "High" };
  if (tags.includes(PRIORITY_TAGS.MEDIUM)) return { color: "yellow", label: "Medium" };
  if (tags.includes(PRIORITY_TAGS.LOW)) return { color: "green", label: "Low" };
  return null;
}

// Helper to get card type icon
export function getCardTypeIcon(tags: string[]): string | null {
  if (tags.includes(CARD_TYPE_TAGS.FEATURE)) return "sparkles";
  if (tags.includes(CARD_TYPE_TAGS.BUG)) return "bug";
  if (tags.includes(CARD_TYPE_TAGS.CHORE)) return "wrench";
  if (tags.includes(CARD_TYPE_TAGS.IDEA)) return "lightbulb";
  if (tags.includes(CARD_TYPE_TAGS.QUESTION)) return "help-circle";
  return null;
}

// Helper to get status from tags
export function getStatusFromTags(tags: string[]): string | null {
  const statusTag = tags.find(t => t.startsWith("status:"));
  return statusTag || null;
}

// Helper to update status tag (removes old, adds new)
export function updateStatusTag(tags: string[], newStatus: string): string[] {
  const filtered = tags.filter(t => !t.startsWith("status:"));
  return [...filtered, newStatus];
}

// Helper to remove all status tags (for moving to Unsorted)
export function removeStatusTags(tags: string[]): string[] {
  return tags.filter(t => !t.startsWith("status:"));
}

// Helper to get kanban columns from Pawkit metadata (with migration support)
export function getKanbanColumns(metadata?: PawkitMetadata | Record<string, unknown>): KanbanColumn[] {
  const meta = metadata as PawkitMetadata | undefined;

  // New format: kanbanColumns
  if (meta?.kanbanColumns && meta.kanbanColumns.length > 0) {
    return meta.kanbanColumns;
  }

  // Legacy format: boardConfig.columns (migrate on the fly)
  if (meta?.type === "board" && meta.boardConfig?.columns) {
    const legacyColumns = meta.boardConfig.columns;
    // Convert legacy columns and prepend Unsorted
    const converted: KanbanColumn[] = legacyColumns.map((col, index) => ({
      id: col.tag.replace("status:", "") || `column-${index}`,
      tag: col.tag,
      label: col.label,
      color: (col.color as KanbanColumnColor) || undefined,
    }));

    // Add Unsorted at the beginning if not present
    const hasUnsorted = converted.some(c => c.tag === null || c.id === "unsorted");
    if (!hasUnsorted) {
      converted.unshift({ id: "unsorted", tag: null, label: "Unsorted", color: "gray" });
    }

    return converted;
  }

  // Default columns
  return DEFAULT_KANBAN_COLUMNS;
}

// Legacy helper - kept for backwards compatibility during migration
// TODO: Remove after migration is complete
export function isBoard(pawkit: { metadata?: PawkitMetadata | Record<string, unknown> }): boolean {
  const metadata = pawkit.metadata as PawkitMetadata | undefined;
  return metadata?.type === "board";
}

// Legacy helper - kept for backwards compatibility during migration
// TODO: Remove after migration is complete
export interface BoardColumn {
  tag: string;
  label: string;
  color?: string;
}

export interface BoardConfig {
  columns: BoardColumn[];
  showDoneAfterDays?: number;
  defaultTags?: string[];
}

// Grey shade colors: none, light, medium, dark, darker
export const DEFAULT_BOARD_COLUMNS: BoardColumn[] = [
  { tag: "status:todo", label: "To Do", color: "light" },
  { tag: "status:doing", label: "In Progress", color: "medium" },
  { tag: "status:done", label: "Done", color: "dark" }
];

export function getBoardConfig(pawkit: { metadata?: PawkitMetadata | Record<string, unknown> }): BoardConfig {
  const metadata = pawkit.metadata as PawkitMetadata | undefined;
  if (!isBoard(pawkit) || !metadata?.boardConfig) {
    return { columns: DEFAULT_BOARD_COLUMNS };
  }
  return metadata.boardConfig;
}
