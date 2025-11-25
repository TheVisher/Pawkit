"use client";

import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { format } from "date-fns";
import { useDataStore } from "@/lib/stores/data-store";
import { useCalendarStore } from "@/lib/hooks/use-calendar-store";
import { useEventStore } from "@/lib/hooks/use-event-store";
import { usePanelStore } from "@/lib/hooks/use-panel-store";
import { generateDailyNoteTitle, generateDailyNoteContent } from "@/lib/utils/daily-notes";
import { CalendarIcon, X, Plus, Clock, MapPin, Trash2 } from "lucide-react";
import { GlowButton } from "@/components/ui/glow-button";
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
  const openCalendarControls = usePanelStore((state) => state.openCalendarControls);
  const openCardDetails = usePanelStore((state) => state.openCardDetails);

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
    <div className="flex flex-col h-full -my-6">
      {/* Close Button at Top - Centered Pill */}
      <div className="flex justify-center py-4 border-b border-white/10">
        <button
          onClick={handleClose}
          className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10
            border border-white/10 hover:border-white/20
            transition-all duration-200 flex items-center gap-2
            text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <X size={16} />
          Close Daily View
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {/* Date Header */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-1">
            {selectedDay.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
          </h2>
          <p className="text-sm text-muted-foreground">
            {dayEvents.length + scheduledCards.length + (dailyNote ? 1 : 0)} item(s) for this day
          </p>
        </div>

        {/* Daily Note Section */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <CalendarIcon size={16} className="text-accent" />
            Daily Note
          </h3>
          {dailyNote ? (
            <button
              onClick={() => openCardDetails(dailyNote.id)}
              className="w-full text-left p-4 rounded-xl bg-purple-500/10 border border-purple-500/30
                hover:bg-purple-500/20 hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]
                transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-purple-200 truncate">{dailyNote.title}</div>
                  <div className="text-sm text-purple-300/70 mt-1 line-clamp-2">
                    {dailyNote.content?.substring(0, 100)}...
                  </div>
                </div>
                <div className="text-purple-300 ml-2">→</div>
              </div>
            </button>
          ) : (
            <button
              onClick={handleCreateDailyNote}
              className="w-full text-left p-4 rounded-xl bg-white/5 border border-white/10
                hover:bg-white/10 hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]
                transition-all duration-200 flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <Plus size={16} />
              <span>Create daily note for this day</span>
            </button>
          )}
        </div>

        {/* Calendar Events Section */}
        {dayEvents.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <CalendarIcon size={16} className="text-accent" />
              Events ({dayEvents.length})
            </h3>
            <div className="space-y-2">
              {dayEvents.map((event) => {
                const multiDayInfo = selectedDay ? getMultiDayInfo(event, selectedDay) : null;
                return (
                <div
                  key={event.id}
                  className="p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10
                    transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                      style={{ backgroundColor: event.color || EVENT_COLORS.purple }}
                    />
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => handleEditEvent(event)}
                        className="text-left w-full"
                      >
                        <div className="font-medium text-foreground truncate">
                          {event.title}
                        </div>
                        {/* Multi-day event indicator */}
                        {multiDayInfo && (
                          <div className="text-xs text-accent flex items-center gap-1 mt-1">
                            <CalendarRange size={10} />
                            Day {multiDayInfo.dayNumber} of {multiDayInfo.totalDays}
                          </div>
                        )}
                        {!event.isAllDay && event.startTime && (
                          <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <Clock size={12} />
                            {formatTime12h(event.startTime)}
                            {event.endTime && ` - ${formatTime12h(event.endTime)}`}
                          </div>
                        )}
                        {event.location && (
                          <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin size={12} />
                            {event.location}
                          </div>
                        )}
                        {event.description && (
                          <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {event.description}
                          </div>
                        )}
                      </button>
                    </div>
                    <button
                      onClick={() => handleDeleteEvent(event)}
                      className="p-1.5 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400
                        opacity-0 group-hover:opacity-100 transition-all"
                      title="Delete event"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
              })}
            </div>
          </div>
        )}

        {/* Scheduled Cards Section */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Scheduled Cards ({scheduledCards.length})
          </h3>
          {scheduledCards.length > 0 ? (
            <div className="space-y-2">
              {scheduledCards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => openCardDetails(card.id)}
                  className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10
                    transition-colors border border-white/10 hover:border-white/20
                    flex items-center gap-3"
                >
                  {card.image && (
                    <div className="relative w-12 h-12 flex-shrink-0 rounded overflow-hidden">
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
            <div className="text-sm text-muted-foreground text-center py-8 border border-dashed border-white/10 rounded-lg">
              No cards scheduled for this day
            </div>
          )}
        </div>

        {/* Add Event Button */}
        <div className="pt-4 border-t border-white/10">
          <button
            onClick={handleAddEvent}
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10
              hover:bg-white/10 hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]
              transition-all duration-200 flex items-center justify-center gap-2
              text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <Plus size={16} />
            Add Event
          </button>
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
