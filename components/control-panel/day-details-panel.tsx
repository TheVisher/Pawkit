"use client";

import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { format } from "date-fns";
import { useDataStore } from "@/lib/stores/data-store";
import { useToastStore } from "@/lib/stores/toast-store";
import { useCalendarStore } from "@/lib/hooks/use-calendar-store";
import { useEventStore } from "@/lib/hooks/use-event-store";
import { usePanelStore } from "@/lib/hooks/use-panel-store";
import { generateDailyNoteTitle, generateDailyNoteContent } from "@/lib/utils/daily-notes";
import { getHolidayForDate } from "@/lib/data/us-holidays";
import { CalendarIcon, X, Plus, Clock, MapPin, Trash2, Flag } from "lucide-react";
import { GlowButton } from "@/components/ui/glow-button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Image from "next/image";
import { AddEventModal } from "@/components/modals/add-event-modal";
import { DeleteEventModal } from "@/components/modals/delete-event-modal";
import { EditRecurringModal } from "@/components/modals/edit-recurring-modal";
import { CalendarEvent, EVENT_COLORS } from "@/lib/types/calendar";

import { CalendarRange } from "lucide-react";
import { differenceInDays } from "date-fns";

// Helper to format time in 12-hour format
function formatTime12h(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// Helper to strip markdown syntax for preview text
function stripMarkdown(text: string): string {
  return text
    .replace(/^#+\s+/gm, '')           // Remove headings
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
    .replace(/\*([^*]+)\*/g, '$1')     // Remove italic
    .replace(/`([^`]+)`/g, '$1')       // Remove inline code
    .replace(/^[-*]\s+\[\s*[x ]?\s*\]\s*/gm, '') // Remove checkbox markers
    .replace(/^[-*]\s+/gm, '')         // Remove list markers
    .replace(/^>\s+/gm, '')            // Remove blockquotes
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
    .replace(/#\w+/g, '')              // Remove hashtags
    .replace(/\n{2,}/g, ' ')           // Collapse multiple newlines
    .replace(/\n/g, ' ')               // Replace newlines with spaces
    .trim();
}

// Helper to get multi-day event info for the current date
function getMultiDayInfo(event: CalendarEvent, currentDate: Date): { dayNumber: number; totalDays: number } | null {
  if (!event.endDate || event.endDate === event.date) return null;

  const startDate = new Date(event.date + 'T00:00:00');
  const endDate = new Date(event.endDate + 'T00:00:00');
  const totalDays = differenceInDays(endDate, startDate) + 1;
  const dayNumber = differenceInDays(currentDate, startDate) + 1;

  return { dayNumber, totalDays };
}

export function DayDetailsPanel() {
  const { cards, addCard } = useDataStore();
  const { events, isInitialized, initialize, deleteEvent, excludeDateFromRecurrence, createExceptionInstance, generateRecurrenceInstances } = useEventStore();
  const selectedDay = useCalendarStore((state) => state.selectedDay);
  const setSelectedDay = useCalendarStore((state) => state.setSelectedDay);
  const showHolidays = useCalendarStore((state) => state.showHolidays);
  const holidayFilter = useCalendarStore((state) => state.holidayFilter);
  const openCalendarControls = usePanelStore((state) => state.openCalendarControls);
  const openCardDetails = usePanelStore((state) => state.openCardDetails);
  const setActiveCardId = usePanelStore((state) => state.setActiveCardId);

  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null);
  const [showEditRecurringModal, setShowEditRecurringModal] = useState(false);
  const [eventToEditRecurring, setEventToEditRecurring] = useState<CalendarEvent | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Track if component is mounted (for portal rendering)
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Initialize event store
  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  // Get cards scheduled for the selected date
  const scheduledCards = useMemo(() => {
    if (!selectedDay) return [];
    const dateStr = selectedDay.toISOString().split('T')[0];
    return cards.filter(card =>
      card.scheduledDate &&
      card.scheduledDate.split('T')[0] === dateStr &&
      !card.collections?.includes('the-den')
    );
  }, [selectedDay, cards]);

  // Get daily note for the selected date
  const dailyNote = useMemo(() => {
    if (!selectedDay) return null;
    const title = generateDailyNoteTitle(selectedDay);
    return cards.find(c => c.title === title && !c.collections?.includes('the-den'));
  }, [selectedDay, cards]);

  // Get holiday for the selected date
  const holiday = useMemo(() => {
    if (!selectedDay || !showHolidays) return null;
    const dateStr = format(selectedDay, 'yyyy-MM-dd');
    return getHolidayForDate(dateStr, holidayFilter);
  }, [selectedDay, showHolidays, holidayFilter]);

  // Get events for the selected date (including recurring event instances)
  const dayEvents = useMemo(() => {
    if (!selectedDay) return [];
    const dateStr = format(selectedDay, 'yyyy-MM-dd');

    // Collect events that occur on this day (including recurrence instances)
    const eventsOnDay: CalendarEvent[] = [];

    events.forEach((event) => {
      // Generate recurrence instances for just this day
      const instances = generateRecurrenceInstances(event, dateStr, dateStr);
      instances.forEach((instance) => {
        if (instance.instanceDate === dateStr) {
          eventsOnDay.push(instance.event);
        }
      });
    });

    // Sort: all-day events first, then by start time
    return eventsOnDay.sort((a, b) => {
      if (a.isAllDay && !b.isAllDay) return -1;
      if (!a.isAllDay && b.isAllDay) return 1;
      if (a.startTime && b.startTime) {
        return a.startTime.localeCompare(b.startTime);
      }
      return 0;
    });
  }, [selectedDay, events, generateRecurrenceInstances]);

  const handleCreateDailyNote = async () => {
    if (!selectedDay) return;

    const title = generateDailyNoteTitle(selectedDay);
    const content = generateDailyNoteContent(selectedDay);

    try {
      await addCard({
        type: 'md-note',
        title,
        content,
        tags: ['daily'],
        collections: []
      });
      const { useToastStore } = await import("@/lib/stores/toast-store");
      useToastStore.getState().success("Daily note created");

      // Find and open the newly created card
      const dataStore = useDataStore.getState();
      const newCard = dataStore.cards.find(c => c.title === title);
      if (newCard) {
        openCardDetails(newCard.id);
      }
    } catch (error) {
    }
  };

  const handleClose = () => {
    setSelectedDay(null);
    openCalendarControls();
  };

  const handleAddEvent = () => {
    setEditingEvent(null);
    setShowAddEventModal(true);
  };

  const handleEventClick = (event: CalendarEvent) => {
    // If event has a linked card, check if card still exists
    if (event.source?.cardId) {
      const card = cards.find(c => c.id === event.source?.cardId && !c.deleted);
      if (card) {
        setActiveCardId(event.source.cardId);
      } else {
        // Card was deleted - show toast with option to open URL if available
        const eventUrl = event.url;
        if (eventUrl) {
          useToastStore.getState().withAction(
            "The linked bookmark was deleted",
            {
              label: "Open URL",
              onClick: () => window.open(eventUrl, '_blank')
            },
            "info"
          );
        } else {
          useToastStore.getState().info("The linked bookmark was deleted");
        }
      }
      return;
    }

    // If event has a URL but no linked card, open the URL
    if (event.url) {
      window.open(event.url, '_blank');
      return;
    }

    // Otherwise, open the event edit modal
    handleEditEvent(event);
  };

  const handleEditEvent = (event: CalendarEvent) => {
    // If event is recurring, show the edit recurring modal first
    if (event.recurrence) {
      setEventToEditRecurring(event);
      setShowEditRecurringModal(true);
    } else {
      // Non-recurring events go straight to edit modal
      setEditingEvent(event);
      setShowAddEventModal(true);
    }
  };

  const handleEditThisInstance = async () => {
    if (!eventToEditRecurring || !selectedDay) return;

    const dateStr = format(selectedDay, 'yyyy-MM-dd');

    try {
      // Create an exception instance for this date
      const exceptionEvent = await createExceptionInstance(eventToEditRecurring, dateStr);
      if (exceptionEvent) {
        // Close the recurring modal and open the edit modal with the exception
        setShowEditRecurringModal(false);
        setEventToEditRecurring(null);
        setEditingEvent(exceptionEvent);
        setShowAddEventModal(true);
      }
    } catch (error) {
      console.error('Failed to create exception instance:', error);
    }
  };

  const handleEditAllInstances = () => {
    if (!eventToEditRecurring) return;

    // Close the recurring modal and open the edit modal with the parent event
    setShowEditRecurringModal(false);
    setEditingEvent(eventToEditRecurring);
    setEventToEditRecurring(null);
    setShowAddEventModal(true);
  };

  const handleCloseEditRecurringModal = () => {
    setShowEditRecurringModal(false);
    setEventToEditRecurring(null);
  };

  const handleDeleteEvent = (event: CalendarEvent) => {
    setEventToDelete(event);
    setShowDeleteModal(true);
  };

  const handleDeleteThisInstance = async () => {
    if (!eventToDelete || !selectedDay) return;

    const dateStr = format(selectedDay, 'yyyy-MM-dd');

    try {
      await excludeDateFromRecurrence(eventToDelete.id, dateStr);
      const { useToastStore } = await import("@/lib/stores/toast-store");
      useToastStore.getState().success("Event instance deleted");
    } catch (error) {
      console.error('Failed to delete event instance:', error);
    }
  };

  const handleDeleteAllInstances = async () => {
    if (!eventToDelete) return;

    try {
      await deleteEvent(eventToDelete.id);
      const { useToastStore } = await import("@/lib/stores/toast-store");
      useToastStore.getState().success("Event series deleted");
    } catch (error) {
      console.error('Failed to delete event series:', error);
    }
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setEventToDelete(null);
  };

  const handleCloseModal = () => {
    setShowAddEventModal(false);
    setEditingEvent(null);
  };

  if (!selectedDay) {
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pt-0 pb-10 space-y-4">
        {/* Box 1: Date Header, Holiday, Add Event, Events */}
        <div
          className="p-4 rounded-xl"
          style={{
            background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
            boxShadow: 'var(--raised-shadow-sm)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--border-subtle)',
            borderTopColor: 'var(--raised-border-top)',
          }}
        >
          {/* Date Header with Close Button */}
          <div className="flex items-start gap-3 mb-1">
            <CalendarIcon size={20} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--ds-accent)' }} />
            <h2 className="text-lg font-semibold flex-1" style={{ color: 'var(--text-primary)' }}>
              {selectedDay.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </h2>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleClose}
                    className="p-1.5 rounded-lg transition-all duration-200 flex-shrink-0"
                    style={{
                      background: 'var(--bg-surface-2)',
                      color: 'var(--text-muted)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-surface-3)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg-surface-2)';
                      e.currentTarget.style.color = 'var(--text-muted)';
                    }}
                  >
                    <X size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Close daily view</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-sm ml-8 mb-3" style={{ color: 'var(--text-muted)' }}>
            {dayEvents.length + scheduledCards.length + (dailyNote ? 1 : 0)} item(s) for this day
          </p>

          {/* Events container with consistent gap spacing */}
          <div className="flex flex-col gap-3">
            {/* Add Event Button - Always at top */}
            <button
              onClick={handleAddEvent}
              className="w-full px-4 py-2.5 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm font-medium"
              style={{
                background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
                boxShadow: 'var(--raised-shadow-sm)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'var(--border-subtle)',
                borderTopColor: 'var(--raised-border-top)',
                color: 'var(--text-secondary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = 'var(--raised-shadow)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'var(--raised-shadow-sm)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <Plus size={16} />
              Add Event
            </button>

            {/* Holiday - nested raised card */}
            {holiday && (
              <div
                className="p-3 rounded-lg transition-all"
              style={{
                background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
                boxShadow: 'var(--raised-shadow-sm)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'var(--border-subtle)',
                borderTopColor: 'var(--raised-border-top)',
              }}
            >
              <div className="flex items-center gap-3">
                <Flag size={18} className="flex-shrink-0" style={{ color: 'var(--ds-accent)' }} />
                <div>
                  <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{holiday.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {holiday.type === 'major' ? 'US Federal Holiday' : 'US Observance'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Events List */}
          {dayEvents.length > 0 && (
            <div className="space-y-2">
              {dayEvents.map((event) => {
                const multiDayInfo = selectedDay ? getMultiDayInfo(event, selectedDay) : null;
                return (
                <div
                  key={event.id}
                  className="p-3 rounded-lg transition-all duration-200 group"
                  style={{
                    background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
                    boxShadow: 'var(--raised-shadow-sm)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: 'var(--border-subtle)',
                    borderTopColor: 'var(--raised-border-top)',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                      style={{ backgroundColor: event.color || EVENT_COLORS.purple }}
                    />
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => handleEventClick(event)}
                        className="text-left w-full"
                      >
                        <div className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                          {event.title}
                        </div>
                        {/* Multi-day event indicator */}
                        {multiDayInfo && (
                          <div className="text-xs flex items-center gap-1 mt-1" style={{ color: 'var(--ds-accent)' }}>
                            <CalendarRange size={10} />
                            Day {multiDayInfo.dayNumber} of {multiDayInfo.totalDays}
                          </div>
                        )}
                        {!event.isAllDay && event.startTime && (
                          <div className="text-sm flex items-center gap-1 mt-1" style={{ color: 'var(--text-muted)' }}>
                            <Clock size={12} />
                            {formatTime12h(event.startTime)}
                            {event.endTime && ` - ${formatTime12h(event.endTime)}`}
                          </div>
                        )}
                        {event.location && (
                          <div className="text-sm flex items-center gap-1 mt-1" style={{ color: 'var(--text-muted)' }}>
                            <MapPin size={12} />
                            {event.location}
                          </div>
                        )}
                        {event.description && (
                          <div className="text-sm mt-1 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                            {event.description}
                          </div>
                        )}
                      </button>
                    </div>
                    <button
                      onClick={() => handleDeleteEvent(event)}
                      className="p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                        e.currentTarget.style.color = 'rgb(248, 113, 113)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--text-muted)';
                      }}
                      title="Delete event"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
              })}
            </div>
          )}
          </div>
        </div>

        {/* Box 2: Daily Note */}
        <div
          className="p-4 rounded-xl"
          style={{
            background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
            boxShadow: 'var(--raised-shadow-sm)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--border-subtle)',
            borderTopColor: 'var(--raised-border-top)',
          }}
        >
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <CalendarIcon size={16} style={{ color: 'var(--ds-accent)' }} />
            Daily Note
          </h3>
          {dailyNote ? (
            <button
              onClick={() => openCardDetails(dailyNote.id)}
              className="w-full text-left p-3 rounded-lg transition-all duration-200"
              style={{
                background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
                boxShadow: 'var(--raised-shadow-sm)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'var(--border-subtle)',
                borderTopColor: 'var(--raised-border-top)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = 'var(--raised-shadow)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'var(--raised-shadow-sm)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>{dailyNote.title}</div>
                  <div className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                    {dailyNote.content ? stripMarkdown(dailyNote.content).substring(0, 100) : 'No content yet'}
                  </div>
                </div>
                <div className="ml-2" style={{ color: 'var(--text-muted)' }}>→</div>
              </div>
            </button>
          ) : (
            <button
              onClick={handleCreateDailyNote}
              className="w-full text-left p-3 rounded-lg transition-all duration-200 flex items-center gap-2"
              style={{
                background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
                boxShadow: 'var(--raised-shadow-sm)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'var(--border-subtle)',
                borderTopColor: 'var(--raised-border-top)',
                color: 'var(--text-secondary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = 'var(--raised-shadow)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'var(--raised-shadow-sm)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <Plus size={16} />
              <span className="text-sm">Create daily note for this day</span>
            </button>
          )}
        </div>

        {/* Box 2: Scheduled Cards */}
        <div
          className="p-4 rounded-xl"
          style={{
            background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
            boxShadow: 'var(--raised-shadow-sm)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--border-subtle)',
            borderTopColor: 'var(--raised-border-top)',
          }}
        >
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            Scheduled Cards ({scheduledCards.length})
          </h3>
          {scheduledCards.length > 0 ? (
            <div className="space-y-2">
              {scheduledCards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => openCardDetails(card.id)}
                  className="w-full text-left p-3 rounded-lg transition-all duration-200 flex items-center gap-3"
                  style={{
                    background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
                    boxShadow: 'var(--raised-shadow-sm)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: 'var(--border-subtle)',
                    borderTopColor: 'var(--raised-border-top)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = 'var(--raised-shadow)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'var(--raised-shadow-sm)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {card.image && (
                    <div className="relative w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden">
                      <Image
                        src={card.image}
                        alt=""
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                      {card.title || card.domain || card.url}
                    </div>
                    <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                      {card.domain || card.url}
                    </div>
                  </div>
                  <div style={{ color: 'var(--text-muted)' }}>→</div>
                </button>
              ))}
            </div>
          ) : (
            <div
              className="text-sm text-center py-6 rounded-lg"
              style={{
                color: 'var(--text-muted)',
                background: 'var(--bg-surface-1)',
                boxShadow: 'var(--inset-shadow)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              No cards scheduled for this day
            </div>
          )}
        </div>
      </div>

      {/* Add Event Modal - Rendered via portal */}
      {isMounted && showAddEventModal && createPortal(
        <AddEventModal
          open={showAddEventModal}
          onClose={handleCloseModal}
          scheduledDate={selectedDay}
          editingEvent={editingEvent}
        />,
        document.body
      )}

      {/* Delete Event Modal - Rendered via portal */}
      {isMounted && showDeleteModal && eventToDelete && createPortal(
        <DeleteEventModal
          open={showDeleteModal}
          onClose={handleCloseDeleteModal}
          event={eventToDelete}
          instanceDate={selectedDay ? format(selectedDay, 'yyyy-MM-dd') : undefined}
          onDeleteThis={handleDeleteThisInstance}
          onDeleteAll={handleDeleteAllInstances}
        />,
        document.body
      )}

      {/* Edit Recurring Event Modal - Rendered via portal */}
      {isMounted && showEditRecurringModal && eventToEditRecurring && createPortal(
        <EditRecurringModal
          open={showEditRecurringModal}
          onClose={handleCloseEditRecurringModal}
          event={eventToEditRecurring}
          instanceDate={selectedDay ? format(selectedDay, 'yyyy-MM-dd') : undefined}
          onEditThis={handleEditThisInstance}
          onEditAll={handleEditAllInstances}
        />,
        document.body
      )}
    </div>
  );
}
