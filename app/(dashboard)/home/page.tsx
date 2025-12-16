"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { format } from "date-fns";
import { useDataStore } from "@/lib/stores/data-store";
import { usePanelStore } from "@/lib/hooks/use-panel-store";
import { useTodoStore } from "@/lib/hooks/use-todos";
import { useEventStore } from "@/lib/hooks/use-event-store";
import { useHomeData, WeekDay } from "./hooks/use-home-data";
import { HomeHeader } from "./components/home-header";
import { TodayCard } from "./components/today-card";
import { WeekCalendar } from "./components/week-calendar";
import { InboxStatsCard } from "./components/inbox-stats-card";
import { PinnedPawkits } from "./components/pinned-pawkits";
import { RecentItems } from "./components/recent-items";
import { WelcomeBanner } from "@/components/onboarding/welcome-banner";
import { GlowButton } from "@/components/ui/glow-button";
import { CalendarIcon, Clock, FileText, Flag } from "lucide-react";
import { CalendarEvent } from "@/lib/types/calendar";
import { CardModel } from "@/lib/types";

// Helper to format time in 12-hour format
function formatTime12h(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export default function HomePage() {
  const openCardDetails = usePanelStore((state) => state.openCardDetails);
  const setHomeControls = usePanelStore((state) => state.setHomeControls);
  const activeCardId = usePanelStore((state) => state.activeCardId);

  const [displayName, setDisplayName] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<WeekDay | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Data hooks
  const { addCard } = useDataStore();
  const { toggleTodo } = useTodoStore();
  const { isInitialized: eventsInitialized, initialize: initializeEvents } = useEventStore();

  // Home data hook - all computed data
  const {
    groupedTodos,
    inboxItems,
    inboxCount,
    recentItems,
    pinnedPawkits,
    weekDays,
    today,
    thisWeekStats,
  } = useHomeData();

  // Initialize event store
  useEffect(() => {
    if (!eventsInitialized) {
      initializeEvents();
    }
  }, [eventsInitialized, initializeEvents]);

  // Set Home controls when this page loads
  useEffect(() => {
    setHomeControls();
  }, [setHomeControls]);

  // Track mount state for portal
  useEffect(() => {
    if (typeof document !== 'undefined' && document.body) {
      setIsMounted(true);
    }
    return () => setIsMounted(false);
  }, []);

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/user');
        if (response.ok) {
          const data = await response.json();
          setDisplayName(data.displayName);
        }
      } catch (error) {
        // Silently fail
      }
    };
    fetchProfile();
  }, []);

  // Handle creating/opening daily note
  const handleOpenDailyNote = async () => {
    if (today.dailyNote) {
      openCardDetails(today.dailyNote.id);
    } else {
      // Create new daily note
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });

      const title = `${year}-${month}-${day} - ${dayName}`;
      const content = `# ${dayName}, ${date.toLocaleDateString('en-US', { month: 'long' })} ${day}, ${year}

## Today's Focus
- [ ]

## Notes & Thoughts
-

## Tasks
- [ ]

## Highlights
-

## Tomorrow's Plan
- [ ]

#daily #${year} #${date.toLocaleDateString('en-US', { month: 'long' }).toLowerCase()}`;

      await addCard({
        type: 'md-note',
        title,
        content,
        tags: ['daily'],
        collections: []
      });

      const { useToastStore } = await import("@/lib/stores/toast-store");
      useToastStore.getState().success("Daily note created");

      // Find the newly created card
      const dataStore = useDataStore.getState();
      const newCard = dataStore.cards.find(c => c.title === title);
      if (newCard) {
        openCardDetails(newCard.id);
      }
    }
  };

  // Handle creating daily note for a specific day
  const handleCreateDailyNoteForDay = async (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });

    const title = `${year}-${month}-${day} - ${dayName}`;
    const content = `# ${dayName}, ${date.toLocaleDateString('en-US', { month: 'long' })} ${day}, ${year}

## Today's Focus
- [ ]

## Notes & Thoughts
-

## Tasks
- [ ]

## Highlights
-

## Tomorrow's Plan
- [ ]

#daily #${year} #${date.toLocaleDateString('en-US', { month: 'long' }).toLowerCase()}`;

    await addCard({
      type: 'md-note',
      title,
      content,
      tags: ['daily'],
      collections: []
    });

    const { useToastStore } = await import("@/lib/stores/toast-store");
    useToastStore.getState().success("Daily note created");

    const dataStore = useDataStore.getState();
    const newCard = dataStore.cards.find(c => c.title === title);
    if (newCard) {
      openCardDetails(newCard.id);
      setSelectedDay(null);
    }
  };

  return (
    <>
      {/* Main container - MUST fill viewport exactly, no scrolling */}
      <div className="h-full flex flex-col gap-4 overflow-visible">
        {/* Welcome Banner for new users */}
        <WelcomeBanner className="shrink-0" />

        {/* Header - fixed height */}
        <div className="shrink-0">
          <HomeHeader userName={displayName} />
        </div>

        {/* Content wrapper - limit width to ~65% */}
        <div className="flex-1 flex flex-col gap-4 min-h-0 w-[65%]">
          {/* TOP SECTION - Today + Calendar/Stats */}
          <div className="grid grid-cols-2 gap-4 min-h-0 flex-[4]">
            {/* Left column: Today (spans both rows) */}
            <div className="row-span-2 min-h-0">
              <TodayCard
                events={today.events}
                scheduledCards={today.scheduledCards}
                dailyNote={today.dailyNote}
                groupedTodos={groupedTodos}
                onToggleTodo={toggleTodo}
                onOpenDailyNote={handleOpenDailyNote}
              />
            </div>

            {/* Right column top: This Week Calendar */}
            <div className="min-h-0">
              <WeekCalendar
                weekDays={weekDays}
                onDayClick={setSelectedDay}
              />
            </div>

            {/* Right column bottom: Inbox + This Week Stats */}
            <div className="min-h-0">
              <InboxStatsCard
                inboxItems={inboxItems}
                inboxCount={inboxCount}
                savedThisWeek={thisWeekStats.savedThisWeek}
                processedThisWeek={thisWeekStats.processedThisWeek}
              />
            </div>
          </div>

          {/* BOTTOM SECTION - Horizontal rows */}
          <div className="flex flex-col gap-4 min-h-0 flex-[5]">
            {/* Pinned Pawkits - horizontal row */}
            {pinnedPawkits.length > 0 && (
              <div className="min-h-0 shrink-0">
                <PinnedPawkits pawkits={pinnedPawkits} />
              </div>
            )}

            {/* Recent Items - horizontal row (has empty state for new users) */}
            <div className="min-h-0 flex-1">
              <RecentItems items={recentItems} />
            </div>
          </div>
        </div>
      </div>

      {/* Day Details Modal */}
      {selectedDay && !activeCardId && isMounted && typeof document !== 'undefined' && document.body && (() => {
        const modalContent = (
          <DayDetailsModal
            day={selectedDay}
            onClose={() => setSelectedDay(null)}
            onOpenCard={openCardDetails}
            onCreateDailyNote={handleCreateDailyNoteForDay}
          />
        );

        try {
          return createPortal(modalContent, document.body);
        } catch {
          return null;
        }
      })()}
    </>
  );
}

