"use client";

import { useMemo } from "react";
import { useDataStore } from "@/lib/stores/data-store";
import { useTodoStore, groupTodosByCategory } from "@/lib/hooks/use-todos";
import { useEventStore } from "@/lib/hooks/use-event-store";
import { useCalendarStore } from "@/lib/hooks/use-calendar-store";
import { CardModel, CollectionNode } from "@/lib/types";
import { CalendarEvent } from "@/lib/types/calendar";
import { format, startOfWeek, endOfWeek, addDays, isToday, startOfDay, endOfDay } from "date-fns";
import { isDailyNote, extractDateFromTitle, getDateString } from "@/lib/utils/daily-notes";

export interface WeekDay {
  date: Date;
  dateStr: string;
  dayName: string;
  dayNumber: number;
  isToday: boolean;
  items: CardModel[];
  events: CalendarEvent[];
  dailyNote: CardModel | undefined;
}

export interface PinnedPawkit extends CollectionNode {
  count: number;
  previewItems: CardModel[];
}

export function useHomeData() {
  // Core data from stores
  const { cards, collections } = useDataStore();
  const { todos } = useTodoStore();
  const { events, generateRecurrenceInstances } = useEventStore();
  const weekStartsOn = useCalendarStore((state) => state.weekStartsOn);

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

  // Filter out deleted and private cards
  const activeCards = useMemo(() => {
    if (!cards || !Array.isArray(cards)) return [];
    return cards.filter(c => {
      if (c.deleted === true) return false;
      const isInPrivateCollection = c.collections?.some(collectionId =>
        privateCollectionIds.has(collectionId)
      );
      return !isInPrivateCollection;
    });
  }, [cards, privateCollectionIds]);

  // Inbox items: unorganized cards (no tags, no collections, not scheduled)
  const inboxItems = useMemo(() => {
    return activeCards.filter(card => {
      const hasNoCollections = !card.collections || card.collections.length === 0;
      const hasNoTags = !card.tags || card.tags.length === 0;
      const isNotScheduled = !card.scheduledDate;
      const isUrl = card.type === 'url';
      return hasNoCollections && hasNoTags && isNotScheduled && isUrl;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [activeCards]);

  // Recent items (most recently created)
  const recentItems = useMemo(() => {
    return [...activeCards]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);
  }, [activeCards]);

  // Pinned cards
  const pinnedCards = useMemo(() => {
    return activeCards.filter(c => c.pinned).slice(0, 8);
  }, [activeCards]);

  // Pinned pawkits with preview items
  const pinnedPawkits = useMemo((): PinnedPawkit[] => {
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
      .slice(0, 6)
      .map(c => {
        const pawkitCards = activeCards.filter(card =>
          card.collections?.includes(c.slug)
        );
        return {
          ...c,
          count: pawkitCards.length,
          previewItems: pawkitCards.filter(card => card.image).slice(0, 2)
        };
      });
  }, [collections, activeCards]);

  // Get current week days
  const weekDays = useMemo((): WeekDay[] => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn });

    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      const dateStr = format(date, 'yyyy-MM-dd');

      // Get cards scheduled for this day
      const dayCards = activeCards.filter(card =>
        card.scheduledDate &&
        card.scheduledDate.split('T')[0] === dateStr &&
        !card.collections?.includes('the-den')
      );

      // Get events for this day
      const dayEvents = events.flatMap(event => {
        const instances = generateRecurrenceInstances(event, dateStr, dateStr);
        return instances.map(inst => inst.event);
      });

      // Get daily note for this day
      const dailyNote = activeCards.find(card => {
        if (!isDailyNote(card)) return false;
        const noteDate = extractDateFromTitle(card.title!);
        const noteDateStr = noteDate ? getDateString(noteDate) : null;
        return noteDateStr === dateStr;
      });

      return {
        date,
        dateStr,
        dayName: format(date, 'EEE'),
        dayNumber: parseInt(format(date, 'd')),
        isToday: isToday(date),
        items: dayCards,
        events: dayEvents,
        dailyNote,
      };
    });
  }, [activeCards, events, generateRecurrenceInstances, weekStartsOn]);

  // Today's data
  const today = useMemo(() => {
    const todayDate = new Date();
    const todayStr = format(todayDate, 'yyyy-MM-dd');

    // Today's events
    const todayEvents = events.flatMap(event => {
      const instances = generateRecurrenceInstances(event, todayStr, todayStr);
      return instances.map(inst => inst.event);
    }).sort((a, b) => {
      if (a.isAllDay && !b.isAllDay) return -1;
      if (!a.isAllDay && b.isAllDay) return 1;
      if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
      return 0;
    });

    // Cards scheduled for today
    const scheduledForToday = activeCards.filter(c =>
      c.scheduledDate && c.scheduledDate.split('T')[0] === todayStr
    );

    // Today's daily note
    const dailyNote = activeCards.find(card => {
      if (!isDailyNote(card)) return false;
      const noteDate = extractDateFromTitle(card.title!);
      const noteDateStr = noteDate ? getDateString(noteDate) : null;
      return noteDateStr === todayStr;
    });

    return {
      date: todayDate,
      dateStr: todayStr,
      events: todayEvents,
      scheduledCards: scheduledForToday,
      dailyNote,
    };
  }, [activeCards, events, generateRecurrenceInstances]);

  // Grouped todos
  const groupedTodos = useMemo(() => groupTodosByCategory(todos), [todos]);

  // This week stats
  const thisWeekStats = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn });
    const weekEnd = endOfWeek(now, { weekStartsOn });

    const savedThisWeek = activeCards.filter(c => {
      const createdAt = new Date(c.createdAt);
      return createdAt >= weekStart && createdAt <= weekEnd;
    }).length;

    // Processed = cards with tags or collections created this week
    const processedThisWeek = activeCards.filter(c => {
      const createdAt = new Date(c.createdAt);
      const wasCreatedThisWeek = createdAt >= weekStart && createdAt <= weekEnd;
      const hasOrganization = (c.tags && c.tags.length > 0) || (c.collections && c.collections.length > 0);
      return wasCreatedThisWeek && hasOrganization;
    }).length;

    return { savedThisWeek, processedThisWeek };
  }, [activeCards, weekStartsOn]);

  // On This Day - items from exactly 1 year ago
  const onThisDayItem = useMemo(() => {
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const dayStart = startOfDay(oneYearAgo);
    const dayEnd = endOfDay(oneYearAgo);

    return activeCards.find(c => {
      const created = new Date(c.createdAt);
      return created >= dayStart && created <= dayEnd;
    });
  }, [activeCards]);

  // Continue reading - recently opened items (using lastViewed if available, otherwise most recent)
  const continueItems = useMemo(() => {
    // For now, return recent items that have been created more than a day ago
    // In future, this should track lastOpenedAt
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    return activeCards
      .filter(c => c.type === 'url' && new Date(c.createdAt) < oneDayAgo)
      .slice(0, 3);
  }, [activeCards]);

  // Rediscover - items from 2+ months ago
  const rediscoverItems = useMemo(() => {
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    return activeCards.filter(c => new Date(c.createdAt) < twoMonthsAgo);
  }, [activeCards]);

  return {
    // Core data
    cards: activeCards,
    collections,
    todos,
    groupedTodos,

    // Computed views
    inboxItems,
    inboxCount: inboxItems.length,
    recentItems,
    pinnedCards,
    pinnedPawkits,
    weekDays,
    today,
    thisWeekStats,
    onThisDayItem,
    continueItems,
    rediscoverItems,
    rediscoverCount: rediscoverItems.length,
  };
}
