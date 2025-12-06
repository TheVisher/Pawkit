"use client";

import { useMemo, useEffect } from "react";
import { PanelSection } from "./control-panel";
import { Calendar, Clock, CalendarCheck, CalendarRange, ChevronRight, ChevronLeft, Bookmark, Flag } from "lucide-react";
import { format, setMonth, setYear, isAfter, startOfToday, startOfWeek, endOfWeek, addYears, subYears } from "date-fns";
import { useCalendarStore, type HolidayCountry, type HolidayFilter } from "@/lib/hooks/use-calendar-store";
import { useDataStore } from "@/lib/stores/data-store";
import { useEventStore } from "@/lib/hooks/use-event-store";
import { usePanelStore } from "@/lib/hooks/use-panel-store";
import { TodosSection } from "./todos-section";
import { CalendarEvent, EVENT_COLORS } from "@/lib/types/calendar";
import { getUpcomingHolidays } from "@/lib/data/us-holidays";

// Type for unified upcoming item (card, event, or holiday)
type UpcomingItem = {
  type: 'card' | 'event' | 'holiday';
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string | null; // HH:mm for events
  color?: string | null; // For events
  isAllDay?: boolean;
  holidayType?: 'major' | 'minor'; // For holidays
};

// Helper to format time in 12-hour format
function formatTime12h(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

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
  const setCurrentMonth = useCalendarStore((state) => state.setCurrentMonth);
  const setViewMode = useCalendarStore((state) => state.setViewMode);
  const setSelectedDay = useCalendarStore((state) => state.setSelectedDay);

  // Holiday settings
  const showHolidays = useCalendarStore((state) => state.showHolidays);
  const holidayFilter = useCalendarStore((state) => state.holidayFilter);
  const enabledCountries = useCalendarStore((state) => state.enabledCountries);
  const setHolidayFilter = useCalendarStore((state) => state.setHolidayFilter);
  const toggleCountry = useCalendarStore((state) => state.toggleCountry);

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

  // Get upcoming items (cards + events + holidays), sorted chronologically
  const upcomingItems = useMemo(() => {
    const today = startOfToday();
    const todayStr = format(today, 'yyyy-MM-dd');
    // Cutoff: only show items within the next 45 days
    const cutoffDate = new Date(today);
    cutoffDate.setDate(cutoffDate.getDate() + 45);
    const cutoffStr = format(cutoffDate, 'yyyy-MM-dd');
    const items: UpcomingItem[] = [];

    // Add scheduled cards (within cutoff)
    cards
      .filter(card =>
        card.scheduledDate &&
        !card.collections?.includes('the-den') &&
        card.scheduledDate.split('T')[0] >= todayStr &&
        card.scheduledDate.split('T')[0] <= cutoffStr
      )
      .forEach(card => {
        items.push({
          type: 'card',
          id: card.id,
          title: card.title || card.domain || card.url || 'Untitled',
          date: card.scheduledDate!.split('T')[0],
        });
      });

    // Add calendar events (within cutoff)
    events
      .filter(event => event.date >= todayStr && event.date <= cutoffStr)
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

    // Add upcoming holidays (only major holidays within cutoff)
    if (showHolidays) {
      const upcomingHolidayList = getUpcomingHolidays(10, 'major'); // Only major holidays in upcoming
      upcomingHolidayList
        .filter(holiday => holiday.date <= cutoffStr)
        .forEach(holiday => {
          items.push({
            type: 'holiday',
            id: `holiday-${holiday.date}`,
            title: holiday.name,
            date: holiday.date,
            isAllDay: true,
            holidayType: holiday.type,
          });
        });
    }

    // Sort by date, then by time (all-day first)
    items.sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      // Same date - sort by time (holidays and all-day first)
      const aIsAllDay = a.type === 'card' || a.type === 'holiday' || a.isAllDay;
      const bIsAllDay = b.type === 'card' || b.type === 'holiday' || b.isAllDay;
      if (aIsAllDay && !bIsAllDay) return -1;
      if (!aIsAllDay && bIsAllDay) return 1;
      if (a.time && b.time) {
        return a.time.localeCompare(b.time);
      }
      return 0;
    });

    return items.slice(0, 5);
  }, [cards, events, showHolidays]);

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
        title="Jump to Date"
        icon={<Calendar className="h-4 w-4 text-accent" />}
      >
        {/* Year Selector */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <button
            onClick={() => setCurrentMonth(subYears(currentMonth, 1))}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-all"
            style={{ background: 'transparent' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-surface-3)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            aria-label="Previous year"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-lg font-semibold text-foreground min-w-[60px] text-center">
            {format(currentMonth, 'yyyy')}
          </span>
          <button
            onClick={() => setCurrentMonth(addYears(currentMonth, 1))}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-all"
            style={{ background: 'transparent' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-surface-3)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            aria-label="Next year"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Month Grid */}
        <div className="grid grid-cols-3 gap-2">
          {MONTHS.map((month) => (
            <button
              key={month.value}
              onClick={() => handleMonthClick(month.value)}
              className="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              style={month.value === currentMonthValue ? {
                background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
                color: 'var(--text-primary)',
                boxShadow: 'var(--raised-shadow)',
                border: '1px solid transparent',
                borderTopColor: 'var(--raised-border-top)',
              } : {
                background: 'transparent',
                color: 'var(--text-muted)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {month.name}
            </button>
          ))}
        </div>

        {/* Quick Navigation Buttons */}
        <div
          className="grid grid-cols-2 mt-3 pt-3 pb-1 border-t"
          style={{ borderColor: 'var(--border-divider)', gap: 'var(--space-3)' }}
        >
          <button
            onClick={handleJumpToToday}
            className="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2"
            style={{
              background: 'var(--bg-surface-3)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              boxShadow: 'var(--raised-shadow-sm)',
            }}
          >
            <CalendarCheck size={14} />
            Today
          </button>
          <button
            onClick={handleToggleView}
            className="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2"
            style={{
              background: 'var(--bg-surface-3)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              boxShadow: 'var(--raised-shadow-sm)',
            }}
          >
            <CalendarRange size={14} />
            Week
          </button>
        </div>
      </PanelSection>

      {/* Holidays Section */}
      <PanelSection
        id="calendar-holidays"
        title="Holidays"
        icon={<Flag className="h-4 w-4 text-accent" />}
      >
        {/* Country Selection - Inset Grid */}
        <div
          className="rounded-xl p-4"
          style={{
            background: 'var(--bg-surface-1)',
            boxShadow: 'var(--inset-shadow)',
            border: 'var(--inset-border)',
            borderBottomColor: 'var(--inset-border-bottom)',
            borderRightColor: 'var(--inset-border-right)',
          }}
        >
          <div
            className="grid grid-cols-2"
            style={{ gap: 'var(--space-4)' }}
          >
            {/* US Button */}
            <button
              onClick={() => toggleCountry("us")}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all"
              style={enabledCountries.includes("us") ? {
                background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
                color: 'var(--text-primary)',
                boxShadow: 'var(--raised-shadow)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'transparent',
                borderTopColor: 'var(--raised-border-top)',
              } : {
                background: 'transparent',
                color: 'var(--text-muted)',
              }}
            >
              <span>🇺🇸</span>
              <span>US</span>
            </button>

            {/* Canada Button */}
            <button
              onClick={() => toggleCountry("ca")}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all"
              style={enabledCountries.includes("ca") ? {
                background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
                color: 'var(--text-primary)',
                boxShadow: 'var(--raised-shadow)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'transparent',
                borderTopColor: 'var(--raised-border-top)',
              } : {
                background: 'transparent',
                color: 'var(--text-muted)',
              }}
            >
              <span>🇨🇦</span>
              <span>Canada</span>
            </button>
          </div>
        </div>

        {/* Major/All Holidays Pill Slider - only show when at least one country enabled */}
        {enabledCountries.length > 0 && (
          <div
            className="relative rounded-full mt-3"
            style={{
              background: 'var(--bg-surface-1)',
              boxShadow: 'var(--slider-inset)',
              border: 'var(--inset-border)',
              borderBottomColor: 'var(--slider-inset-border-bottom)',
              padding: '4px',
            }}
          >
            {/* Sliding indicator */}
            <div
              className="absolute rounded-full transition-all duration-300 ease-out pointer-events-none"
              style={{
                width: 'calc((100% - 8px) / 2)',
                height: 'calc(100% - 8px)',
                top: '4px',
                left: holidayFilter === "major" ? '4px' : 'calc(4px + ((100% - 8px) / 2))',
                background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
                boxShadow: 'var(--raised-shadow-sm)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'transparent',
                borderTopColor: 'var(--raised-border-top)',
              }}
            />
            {/* Buttons */}
            <div className="relative flex">
              <button
                onClick={() => setHolidayFilter("major")}
                className="flex-1 flex items-center justify-center py-2 rounded-full transition-colors duration-200 z-10 text-xs font-medium"
                style={{
                  color: holidayFilter === "major" ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
              >
                Major
              </button>
              <button
                onClick={() => setHolidayFilter("all")}
                className="flex-1 flex items-center justify-center py-2 rounded-full transition-colors duration-200 z-10 text-xs font-medium"
                style={{
                  color: holidayFilter === "all" ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
              >
                All
              </button>
            </div>
          </div>
        )}
      </PanelSection>

      {/* Upcoming Events */}
      <PanelSection
        id="calendar-upcoming-events"
        title="Upcoming Events"
        icon={<Clock className="h-4 w-4 text-accent" />}
      >
        {upcomingItems.length > 0 ? (
          <div className="space-y-3 pb-1">
            {upcomingItems.map((item) => (
              <button
                key={`${item.type}-${item.id}`}
                onClick={() => {
                  if (item.type === 'card') {
                    openCardDetails(item.id);
                  } else {
                    // For events and holidays, navigate to that day
                    const [year, month, day] = item.date.split('-').map(Number);
                    const eventDate = new Date(year, month - 1, day);
                    setSelectedDay(eventDate);
                    openDayDetails();
                  }
                }}
                className="w-full text-left p-3 rounded-lg transition-all flex items-start gap-3"
                style={{
                  background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
                  boxShadow: 'var(--raised-shadow-sm)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: 'var(--border-subtle)',
                  borderTopColor: 'var(--raised-border-top)',
                }}
              >
                {/* Type indicator */}
                {item.type === 'event' ? (
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5"
                    style={{ backgroundColor: item.color || EVENT_COLORS.purple }}
                  />
                ) : item.type === 'holiday' ? (
                  <Flag size={12} className="flex-shrink-0 mt-1.5" style={{ color: 'var(--ds-accent)' }} />
                ) : (
                  <Bookmark size={12} className="flex-shrink-0 mt-1.5" style={{ color: 'var(--text-muted)' }} />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium mb-1 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                    {format(new Date(item.date + 'T00:00:00'), 'MMM d, yyyy')}
                    {item.type === 'event' && item.time && !item.isAllDay && (
                      <span style={{ color: 'var(--text-muted)' }}>at {formatTime12h(item.time)}</span>
                    )}
                  </div>
                  <div className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                    {item.title}
                  </div>
                </div>
                <ChevronRight size={16} className="flex-shrink-0 mt-1" style={{ color: 'var(--text-muted)' }} />
              </button>
            ))}

            {totalUpcomingItems > 5 && (
              <button
                className="w-full mt-2 text-xs transition-colors text-center py-2"
                style={{ color: 'var(--text-accent)' }}
              >
                View all ({totalUpcomingItems} items)
              </button>
            )}
          </div>
        ) : (
          <div
            className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-lg"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            No upcoming events
          </div>
        )}
      </PanelSection>
    </>
  );
}