// Day Details Modal Component
interface DayDetailsModalProps {
  day: WeekDay;
  onClose: () => void;
  onOpenCard: (id: string) => void;
  onCreateDailyNote: (date: Date) => void;
}

function DayDetailsModal({ day, onClose, onOpenCard, onCreateDailyNote }: DayDetailsModalProps) {
  const totalItems = day.items.length + day.events.length + (day.dailyNote ? 1 : 0);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-lg p-6 w-full max-w-2xl shadow-xl max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <h2 className="text-xl font-semibold text-foreground mb-2">
          {format(day.date, "EEEE, MMMM d, yyyy")}
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          {totalItems} item(s) for this day
        </p>

        {/* Daily Note Section */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <CalendarIcon size={16} />
            Daily Note
          </h3>
          {day.dailyNote ? (
            <GlowButton
              onClick={() => {
                onOpenCard(day.dailyNote!.id);
                onClose();
              }}
              variant="primary"
              className="w-full text-left p-4 rounded-xl justify-start"
            >
              <div className="flex items-center justify-between w-full">
                <div>
                  <div className="font-medium text-accent">{day.dailyNote.title}</div>
                  <div className="text-sm text-accent/70 mt-1">
                    {day.dailyNote.content?.substring(0, 100)}...
                  </div>
                </div>
                <div className="text-accent">→</div>
              </div>
            </GlowButton>
          ) : (
            <GlowButton
              onClick={() => onCreateDailyNote(day.date)}
              variant="primary"
              className="w-full text-left p-4 rounded-xl justify-start"
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>+ Create daily note for this day</span>
              </div>
            </GlowButton>
          )}
        </div>

        {/* Calendar Events Section */}
        {day.events.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <CalendarIcon size={16} />
              Calendar Events ({day.events.length})
            </h3>
            <div className="space-y-2">
              {day.events.map((event) => (
                <div
                  key={event.id}
                  className="p-3 rounded-lg bg-surface-soft border border-subtle flex items-start gap-3"
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                    style={{ backgroundColor: event.color || 'var(--ds-accent)' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground">
                      {event.title}
                    </div>
                    {!event.isAllDay && event.startTime && (
                      <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock size={12} />
                        {formatTime12h(event.startTime)}
                        {event.endTime && ` - ${formatTime12h(event.endTime)}`}
                      </div>
                    )}
                    {event.location && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {event.location}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scheduled Cards Section */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Scheduled Cards ({day.items.length})
          </h3>
          {day.items.length > 0 ? (
            <div className="space-y-2">
              {day.items.map((card) => (
                <button
                  key={card.id}
                  onClick={() => {
                    onOpenCard(card.id);
                    onClose();
                  }}
                  className="w-full text-left p-3 rounded-lg bg-surface-soft hover:bg-surface transition-colors border border-subtle flex items-center gap-3"
                >
                  {card.image && (
                    <img
                      src={card.image}
                      alt=""
                      className="w-12 h-12 rounded object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground truncate">
                      {card.title || card.domain || card.url}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      {card.domain || card.url}
                    </div>
                  </div>
                  <div className="text-muted-foreground">→</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-8 border border-dashed border-subtle rounded-lg">
              No cards scheduled for this day
            </div>
          )}
        </div>

        {/* Close Button */}
        <div className="flex justify-end">
          <GlowButton onClick={onClose} variant="primary" size="md">
            Close
          </GlowButton>
        </div>
      </div>
    </div>
  );
}
