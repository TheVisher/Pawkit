export const LAYOUTS = ["grid", "masonry", "list", "compact"] as const;
export type LayoutMode = (typeof LAYOUTS)[number];
export const DEFAULT_LAYOUT: LayoutMode = "grid";
