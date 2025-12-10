export const LAYOUTS = ["grid", "masonry", "list"] as const;
export type LayoutMode = (typeof LAYOUTS)[number];
export const DEFAULT_LAYOUT: LayoutMode = "grid";

export const DEFAULT_USERNAME = "Erik";
