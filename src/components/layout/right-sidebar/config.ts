/**
 * Right Sidebar Configuration
 * Constants, types, and view configurations
 */

import {
  Bookmark,
  FileText,
  Video,
  Image,
  FileSpreadsheet,
  Music,
  HelpCircle,
  Layers,
  CalendarDays,
  Globe,
  Type,
  Tag,
  Inbox,
  FolderMinus,
  TagsIcon,
  Circle,
  Clock,
  CheckCircle2,
  Link2,
  AlertTriangle,
  ArrowRightLeft,
  LayoutGrid,
} from "lucide-react";
import type { PawkitOverviewSortBy } from "@/lib/stores/view-store";

// Types
export type CardSize = "small" | "medium" | "large" | "xl";
export type ContentType =
  | "bookmarks"
  | "notes"
  | "video"
  | "images"
  | "docs"
  | "audio"
  | "other";
export type GroupBy = "none" | "date" | "tags" | "type" | "domain";
export type DateGrouping = "smart" | "day" | "week" | "month" | "year";
export type UnsortedFilter = "none" | "no-pawkits" | "no-tags" | "both";
export type ReadingFilter = "all" | "unread" | "in-progress" | "read";
export type LinkStatusFilter =
  | "all"
  | "ok"
  | "broken"
  | "redirect"
  | "unchecked";
export type ViewType = "cards" | "pawkit" | "pawkits-overview" | "home" | "calendar" | "tags" | "other";

export interface ViewConfig {
  type: ViewType;
  title: string;
  showContentFilters: boolean;
  showCardDisplay: boolean;
  showSubPawkitSettings: boolean;
  showPawkitOverviewSettings: boolean;
  showTags: boolean;
}

// Content type filter definitions with icons (multi-selectable)
export const CONTENT_FILTERS: {
  id: ContentType;
  label: string;
  icon: typeof Bookmark;
}[] = [
  { id: "bookmarks", label: "Bookmarks", icon: Bookmark },
  { id: "notes", label: "Notes", icon: FileText },
  { id: "video", label: "Video", icon: Video },
  { id: "images", label: "Images", icon: Image },
  { id: "docs", label: "Docs", icon: FileSpreadsheet },
  { id: "audio", label: "Audio", icon: Music },
  { id: "other", label: "Other", icon: HelpCircle },
];

// Sort options matching V1
export const SORT_OPTIONS: { id: string; label: string }[] = [
  { id: "updatedAt", label: "Recently Modified" },
  { id: "createdAt", label: "Date Added" },
  { id: "title", label: "Title A-Z" },
  { id: "domain", label: "Domain" },
];

// Grouping options
export const GROUP_OPTIONS: {
  id: GroupBy;
  label: string;
  icon: typeof Layers;
}[] = [
  { id: "none", label: "None", icon: Layers },
  { id: "date", label: "Date", icon: CalendarDays },
  { id: "tags", label: "Tags", icon: Tag },
  { id: "type", label: "Type", icon: Type },
  { id: "domain", label: "Domain", icon: Globe },
];

// Date grouping options (when groupBy === 'date')
export const DATE_GROUP_OPTIONS: { id: DateGrouping; label: string }[] = [
  { id: "smart", label: "Smart" },
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
];

// Quick filter options for unsorted/unorganized items
export const UNSORTED_OPTIONS: {
  id: UnsortedFilter;
  label: string;
  icon: typeof Inbox;
}[] = [
  { id: "none", label: "All", icon: LayoutGrid },
  { id: "no-pawkits", label: "No Pawkits", icon: FolderMinus },
  { id: "no-tags", label: "No Tags", icon: TagsIcon },
  { id: "both", label: "Unsorted", icon: Inbox },
];

// Reading status filter options
export const READING_FILTER_OPTIONS: {
  id: ReadingFilter;
  label: string;
  icon: typeof Circle;
}[] = [
  { id: "all", label: "All", icon: LayoutGrid },
  { id: "unread", label: "Unread", icon: Circle },
  { id: "in-progress", label: "In Progress", icon: Clock },
  { id: "read", label: "Read", icon: CheckCircle2 },
];

// Link status filter options
export const LINK_STATUS_FILTER_OPTIONS: {
  id: LinkStatusFilter;
  label: string;
  icon: typeof Circle;
}[] = [
  { id: "all", label: "All", icon: LayoutGrid },
  { id: "ok", label: "Valid", icon: Link2 },
  { id: "broken", label: "Broken", icon: AlertTriangle },
  { id: "redirect", label: "Redirect", icon: ArrowRightLeft },
];

// Pawkit overview sort options
export const PAWKIT_SORT_OPTIONS: { id: PawkitOverviewSortBy; label: string }[] = [
  { id: "manual", label: "Manual" },
  { id: "alphabetical", label: "A-Z" },
  { id: "dateCreated", label: "Created" },
  { id: "dateModified", label: "Modified" },
  { id: "itemCount", label: "Items" },
];

// View configurations per view type
const VIEW_CONFIGS: Record<ViewType, Omit<ViewConfig, "title">> = {
  cards: {
    type: "cards",
    showContentFilters: true,
    showCardDisplay: true,
    showSubPawkitSettings: false,
    showPawkitOverviewSettings: false,
    showTags: true,
  },
  pawkit: {
    type: "pawkit",
    showContentFilters: true,
    showCardDisplay: true,
    showSubPawkitSettings: true,
    showPawkitOverviewSettings: false,
    showTags: true,
  },
  "pawkits-overview": {
    type: "pawkits-overview",
    showContentFilters: false,
    showCardDisplay: false,
    showSubPawkitSettings: false,
    showPawkitOverviewSettings: true,
    showTags: false,
  },
  home: {
    type: "home",
    showContentFilters: false,
    showCardDisplay: false,
    showSubPawkitSettings: false,
    showPawkitOverviewSettings: false,
    showTags: false,
  },
  calendar: {
    type: "calendar",
    showContentFilters: false,
    showCardDisplay: false,
    showSubPawkitSettings: false,
    showPawkitOverviewSettings: false,
    showTags: false,
  },
  tags: {
    type: "tags",
    showContentFilters: false,
    showCardDisplay: false,
    showSubPawkitSettings: false,
    showPawkitOverviewSettings: false,
    showTags: false,
  },
  other: {
    type: "other",
    showContentFilters: false,
    showCardDisplay: false,
    showSubPawkitSettings: false,
    showPawkitOverviewSettings: false,
    showTags: false,
  },
};

export function getViewConfig(pathname: string): ViewConfig {
  // Pawkit detail pages show sub-pawkit settings
  if (pathname.startsWith("/pawkits/") && pathname !== "/pawkits") {
    return { ...VIEW_CONFIGS.pawkit, title: "Pawkit" };
  }
  // Pawkits overview page
  if (pathname === "/pawkits") {
    return { ...VIEW_CONFIGS["pawkits-overview"], title: "Pawkits" };
  }
  // Library shows card controls
  if (pathname === "/library") {
    return { ...VIEW_CONFIGS.cards, title: "Filters" };
  }
  // Home page
  if (pathname === "/home" || pathname === "/dashboard") {
    return { ...VIEW_CONFIGS.home, title: "Overview" };
  }
  // Calendar
  if (pathname === "/calendar") {
    return { ...VIEW_CONFIGS.calendar, title: "Calendar" };
  }
  // Tags
  if (pathname === "/tags") {
    return { ...VIEW_CONFIGS.tags, title: "Tag Health" };
  }
  // Default
  return { ...VIEW_CONFIGS.other, title: "Options" };
}
