"use client";

import { useMemo } from "react";
import { PanelSection, PanelButton, PanelToggle } from "./control-panel";
import { Calendar, Filter, Plus, Film, Music, Clock, Rocket, CalendarDays, StickyNote, CalendarCheck, CalendarRange, ChevronRight } from "lucide-react";
import { format, setMonth, isAfter, startOfToday, startOfWeek, endOfWeek } from "date-fns";
import { useCalendarStore } from "@/lib/hooks/use-calendar-store";
import { useDataStore } from "@/lib/stores/data-store";
import { usePanelStore } from "@/lib/hooks/use-panel-store";

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
  const contentFilters = useCalendarStore((state) => state.contentFilters);
  const setCurrentMonth = useCalendarStore((state) => state.setCurrentMonth);
  const toggleContentFilter = useCalendarStore((state) => state.toggleContentFilter);
  const clearContentFilters = useCalendarStore((state) => state.clearContentFilters);

  // Get cards from data store
  const { cards } = useDataStore();
  const openCardDetails = usePanelStore((state) => state.openCardDetails);

  const currentMonthValue = currentMonth.getMonth();

  // Get upcoming events (next 5 chronologically)
  const upcomingEvents = useMemo(() => {
    const today = startOfToday();
    return cards
      .filter(card =>
        card.scheduledDate &&
        !card.collections?.includes('the-den') &&
        isAfter(new Date(card.scheduledDate), today)
      )
      .sort((a, b) => {
        const dateA = new Date(a.scheduledDate!).getTime();
        const dateB = new Date(b.scheduledDate!).getTime();
        return dateA - dateB;
      })
      .slice(0, 5);
  }, [cards]);

  const totalUpcomingEvents = useMemo(() => {
    const today = startOfToday();
    return cards.filter(card =>
      card.scheduledDate &&
      !card.collections?.includes('the-den') &&
      isAfter(new Date(card.scheduledDate), today)
    ).length;
  }, [cards]);

  const handleMonthClick = (monthValue: number) => {
    const newDate = setMonth(currentMonth, monthValue);
    setCurrentMonth(newDate);
  };

  const handleContentFilterToggle = (filter: CalendarContentFilter) => {
    toggleContentFilter(filter);
  };

  const handleAddEvent = () => {
    // TODO: Implement add event modal
    console.log("Add event manually");
  };

  const handleJumpToToday = () => {
    setCurrentMonth(new Date());
  };

  const handleViewThisWeek = () => {
    // For now, just jump to current week's month
    // In the future, this could switch to a week view
    setCurrentMonth(new Date());
  };

  return (
    <>
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
        icon={<Plus className="h-4 w-4 text-accent" />}
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
            onClick={handleViewThisWeek}
            className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10
              hover:bg-white/10 hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]
              transition-all duration-200 flex items-center justify-center gap-2
              text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <CalendarRange size={16} />
            View This Week
          </button>

          <button
            onClick={handleAddEvent}
            className="w-full px-4 py-2.5 rounded-lg bg-purple-500/10 border border-purple-500/30
              hover:bg-purple-500/20 hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]
              transition-all duration-200 flex items-center justify-center gap-2
              text-sm font-medium text-purple-200"
          >
            <Plus size={16} />
            Add Event Manually
          </button>
        </div>
      </PanelSection>

      {/* Upcoming Events */}
      <PanelSection
        id="calendar-upcoming-events"
        title="Upcoming Events"
        icon={<Clock className="h-4 w-4 text-accent" />}
      >
        {upcomingEvents.length > 0 ? (
          <div className="space-y-2">
            {upcomingEvents.map((event) => (
              <button
                key={event.id}
                onClick={() => openCardDetails(event.id)}
                className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10
                  transition-colors border border-white/10 hover:border-white/20
                  flex items-start gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-accent font-medium mb-1">
                    {format(new Date(event.scheduledDate!), 'MMM d, yyyy')}
                  </div>
                  <div className="text-sm text-foreground truncate">
                    {event.title || event.domain || event.url}
                  </div>
                </div>
                <ChevronRight size={16} className="text-muted-foreground flex-shrink-0 mt-1" />
              </button>
            ))}

            {totalUpcomingEvents > 5 && (
              <button
                className="w-full mt-2 text-xs text-accent hover:text-accent/80 transition-colors text-center py-2"
              >
                View all ({totalUpcomingEvents} events)
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
