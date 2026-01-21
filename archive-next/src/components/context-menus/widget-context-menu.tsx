'use client';

import { type ReactNode } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuLabel,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { EyeOff, GripVertical } from 'lucide-react';
import {
  useWidgetLayoutStore,
  WIDGET_METADATA,
  type WidgetType,
} from '@/lib/stores/widget-layout-store';

interface WidgetContextMenuProps {
  widgetId: string;
  widgetType: WidgetType;
  children: ReactNode;
}

export function WidgetContextMenu({
  widgetId,
  widgetType,
  children,
}: WidgetContextMenuProps) {
  const setWidgetEnabled = useWidgetLayoutStore((s) => s.setWidgetEnabled);

  const widgetName = WIDGET_METADATA[widgetType].name;

  const handleHide = () => {
    setWidgetEnabled(widgetId, false);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuLabel>{widgetName}</ContextMenuLabel>
        <ContextMenuSeparator />

        {/* Drag hint */}
        <ContextMenuItem disabled className="opacity-60">
          <GripVertical className="mr-2 h-4 w-4" />
          <span>Drag to reposition</span>
        </ContextMenuItem>

        <ContextMenuSeparator />

        {/* Hide widget */}
        <ContextMenuItem onClick={handleHide}>
          <EyeOff className="mr-2 h-4 w-4" />
          <span>Hide Widget</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
