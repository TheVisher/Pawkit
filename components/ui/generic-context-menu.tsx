"use client";

import { ReactNode } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
  ContextMenuShortcut,
} from "@/components/ui/context-menu";
import { LucideIcon } from "lucide-react";

export type ContextMenuItemConfig = {
  type?: "item" | "separator" | "submenu";
  label?: string;
  icon?: LucideIcon;
  onClick?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  shortcut?: string;
  // For submenu type
  items?: ContextMenuItemConfig[];
};

export type GenericContextMenuProps = {
  children: ReactNode;
  items: ContextMenuItemConfig[];
  className?: string;
};

/**
 * Generic context menu wrapper that makes it easy to add context menus to any component
 *
 * @example
 * ```tsx
 * <GenericContextMenu
 *   items={[
 *     { label: "Edit", icon: Edit, onClick: () => handleEdit() },
 *     { type: "separator" },
 *     { label: "Delete", icon: Trash2, onClick: () => handleDelete(), destructive: true },
 *   ]}
 * >
 *   <div>Right click me</div>
 * </GenericContextMenu>
 * ```
 */
export function GenericContextMenu({
  children,
  items,
  className,
}: GenericContextMenuProps) {
  const renderItems = (items: ContextMenuItemConfig[]) => {
    return items.map((item, index) => {
      // Separator
      if (item.type === "separator") {
        return <ContextMenuSeparator key={`separator-${index}`} />;
      }

      // Submenu
      if (item.type === "submenu" && item.items) {
        const Icon = item.icon;
        return (
          <ContextMenuSub key={`submenu-${index}`}>
            <ContextMenuSubTrigger>
              {Icon && <Icon className="mr-2 h-4 w-4" />}
              {item.label}
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="max-h-[300px] overflow-y-auto">
              {renderItems(item.items)}
            </ContextMenuSubContent>
          </ContextMenuSub>
        );
      }

      // Regular item
      const Icon = item.icon;
      return (
        <ContextMenuItem
          key={`item-${index}`}
          onClick={item.onClick}
          disabled={item.disabled}
          className={item.destructive ? "text-rose-400" : ""}
        >
          {Icon && <Icon className="mr-2 h-4 w-4" />}
          {item.label}
          {item.shortcut && (
            <ContextMenuShortcut>{item.shortcut}</ContextMenuShortcut>
          )}
        </ContextMenuItem>
      );
    });
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className={className ?? "w-56"}>
        {renderItems(items)}
      </ContextMenuContent>
    </ContextMenu>
  );
}
