'use client';

import { useEffect } from 'react';
import { useCurrentWorkspace } from '@/lib/stores/workspace-store';
import { useDataStore } from '@/lib/stores/data-store';
import {
  CalendarHeader,
  MonthView,
  WeekView,
  DayView,
  AgendaView,
} from '@/components/calendar';
import { useCalendarStore } from '@/lib/stores/calendar-store';
import { ContentAreaContextMenu } from '@/components/context-menus';

export default function CalendarPage() {
  const workspace = useCurrentWorkspace();
  const loadCards = useDataStore((state) => state.loadCards);
  const { viewMode } = useCalendarStore();

  // Load cards on mount (events not yet implemented)
  useEffect(() => {
    if (workspace) {
      loadCards(workspace.id);
    }
  }, [workspace, loadCards]);

  return (
    <ContentAreaContextMenu>
      <div className="h-full flex flex-col overflow-hidden">
        <CalendarHeader />

        <div className="flex-1 overflow-hidden p-6">
          {viewMode === 'month' && <MonthView />}
          {viewMode === 'week' && <WeekView />}
          {viewMode === 'day' && <DayView />}
          {viewMode === 'agenda' && <AgendaView />}
        </div>
      </div>
    </ContentAreaContextMenu>
  );
}
