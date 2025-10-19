"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { useDataStore } from "@/lib/stores/data-store";
import { CardModel } from "@/lib/types";
import { CardDetailModal } from "@/components/modals/card-detail-modal";
import { CalendarIcon, FileText } from "lucide-react";
import { isDailyNote, extractDateFromTitle } from "@/lib/utils/daily-notes";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = {
  "en-US": require("date-fns/locale/en-US"),
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: CardModel;
  isDailyNote?: boolean;
};

export default function CalendarPage() {
  const { cards, collections } = useDataStore();
  const [view, setView] = useState<View>("month");
  const [date, setDate] = useState(new Date());
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  // Convert cards to calendar events (scheduled cards + daily notes, excluding Den cards)
  const events: CalendarEvent[] = useMemo(() => {
    const scheduledEvents = cards
      .filter((card) => card.scheduledDate && !card.inDen) // Scheduled cards
      .map((card) => {
        // Parse the ISO string and create a date at local midnight
        const dateStr = card.scheduledDate!.split('T')[0]; // Get YYYY-MM-DD
        const [year, month, day] = dateStr.split('-').map(Number);
        const cardDate = new Date(year, month - 1, day); // Create local date
        return {
          id: card.id,
          title: card.title || card.domain || card.url,
          start: cardDate,
          end: cardDate,
          resource: card,
          isDailyNote: false,
        };
      });

    const dailyNoteEvents = cards
      .filter((card) => isDailyNote(card) && !card.inDen) // Daily notes
      .map((card) => {
        const date = extractDateFromTitle(card.title!);
        if (!date) return null;
        
        return {
          id: card.id,
          title: card.title!,
          start: date,
          end: date,
          resource: card,
          isDailyNote: true,
        };
      })
      .filter(Boolean) as CalendarEvent[];

    return [...scheduledEvents, ...dailyNoteEvents];
  }, [cards]);

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setActiveCardId(event.id);
  }, []);

  const handleNavigate = useCallback((newDate: Date) => {
    setDate(newDate);
  }, []);

  const handleViewChange = useCallback((newView: View) => {
    setView(newView);
  }, []);

  const activeCard = useMemo(() => {
    return cards.find((card) => card.id === activeCardId) ?? null;
  }, [cards, activeCardId]);

  // Custom event component for calendar
  const EventComponent = ({ event }: { event: CalendarEvent }) => {
    const card = event.resource;
    const isDailyNote = event.isDailyNote;
    
    return (
      <div className={`flex items-center gap-1 overflow-hidden text-xs ${isDailyNote ? 'bg-purple-100 text-purple-800 border border-purple-200' : ''}`}>
        {isDailyNote ? (
          <FileText size={12} className="text-purple-600 flex-shrink-0" />
        ) : card.image ? (
          <div className="h-4 w-4 flex-shrink-0 overflow-hidden rounded">
            <img
              src={card.image}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        ) : null}
        <span className="truncate">{event.title}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
            <CalendarIcon className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Calendar</h1>
            <p className="text-sm text-muted-foreground">
              View your scheduled cards and daily notes by date
            </p>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="calendar-container rounded-2xl border border-subtle bg-surface p-6">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          view={view}
          date={date}
          onNavigate={handleNavigate}
          onView={handleViewChange}
          onSelectEvent={handleSelectEvent}
          components={{
            event: EventComponent,
          }}
          style={{ height: 700 }}
          className="pawkit-calendar"
        />
      </div>

      {/* Card Detail Modal */}
      {activeCard && (
        <CardDetailModal
          card={activeCard}
          collections={collections || []}
          onClose={() => setActiveCardId(null)}
          onUpdate={() => {}}
          onDelete={() => setActiveCardId(null)}
        />
      )}
    </div>
  );
}
