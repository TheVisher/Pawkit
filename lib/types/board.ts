/**
 * Board Type Definitions
 *
 * Kanban board support for Pawkits. Boards are Collections (Pawkits)
 * with type: "board" in their metadata. Cards are assigned to columns
 * via status tags (e.g., "status:todo", "status:doing", "status:done").
 */

// Board column configuration
export interface BoardColumn {
  tag: string;      // e.g., "status:todo"
  label: string;    // e.g., "To Do"
  color?: string;   // optional, for column header accent
}

// Board-specific configuration stored in Collection.metadata
export interface BoardConfig {
  columns: BoardColumn[];
  showDoneAfterDays?: number;   // Auto-hide done items older than X days
  defaultTags?: string[];       // Auto-apply to new cards in this board
}

// Extended Pawkit (Collection) metadata
export interface PawkitMetadata {
  type?: "default" | "board";    // undefined = "default"
  boardConfig?: BoardConfig;
  // Additional metadata fields can be added here
}

// Default columns for new boards
export const DEFAULT_BOARD_COLUMNS: BoardColumn[] = [
  { tag: "status:todo", label: "To Do" },
  { tag: "status:doing", label: "In Progress" },
  { tag: "status:done", label: "Done" }
];

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

// Type guard: Check if a Pawkit/Collection is a board
export function isBoard(pawkit: { metadata?: PawkitMetadata | Record<string, unknown> }): boolean {
  const metadata = pawkit.metadata as PawkitMetadata | undefined;
  return metadata?.type === "board";
}

// Helper to get board config with defaults
export function getBoardConfig(pawkit: { metadata?: PawkitMetadata | Record<string, unknown> }): BoardConfig {
  const metadata = pawkit.metadata as PawkitMetadata | undefined;
  if (!isBoard(pawkit) || !metadata?.boardConfig) {
    return { columns: DEFAULT_BOARD_COLUMNS };
  }
  return metadata.boardConfig;
}
