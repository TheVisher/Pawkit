"use client";

import { useMemo, useEffect } from "react";
import { PanelSection, PanelButton, PanelToggle } from "./control-panel";
import { Calendar, Filter, Plus, Film, Music, Clock, Rocket, CalendarDays, StickyNote, CalendarCheck, CalendarRange, ChevronRight, Bookmark } from "lucide-react";
import { format, setMonth, isAfter, startOfToday, startOfWeek, endOfWeek } from "date-fns";
import { useCalendarStore } from "@/lib/hooks/use-calendar-store";
import { useDataStore } from "@/lib/stores/data-store";
import { useEventStore } from "@/lib/hooks/use-event-store";
import { usePanelStore } from "@/lib/hooks/use-panel-store";
import { TodosSection } from "./todos-section";
import { CalendarEvent, EVENT_COLORS } from "@/lib/types/calendar";

// Type for unified upcoming item (either card or event)
type UpcomingItem = {
  type: 'card' | 'event';
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string | null; // HH:mm for events
  color?: string | null; // For events
  isAllDay?: boolean;
};

// Month names for the 3x4 grid
const MONTHS = [
  { name: "Jan", value: 0 },
  { name: "Feb", value: 1 },
  { name: "Mar", value: 2 },
  { name: "Apr", value: 3 },
  { name: "May", value: 4 },
  { name: "Jun", value: 5 },
  { name: "Jul", value: 6 },
  { name: "Aug", value: 7 },
  { name: "Sep", value: 8 },
  { name: "Oct", value: 9 },
  { name: "Nov", value: 10 },
  { name: "Dec", value: 11 },
];

// Content type filter options (for future AI detection)
export type CalendarContentFilter =
  | "movies-shows"
  | "concerts-events"
  | "deadlines"
  | "product-launches"
  | "other-events"
  | "daily-notes";

