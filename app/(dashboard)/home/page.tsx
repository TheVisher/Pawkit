"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { DEFAULT_USERNAME } from "@/lib/constants";
import { QuickAccessCard } from "@/components/home/quick-access-card";
import { QuickAccessPawkitCard } from "@/components/home/quick-access-pawkit-card";
import { CardModel, CollectionNode } from "@/lib/types";
import { CalendarEvent, EVENT_COLORS } from "@/lib/types/calendar";
import { useDataStore } from "@/lib/stores/data-store";
import { useViewSettingsStore } from "@/lib/hooks/view-settings-store";
import { usePanelStore } from "@/lib/hooks/use-panel-store";
import { useEventStore } from "@/lib/hooks/use-event-store";
import { useCalendarStore } from "@/lib/hooks/use-calendar-store";
import { CardContextMenuWrapper } from "@/components/cards/card-context-menu";
import { format, addDays, startOfDay } from "date-fns";
import { isDailyNote, extractDateFromTitle, getDateString } from "@/lib/utils/daily-notes";
import { getHolidaysInRange, ResolvedHoliday } from "@/lib/data/us-holidays";
import { Plus, FileText, CalendarIcon, Flag, Clock } from "lucide-react";
import { CardImage } from "@/components/cards/card-image";
import { GlowButton } from "@/components/ui/glow-button";
import { HorizontalScrollContainer } from "@/components/ui/horizontal-scroll-container";
import { addCollectionWithHierarchy, removeCollectionWithHierarchy } from "@/lib/utils/collection-hierarchy";
import { WelcomeBanner } from "@/components/onboarding/welcome-banner";

