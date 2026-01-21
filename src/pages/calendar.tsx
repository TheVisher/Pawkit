'use client';

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
  const { viewMode } = useCalendarStore();

  // Cards are loaded reactively via useLiveQuery in calendar views

  return (
    <ContentAreaContextMenu>
      <div className="h-full flex flex-col overflow-hidden">
        <CalendarHeader />

        <div className="flex-1 overflow-hidden p-4 md:p-6">
          {viewMode === 'month' && <MonthView />}
          {viewMode === 'week' && <WeekView />}
          {viewMode === 'day' && <DayView />}
          {viewMode === 'agenda' && <AgendaView />}
        </div>
      </div>
    </ContentAreaContextMenu>
  );
}