export function CalendarControls() {
  // Get state from calendar store
  const currentMonth = useCalendarStore((state) => state.currentMonth);
  const viewMode = useCalendarStore((state) => state.viewMode);
  const contentFilters = useCalendarStore((state) => state.contentFilters);
  const setCurrentMonth = useCalendarStore((state) => state.setCurrentMonth);
  const setViewMode = useCalendarStore((state) => state.setViewMode);
  const toggleContentFilter = useCalendarStore((state) => state.toggleContentFilter);
  const clearContentFilters = useCalendarStore((state) => state.clearContentFilters);
  const setSelectedDay = useCalendarStore((state) => state.setSelectedDay);

  // Get cards from data store
  const { cards } = useDataStore();
  const { events, isInitialized, initialize } = useEventStore();
  const openCardDetails = usePanelStore((state) => state.openCardDetails);
  const openDayDetails = usePanelStore((state) => state.openDayDetails);

  const currentMonthValue = currentMonth.getMonth();

  // Initialize event store
  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  // Get upcoming items (cards + events), sorted chronologically
  const upcomingItems = useMemo(() => {
    const today = format(startOfToday(), 'yyyy-MM-dd');
    const items: UpcomingItem[] = [];

    // Add scheduled cards
    cards
      .filter(card =>
        card.scheduledDate &&
        !card.collections?.includes('the-den') &&
        card.scheduledDate.split('T')[0] >= today
      )
      .forEach(card => {
        items.push({
          type: 'card',
          id: card.id,
          title: card.title || card.domain || card.url || 'Untitled',
          date: card.scheduledDate!.split('T')[0],
        });
      });

    // Add calendar events
    events
      .filter(event => event.date >= today)
      .forEach(event => {
        items.push({
          type: 'event',
          id: event.id,
          title: event.title,
          date: event.date,
          time: event.startTime,
          color: event.color,
          isAllDay: event.isAllDay,
        });
      });

    // Sort by date, then by time (all-day first)
    items.sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      // Same date - sort by time
      const aIsAllDay = a.type === 'card' || a.isAllDay;
      const bIsAllDay = b.type === 'card' || b.isAllDay;
      if (aIsAllDay && !bIsAllDay) return -1;
      if (!aIsAllDay && bIsAllDay) return 1;
      if (a.time && b.time) {
        return a.time.localeCompare(b.time);
      }
      return 0;
    });

    return items.slice(0, 5);
  }, [cards, events]);

  const totalUpcomingItems = useMemo(() => {
    const today = format(startOfToday(), 'yyyy-MM-dd');
    const cardCount = cards.filter(card =>
      card.scheduledDate &&
      !card.collections?.includes('the-den') &&
      card.scheduledDate.split('T')[0] >= today
    ).length;
    const eventCount = events.filter(event => event.date >= today).length;
    return cardCount + eventCount;
  }, [cards, events]);

  const handleMonthClick = (monthValue: number) => {
    const newDate = setMonth(currentMonth, monthValue);
    setCurrentMonth(newDate);
    setViewMode("month"); // Switch to month view when selecting a month
  };

  const handleContentFilterToggle = (filter: CalendarContentFilter) => {
    toggleContentFilter(filter);
  };

  const handleJumpToToday = () => {
    setCurrentMonth(new Date());
    setViewMode("month");
  };

  const handleToggleView = () => {
    // Toggle between week and month view
    setCurrentMonth(new Date());
    setViewMode(viewMode === "week" ? "month" : "week");
  };

  return (
    <>
      {/* Todos Section - Always at top */}
      <TodosSection />

      {/* Month Grid Selector */}
      <PanelSection
        id="calendar-month-selector"
        title="Jump to Month"
        icon={<Calendar className="h-4 w-4 text-accent" />}
      >
        <div className="grid grid-cols-3 gap-2">
          {MONTHS.map((month) => (
            <button
              key={month.value}
              onClick={() => handleMonthClick(month.value)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                month.value === currentMonthValue
                  ? "bg-purple-500/20 border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.3)] text-purple-200"
                  : "bg-white/5 border border-white/10 hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] text-muted-foreground hover:text-foreground"
              }`}
            >
              {month.name}
            </button>
          ))}
        </div>

        {/* Current month indicator */}
        <div className="mt-3 pt-3 border-t border-white/5">
          <div className="text-xs text-muted-foreground text-center">
            Viewing: <span className="text-foreground font-medium">{format(currentMonth, 'MMMM yyyy')}</span>
          </div>
        </div>
      </PanelSection>

      {/* Content Type Filters */}
      <PanelSection
        id="calendar-content-filters"
        title="Content Filters"
        icon={<Filter className="h-4 w-4 text-accent" />}
      >
        <div className="space-y-1">
          <PanelToggle
            label="Movies & Shows"
            icon={<Film size={14} />}
            checked={contentFilters.includes("movies-shows")}
            onChange={() => handleContentFilterToggle("movies-shows")}
          />
          <PanelToggle
            label="Concerts & Events"
            icon={<Music size={14} />}
            checked={contentFilters.includes("concerts-events")}
            onChange={() => handleContentFilterToggle("concerts-events")}
          />
          <PanelToggle
            label="Deadlines"
            icon={<Clock size={14} />}
            checked={contentFilters.includes("deadlines")}
            onChange={() => handleContentFilterToggle("deadlines")}
          />
          <PanelToggle
            label="Product Launches"
            icon={<Rocket size={14} />}
            checked={contentFilters.includes("product-launches")}
            onChange={() => handleContentFilterToggle("product-launches")}
          />
          <PanelToggle
            label="Other Events"
            icon={<CalendarDays size={14} />}
            checked={contentFilters.includes("other-events")}
            onChange={() => handleContentFilterToggle("other-events")}
          />
          <PanelToggle
            label="Daily Notes"
            icon={<StickyNote size={14} />}
            checked={contentFilters.includes("daily-notes")}
            onChange={() => handleContentFilterToggle("daily-notes")}
          />
        </div>

        {/* Clear filters button */}
        {contentFilters.length > 0 && (
          <button
            onClick={clearContentFilters}
            className="mt-2 text-xs text-accent hover:text-accent/80 transition-colors"
          >
            Clear all filters
          </button>
        )}
      </PanelSection>

      {/* Quick Actions */}
      <PanelSection
        id="calendar-quick-actions"
        title="Quick Actions"
        icon={<CalendarCheck className="h-4 w-4 text-accent" />}
      >
        <div className="space-y-2">
          <button
            onClick={handleJumpToToday}
            className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10
              hover:bg-white/10 hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]
              transition-all duration-200 flex items-center justify-center gap-2
              text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <CalendarCheck size={16} />
            Jump to Today
          </button>

          <button
            onClick={handleToggleView}
            className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10
              hover:bg-white/10 hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]
              transition-all duration-200 flex items-center justify-center gap-2
              text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            {viewMode === "week" ? (
              <>
                <Calendar size={16} />
                View This Month
              </>
            ) : (
              <>
                <CalendarRange size={16} />
                View This Week
              </>
            )}
          </button>
        </div>
      </PanelSection>

      {/* Upcoming Events */}
      <PanelSection
        id="calendar-upcoming-events"
        title="Upcoming Events"
        icon={<Clock className="h-4 w-4 text-accent" />}
      >
        {upcomingItems.length > 0 ? (
          <div className="space-y-2">
            {upcomingItems.map((item) => (
              <button
                key={`${item.type}-${item.id}`}
                onClick={() => {
                  if (item.type === 'card') {
                    openCardDetails(item.id);
                  } else {
                    // For events, navigate to that day
                    const [year, month, day] = item.date.split('-').map(Number);
                    const eventDate = new Date(year, month - 1, day);
                    setSelectedDay(eventDate);
                    openDayDetails();
                  }
                }}
                className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10
                  transition-colors border border-white/10 hover:border-white/20
                  flex items-start gap-3"
              >
                {/* Type indicator */}
                {item.type === 'event' ? (
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5"
                    style={{ backgroundColor: item.color || EVENT_COLORS.purple }}
                  />
                ) : (
                  <Bookmark size={12} className="text-muted-foreground flex-shrink-0 mt-1.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-accent font-medium mb-1 flex items-center gap-1.5">
                    {format(new Date(item.date + 'T00:00:00'), 'MMM d, yyyy')}
                    {item.type === 'event' && item.time && !item.isAllDay && (
                      <span className="text-muted-foreground">at {item.time}</span>
                    )}
                  </div>
                  <div className="text-sm text-foreground truncate">
                    {item.title}
                  </div>
                </div>
                <ChevronRight size={16} className="text-muted-foreground flex-shrink-0 mt-1" />
              </button>
            ))}

            {totalUpcomingItems > 5 && (
              <button
                className="w-full mt-2 text-xs text-accent hover:text-accent/80 transition-colors text-center py-2"
              >
                View all ({totalUpcomingItems} items)
              </button>
            )}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground text-center py-8 border border-dashed border-white/10 rounded-lg">
            No upcoming events
          </div>
        )}
      </PanelSection>
    </>
  );
}