const GREETINGS = [
  "Welcome back",
  "Hey there",
  "Good to see you",
  "Happy to see you",
  "Great to have you back"
];

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
  const [greeting] = useState(() => GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Track if component is mounted and document.body is available (for portal rendering)
  useEffect(() => {
    // Double-check document.body exists before setting mounted
    if (typeof document !== 'undefined' && document.body) {
      setIsMounted(true);
    }
    return () => setIsMounted(false);
  }, []);

  // Read from global store - instant, no API calls
  const { cards, collections, updateCard, deleteCard, addCard } = useDataStore();

  // Event store for calendar events
  const { events, isInitialized: eventsInitialized, initialize: initializeEvents, generateRecurrenceInstances } = useEventStore();

  // Calendar store for holiday settings
  const showHolidays = useCalendarStore((state) => state.showHolidays);
  const holidayFilter = useCalendarStore((state) => state.holidayFilter);
  const enabledCountries = useCalendarStore((state) => state.enabledCountries);

  // Initialize event store
  useEffect(() => {
    if (!eventsInitialized) {
      initializeEvents();
    }
  }, [eventsInitialized, initializeEvents]);

  // Set Home controls when this page loads (doesn't force panel open)
  useEffect(() => {
    setHomeControls();
  }, [setHomeControls]);

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
      }
    };
    fetchProfile();
  }, []);

  // Build private collection IDs helper
  const privateCollectionIds = useMemo(() => {
    const ids = new Set<string>();
    const getAllCollectionIds = (nodes: CollectionNode[]): void => {
      for (const node of nodes) {
        if (node.isPrivate) {
          ids.add(node.id);
        }
        if (node.children && node.children.length > 0) {
          getAllCollectionIds(node.children);
        }
      }
    };
    getAllCollectionIds(collections);
    return ids;
  }, [collections]);

  // Compute views from the single source of truth
  const recent = useMemo(() => {
    if (!cards || !Array.isArray(cards)) return [];
    return cards
      .filter(c => {
        // Skip deleted cards
        if (c.deleted === true) return false;
        const isInPrivateCollection = c.collections?.some(collectionId =>
          privateCollectionIds.has(collectionId)
        );
        return !isInPrivateCollection;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 15); // Increased from 5 to 15
  }, [cards, privateCollectionIds]);

  const quickAccess = useMemo(() => {
    if (!cards || !Array.isArray(cards)) return [];
    return cards
      .filter(c => {
        // Skip deleted cards
        if (c.deleted === true) return false;
        if (!c.pinned) return false;
        const isInPrivateCollection = c.collections?.some(collectionId =>
          privateCollectionIds.has(collectionId)
        );
        return !isInPrivateCollection;
      })
      .slice(0, 8);
  }, [cards, privateCollectionIds]);

  // Get pinned pawkits from collections (flatten tree and filter)
  const pinnedPawkits = useMemo(() => {
    if (!collections || !Array.isArray(collections)) return [];

    const flattenCollections = (nodes: CollectionNode[]): CollectionNode[] => {
      return nodes.reduce<CollectionNode[]>((acc, node) => {
        acc.push(node);
        if (node.children && Array.isArray(node.children) && node.children.length > 0) {
          acc.push(...flattenCollections(node.children));
        }
        return acc;
      }, []);
    };

    return flattenCollections(collections)
      .filter(c => c.pinned)
      .slice(0, 8);
  }, [collections]);

  // Get the week starting from Monday
  const weekDays = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day; // If Sunday (0), go back 6 days, else go to Monday
    const monday = addDays(startOfDay(now), diff);

    return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  }, []);

  // Group cards by date
  const cardsByDate = useMemo(() => {
    const map = new Map<string, CardModel[]>();

    if (!cards || !Array.isArray(cards)) return map;

    cards
      .filter((card) => card.scheduledDate && !card.collections?.includes('the-den'))
      .forEach((card) => {
        const dateStr = card.scheduledDate!.split('T')[0];
        if (!map.has(dateStr)) {
          map.set(dateStr, []);
        }
        map.get(dateStr)!.push(card);
      });

    return map;
  }, [cards]);

  // Group events by date (including recurrence instances)
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();

    if (weekDays.length === 0) return map;

    const rangeStart = format(weekDays[0], 'yyyy-MM-dd');
    const rangeEnd = format(weekDays[weekDays.length - 1], 'yyyy-MM-dd');

    events.forEach((event) => {
      // Generate recurrence instances for recurring events
      const instances = generateRecurrenceInstances(event, rangeStart, rangeEnd);

      instances.forEach((instance) => {
        const dateStr = instance.instanceDate;
        if (!map.has(dateStr)) {
          map.set(dateStr, []);
        }
        map.get(dateStr)!.push(instance.event);
      });
    });

    // Sort events by time within each day
    map.forEach((dayEvents) => {
      dayEvents.sort((a, b) => {
        // All-day events first
        if (a.isAllDay && !b.isAllDay) return -1;
        if (!a.isAllDay && b.isAllDay) return 1;
        // Then by start time
        if (a.startTime && b.startTime) {
          return a.startTime.localeCompare(b.startTime);
        }
        return 0;
      });
    });

    return map;
  }, [events, weekDays, generateRecurrenceInstances]);

  // Group holidays by date
  const holidaysByDate = useMemo(() => {
    const map = new Map<string, ResolvedHoliday>();

    if (!showHolidays || enabledCountries.length === 0 || weekDays.length === 0) return map;

    const rangeStart = format(weekDays[0], 'yyyy-MM-dd');
    const rangeEnd = format(weekDays[weekDays.length - 1], 'yyyy-MM-dd');

    const holidays = getHolidaysInRange(rangeStart, rangeEnd, holidayFilter);

    holidays.forEach((holiday) => {
      map.set(holiday.date, holiday);
    });

    return map;
  }, [showHolidays, holidayFilter, enabledCountries, weekDays]);

  const recentIds = new Set(recent.map(card => card.id));
  let quickAccessUnique = quickAccess.filter(item => !recentIds.has(item.id));

  if (quickAccessUnique.length === 0) {
    quickAccessUnique = quickAccess;
  }

  const handleCreateQuickNote = async (date: Date) => {
    try {
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

      // Find the newly created card from the updated store
      const dataStore = useDataStore.getState();
      const newCard = dataStore.cards.find(c => c.title === title);
      if (newCard) {
        openCardDetails(newCard.id);
        setSelectedDate(null);
      }
    } catch (error) {
    }
  };

  // Get cards scheduled for a specific date
  const getCardsForDate = (date: Date) => {
    if (!cards || !Array.isArray(cards)) return [];
    const dateStr = date.toISOString().split('T')[0];
    return cards.filter(card =>
      card.scheduledDate &&
      card.scheduledDate.split('T')[0] === dateStr &&
      !card.collections?.includes('the-den')
    );
  };

  // Get daily note for a specific date
  const getDailyNoteForDate = (date: Date) => {
    if (!cards || !Array.isArray(cards)) return undefined;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const title = `${year}-${month}-${day} - ${dayName}`;
    return cards.find(c => c.title === title && !c.collections?.includes('the-den'));
  };

  // Get events for a specific date
  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return eventsByDate.get(dateStr) || [];
  };

  // Get holiday for a specific date
  const getHolidayForDate = (date: Date): ResolvedHoliday | undefined => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return holidaysByDate.get(dateStr);
  };

  return (
    <>
      <div className="flex flex-1 flex-col gap-12 pb-16 min-h-full">
        {/* Welcome Banner for new users */}
        <WelcomeBanner className="mb-2" />

        {/* Greeting section - pushed down to avoid search bar overlap */}
        <section className="relative text-center pt-16">
          <h1 className="text-4xl font-semibold text-gray-100 sm:text-5xl">
            <span className="mr-3 inline-block" aria-hidden="true">👋</span>
            {displayName ? `${greeting}, ${displayName}` : "Welcome to Pawkit!"}
          </h1>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-gray-100">Recent Items</h2>
            <Link href="/library" className="text-sm text-accent hover:text-accent/80">
              View library
            </Link>
          </div>
          {recent.length > 0 ? (
            <HorizontalScrollContainer>
              {recent.map((card) => (
                <div key={card.id} className="flex-shrink-0 w-[322px]">
                <RecentCard
                  key={card.id}
                  card={card}
                  onClick={() => openCardDetails(card.id)}
                  onAddToPawkit={async (slug) => {
                    const newCollections = addCollectionWithHierarchy(card.collections || [], slug, collections);
                    await updateCard(card.id, { collections: newCollections });
                  }}
                  onDeleteCard={async () => {
                    await deleteCard(card.id);
                  }}
                  onRemoveFromPawkit={async (slug) => {
                    const newCollections = removeCollectionWithHierarchy(card.collections || [], slug, collections, true);
                    await updateCard(card.id, { collections: newCollections });
                  }}
                  onRemoveFromAllPawkits={async () => {
                    await updateCard(card.id, { collections: [] });
                  }}
                />
                </div>
              ))}
            </HorizontalScrollContainer>
          ) : (
            <EmptyState
              message="Add your first bookmark to see it here."
              showOnboarding={cards.length === 0}
            />
          )}
        </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-gray-100">Quick Access</h2>
          <Link href="/pawkits" className="text-sm text-accent hover:text-accent/80">
            Manage shortcuts
          </Link>
        </div>
        <HorizontalScrollContainer>
          {/* Pinned Pawkits */}
          {pinnedPawkits.map((pawkit) => (
            <div key={pawkit.id} className="flex-shrink-0 w-[250px]">
              <QuickAccessPawkitCard pawkit={pawkit} />
            </div>
          ))}

          {/* Pinned Cards */}
          {quickAccessUnique.map((item) => (
            <div key={item.id} className="flex-shrink-0 w-[250px]">
              <QuickAccessCard card={item} />
            </div>
          ))}
        </HorizontalScrollContainer>
      </section>

      <section className="mt-auto space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-gray-100">This Week</h2>
          <Link href="/calendar" className="text-sm text-accent hover:text-accent/80">
            View full calendar
          </Link>
        </div>
        <div className="max-w-[1800px] mx-auto">
          <HorizontalScrollContainer>
            {weekDays.map((day, index) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayCards = cardsByDate.get(dateStr) || [];
            const dayEvents = eventsByDate.get(dateStr) || [];
            const holiday = holidaysByDate.get(dateStr);
            const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;

            // Check if there's a daily note for this date
            const dailyNote = cards && Array.isArray(cards) ? cards.find(card => {
              if (!isDailyNote(card)) return false;
              const noteDate = extractDateFromTitle(card.title!);
              const noteDateStr = noteDate ? getDateString(noteDate) : null;
              return noteDateStr === dateStr;
            }) : undefined;

            return (
              <div
                key={dateStr}
                className={`card-hover rounded-2xl border bg-surface p-3 md:p-4 min-h-[160px] md:min-h-[200px] flex flex-col relative cursor-pointer transition-all flex-shrink-0 w-[180px] sm:w-[200px] md:w-[220px] ${
                  isToday ? 'border-accent' : 'border-subtle'
                }`}
                onClick={() => setSelectedDate(day)}
              >
                <div className="text-center mb-2 md:mb-3">
                  <p className="text-[10px] md:text-xs text-muted-foreground uppercase">
                    {format(day, 'EEE')}
                  </p>
                  <p className={`text-xl md:text-2xl font-semibold ${isToday ? 'text-accent' : 'text-foreground'}`}>
                    {format(day, 'd')}
                  </p>
                </div>
                <div className="space-y-1 md:space-y-2 flex-1 overflow-y-auto max-h-[100px]">
                  {/* Holiday */}
                  {holiday && (
                    <div className="px-1.5 md:px-2 py-1 md:py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
                      <div className="flex items-center gap-1 md:gap-1.5">
                        <Flag size={10} className="text-amber-400 flex-shrink-0" />
                        <span className="text-[10px] md:text-xs font-medium text-amber-400 truncate">
                          {holiday.name}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Calendar Events */}
                  {dayEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Open event details panel when implemented
                      }}
                      className="w-full text-left p-1.5 md:p-2 rounded-lg bg-surface-soft hover:bg-surface-soft/80 transition-colors"
                    >
                      <div className="flex items-start gap-1.5 md:gap-2">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                          style={{ backgroundColor: event.color || 'var(--ds-accent)' }}
                        />
                        <div className="flex-1 min-w-0">
                          {!event.isAllDay && event.startTime && (
                            <div className="text-[8px] md:text-[10px] text-muted-foreground flex items-center gap-0.5 mb-0.5">
                              <Clock size={8} />
                              {formatTime12h(event.startTime)}
                            </div>
                          )}
                          <p className="text-[10px] md:text-xs font-medium text-foreground truncate">
                            {event.title}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}

                  {/* Scheduled Cards */}
                  {dayCards.map((card) => (
                    <button
                      key={card.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        openCardDetails(card.id);
                      }}
                      className="w-full text-left p-1.5 md:p-2 rounded-lg bg-surface-soft hover:bg-surface-soft/80 transition-colors"
                    >
                      <div className="flex items-center gap-1.5 md:gap-2">
                        {card.image && (
                          <div className="h-6 w-6 md:h-8 md:w-8 flex-shrink-0 overflow-hidden rounded">
                            <img src={card.image} alt="" className="h-full w-full object-cover" />
                          </div>
                        )}
                        <p className="text-[10px] md:text-xs font-medium text-foreground truncate flex-1">
                          {card.title || card.domain || card.url}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Daily Note Pill or Add Button - anchored to bottom */}
                <div className="absolute bottom-2 left-2 right-2 flex justify-center">
                  {dailyNote && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openCardDetails(dailyNote.id);
                      }}
                      className="px-3 py-1.5 rounded-full bg-accent/20 backdrop-blur-md border border-accent/30 text-xs text-accent hover:bg-accent/30 transition-colors flex items-center gap-1.5"
                    >
                      <FileText size={12} />
                      <span>Daily Note</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          </HorizontalScrollContainer>
        </div>
      </section>
      </div>

      {/* Expanded Day View Modal */}
      {selectedDate && !activeCardId && isMounted && typeof document !== 'undefined' && document.body && (() => {
        const scheduledCards = getCardsForDate(selectedDate);
        const dailyNote = getDailyNoteForDate(selectedDate);
        const dayEvents = getEventsForDate(selectedDate);
        const holiday = getHolidayForDate(selectedDate);

        const totalItems = scheduledCards.length + dayEvents.length + (dailyNote ? 1 : 0) + (holiday ? 1 : 0);

        const modalContent = (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedDate(null)}
          >
            <div
              className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-lg p-6 w-full max-w-2xl shadow-xl max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <h2 className="text-xl font-semibold text-foreground mb-2">
                {selectedDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                {totalItems} item(s) for this day
              </p>

              {/* Holiday Section */}
              {holiday && (
                <div className="mb-6">
                  <div className="px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <div className="flex items-center gap-2">
                      <Flag size={16} className="text-amber-400 flex-shrink-0" />
                      <span className="text-sm font-medium text-amber-400">
                        {holiday.name}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Daily Note Section */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <CalendarIcon size={16} />
                  Daily Note
                </h3>
                {dailyNote ? (
                  <GlowButton
                    onClick={() => {
                      openCardDetails(dailyNote.id);
                      setSelectedDate(null);
                    }}
                    variant="primary"
                    className="w-full text-left p-4 rounded-xl justify-start"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <div className="font-medium text-accent">{dailyNote.title}</div>
                        <div className="text-sm text-accent/70 mt-1">
                          {dailyNote.content?.substring(0, 100)}...
                        </div>
                      </div>
                      <div className="text-accent">→</div>
                    </div>
                  </GlowButton>
                ) : (
                  <GlowButton
                    onClick={() => handleCreateQuickNote(selectedDate)}
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
              {dayEvents.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <CalendarIcon size={16} />
                    Calendar Events ({dayEvents.length})
                  </h3>
                  <div className="space-y-2">
                    {dayEvents.map((event) => (
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
                          {event.description && (
                            <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {event.description}
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
                  Scheduled Cards ({scheduledCards.length})
                </h3>
                {scheduledCards.length > 0 ? (
                  <div className="space-y-2">
                    {scheduledCards.map((card) => (
                      <button
                        key={card.id}
                        onClick={() => {
                          openCardDetails(card.id);
                          setSelectedDate(null);
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
                <GlowButton
                  onClick={() => setSelectedDate(null)}
                  variant="primary"
                  size="md"
                >
                  Close
                </GlowButton>
              </div>
            </div>
          </div>
        );

        try {
          return createPortal(modalContent, document.body);
        } catch (error) {
          return null;
        }
      })()}
    </>
  );
}

type CardProps = {
  card: CardModel;
  onClick: () => void;
  onAddToPawkit: (slug: string) => void;
  onDeleteCard: () => void;
  onRemoveFromPawkit: (slug: string) => void;
  onRemoveFromAllPawkits: () => void;
};

function RecentCard({ card, onClick, onAddToPawkit, onDeleteCard, onRemoveFromPawkit, onRemoveFromAllPawkits }: CardProps) {
  // Get display settings for home view
  const viewSettings = useViewSettingsStore((state) => state.getSettings('home'));
  const showTitles = (viewSettings as any)?.showTitles ?? true;
  const showUrls = (viewSettings as any)?.showUrls ?? true;

  const isNote = card.type === 'md-note' || card.type === 'text-note';
  const isFileCard = card.type === 'file';

  return (
    <CardContextMenuWrapper
      onAddToPawkit={onAddToPawkit}
      onDelete={onDeleteCard}
      cardCollections={card.collections || []}
      onRemoveFromPawkit={onRemoveFromPawkit}
      onRemoveFromAllPawkits={onRemoveFromAllPawkits}
    >
      <article
        onClick={onClick}
        className="card-hover flex h-full cursor-pointer flex-col justify-between rounded-2xl border border-subtle bg-surface p-4 transition relative"
      >
      {/* Note icon background for notes */}
      {isNote && (
        <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
          <FileText size={40} strokeWidth={1.5} className="text-accent" />
        </div>
      )}

      {/* Image preview - use CardImage for file cards to handle blob URLs properly */}
      {(card.image || isFileCard) && !isNote && (
        <div className="mb-3 overflow-hidden rounded-xl bg-surface-soft relative">
          {isFileCard ? (
            <CardImage
              card={card}
              className={`h-32 w-full ${(card.metadata as { fileCategory?: string } | null)?.fileCategory === 'pdf' ? 'object-contain bg-gray-800' : 'object-cover'}`}
              loading="lazy"
            />
          ) : (
            <img src={card.image!} alt={card.title ?? card.url} className="h-32 w-full object-cover" loading="lazy" />
          )}
          {/* URL Pill Overlay - show filename for file cards */}
          {showUrls && (card.url || isFileCard) && !isFileCard && (
            <a
              href={card.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-2 left-2 right-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-xs text-white hover:bg-black/60 transition-colors flex items-center justify-center"
            >
              <span className="truncate max-w-full">
                {card.domain || new URL(card.url).hostname}
              </span>
            </a>
          )}
          {/* File name pill for file cards */}
          {isFileCard && (
            <div className="absolute bottom-2 left-2 right-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-xs text-white flex items-center justify-center">
              <span className="truncate max-w-full">
                {card.title || 'File'}
              </span>
            </div>
          )}
        </div>
      )}
      <div className="relative z-10">
        {showTitles && (
          <>
            <p className="text-sm font-semibold text-foreground line-clamp-2" title={card.title ?? card.url}>
              {card.title || card.domain || card.url}
            </p>
            {isNote && card.content && (
              <p className="text-xs text-muted-foreground/70 line-clamp-[10] mt-1 whitespace-pre-line">
                {card.content
                  .replace(/^#{1,6}\s+/gm, '') // Remove markdown headers (# ## ### etc) but keep the text
                  .replace(/\[x\]/gi, '☑') // Convert [x] to checked checkbox
                  .replace(/\[ \]/g, '☐') // Convert [ ] to unchecked checkbox
                  .replace(/^[\s]*[-*]\s+/gm, '• ') // Convert - or * bullets to •
                  .replace(/[*_~`]/g, '') // Remove markdown formatting
                  .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert [text](url) to just text
                  .trim()}
              </p>
            )}
          </>
        )}
      </div>
      <p className="mt-4 text-xs text-muted-foreground/80 relative z-10">Added {formatDate(card.createdAt)}</p>
    </article>
    </CardContextMenuWrapper>
  );
}


type EmptyStateProps = {
  message: string;
  showOnboarding?: boolean;
};

function EmptyState({ message, showOnboarding = false }: EmptyStateProps) {
  if (showOnboarding) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-950/50 p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
          <span className="text-3xl" aria-hidden="true">🐾</span>
        </div>
        <h3 className="text-lg font-semibold text-gray-200 mb-2">Welcome to Pawkit!</h3>
        <p className="text-sm text-gray-400 mb-4 max-w-md mx-auto">
          Start building your collection by saving links, articles, and notes. Use the search bar above to paste a URL, or install the browser extension for one-click saving.
        </p>
        <div className="flex flex-wrap justify-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-800/50">
            <span>📎</span> Paste URL above
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-800/50">
            <span>🔌</span> Use browser extension
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-800/50">
            <span>📝</span> Create a note
          </span>
        </div>
      </div>
    );
  }
  return <p className="rounded border border-dashed border-gray-800 bg-gray-950 p-6 text-sm text-gray-500">{message}</p>;
}

function formatDate(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}
