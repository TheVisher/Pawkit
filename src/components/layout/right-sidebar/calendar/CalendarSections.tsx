"use client";

import {
  Calendar as CalendarIcon,
  CheckSquare,
  Clock,
  Settings,
  Layers,
  CalendarDays,
  Check,
  Plus,
  AlertTriangle,
} from "lucide-react";
import { SidebarSection } from "../SidebarSection";
import { Calendar } from "@/components/ui/calendar"; // Assuming standard UI calendar exists
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { DayButton, getDefaultClassNames } from "react-day-picker";
import { useCalendarStore } from "@/lib/stores/calendar-store";
import {
  useCalendarEvents,
  useCards,
  useMutations,
} from "@/lib/contexts/convex-data-context";
import { useModalStore } from "@/lib/stores/modal-store";
import { useCurrentWorkspace } from "@/lib/stores/workspace-store";
import {
  parseTaskItemsFromCard,
  toggleTaskInContent,
  addTaskToContent,
  createInitialTodoContent,
  isTaskFromToday,
  isDateHeaderOverdue,
  isDateHeaderToday,
  type TaskItem,
} from "@/lib/utils/parse-task-items";
import {
  format,
  isToday,
  isTomorrow,
  startOfDay,
  addDays,
  parseISO,
  compareAsc,
  isBefore,
  isAfter,
} from "date-fns";
import { expandRecurringEvents } from "@/lib/utils/expand-recurring-events";
import type { Id } from "@/lib/types/convex";

// --- Shared Components ---

// Custom DayButton to override the hardcoded bg-primary in shadcn's default implementation
function CustomDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames();
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  // Determine styling based on state
  const isToday = modifiers.today;
  const isSelected = modifiers.selected;

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        isSelected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      className={cn(
        "h-9 w-full p-0 font-normal aspect-square rounded-md border border-transparent transition-all",
        // Default hover
        "hover:bg-bg-surface-3 hover:text-text-primary focus:bg-bg-surface-3 focus:text-text-primary",

        // Today Styling (Purple Translucent)
        isToday &&
          "bg-[var(--color-accent)]/10 text-[var(--color-accent)] border-[var(--color-accent)]/20 hover:bg-[var(--color-accent)]/20 hover:text-[var(--color-accent)] font-medium",

        // Selected Styling (White bg with Purple Border) - Overrides today if both are true? Or combines?
        // If selected AND today: Keep purple bg, add stronger border?
        // Let's make Selected distinct:
        isSelected &&
          !isToday &&
          "bg-white/10 border-[var(--color-accent)] text-text-primary",
        isSelected &&
          isToday &&
          "ring-2 ring-[var(--color-accent)] ring-offset-1 ring-offset-bg-surface-1", // Focus ring effect for today+selected

        defaultClassNames.day,
        className,
      )}
      {...props}
    />
  );
}

// 1. Mini Calendar (Navigator)
export function MiniCalendar() {
  const { currentDate, setDate } = useCalendarStore();

  return (
    <div className="p-2">
      <Calendar
        mode="single"
        selected={currentDate}
        onSelect={(nextDate) => {
          if (nextDate) {
            setDate(nextDate);
          }
        }}
        components={{ DayButton: CustomDayButton }}
        className="rounded-md border border-border-subtle bg-bg-surface-2 w-full"
        classNames={{
          root: "w-full flex justify-center",
          month: "space-y-4 w-full flex flex-col items-center",
          table: "w-full border-collapse space-y-1 max-w-[280px] mx-auto",
          head_row: "grid grid-cols-7 w-full",
          row: "grid grid-cols-7 w-full mt-2",
          head_cell:
            "text-muted-foreground rounded-md w-full font-normal text-[0.8rem]",
          cell: "text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
          day: "", // Empty to prevent double application of styles
        }}
      />
    </div>
  );
}

interface SidebarTaskItemProps {
  task: TaskItem;
  onToggle: (task: TaskItem, checked: boolean) => void;
  onClick: () => void;
}

function SidebarTaskItem({ task, onToggle, onClick }: SidebarTaskItemProps) {
  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(task, !task.checked);
  };

  return (
    <div
      className={cn(
        "group flex items-start gap-2 py-1 px-1.5 rounded-lg transition-colors",
        "hover:bg-bg-surface-3/50",
      )}
    >
      <button
        onClick={handleCheckboxClick}
        className={cn(
          "mt-0.5 shrink-0 w-4 h-4 rounded border transition-colors flex items-center justify-center",
          task.checked
            ? "bg-[var(--color-accent)] border-[var(--color-accent)]"
            : "border-text-muted/40 hover:border-[var(--color-accent)]",
        )}
      >
        {task.checked && <Check className="w-3 h-3 text-white" />}
      </button>
      <button onClick={onClick} className="flex-1 min-w-0 text-left">
        <p
          className={cn(
            "text-xs text-text-primary truncate",
            task.checked && "line-through text-text-muted",
          )}
        >
          {task.text}
        </p>
        <p className="text-[10px] text-text-muted/70 truncate opacity-0 group-hover:opacity-100 transition-opacity">
          {task.cardTitle}
        </p>
      </button>
    </div>
  );
}

// 2. Task Inbox (Time Blocking)
export function TaskInbox() {
  const workspace = useCurrentWorkspace();
  const cards = useCards();
  const openCardDetail = useModalStore((s) => s.openCardDetail);
  const { updateCard, createCard } = useMutations();
  const [inputValue, setInputValue] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const todoCards = useMemo(() => {
    return cards.filter((card) => !card.deleted && card.tags?.includes("todo"));
  }, [cards]);

  const { overdueTasks, todayTasks, otherTasks, visibleTasks, totalIncomplete } =
    useMemo(() => {
      const overdue: TaskItem[] = [];
      const today: TaskItem[] = [];
      const other: TaskItem[] = [];

      for (const card of todoCards) {
        const tasks = parseTaskItemsFromCard(card);
        const visible = tasks.filter((task) => {
          if (!task.text.trim()) return false;
          if (!task.checked) return true;
          return isTaskFromToday(task);
        });

        for (const task of visible) {
          if (!task.checked && isDateHeaderOverdue(task.dateHeader)) {
            overdue.push(task);
          } else if (isDateHeaderToday(task.dateHeader)) {
            today.push(task);
          } else {
            other.push(task);
          }
        }
      }

      const sortTasks = (a: TaskItem, b: TaskItem) => {
        if (a.checked === b.checked) return 0;
        return a.checked ? 1 : -1;
      };

      overdue.sort(sortTasks);
      today.sort(sortTasks);
      other.sort(sortTasks);

      const all = [...overdue, ...today, ...other].slice(0, 10);

      const total = todoCards.reduce((count, card) => {
        const tasks = parseTaskItemsFromCard(card);
        return count + tasks.filter((task) => !task.checked && task.text.trim()).length;
      }, 0);

      return {
        overdueTasks: overdue,
        todayTasks: today,
        otherTasks: other,
        visibleTasks: all,
        totalIncomplete: total,
      };
    }, [todoCards]);

  const handleToggle = useCallback(
    async (task: TaskItem, checked: boolean) => {
      const card = cards.find((c) => c._id === task.cardId);
      if (!card || !card.content) return;
      const updatedContent = toggleTaskInContent(card.content, task.text, checked);
      await updateCard(card._id, { content: updatedContent });
    },
    [cards, updateCard],
  );

  const handleAddTask = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || isAdding) return;

    setIsAdding(true);
    try {
      const todoCard = todoCards[0];

      if (!todoCard && workspace?._id) {
        const content = addTaskToContent(createInitialTodoContent(), text);
        await createCard({
          workspaceId: workspace._id as Id<"workspaces">,
          type: "md-note",
          url: "",
          title: "Todos",
          content,
          tags: ["todo"],
          pinned: false,
          isFileCard: false,
        });
        setInputValue("");
        return;
      }

      if (todoCard) {
        const updatedContent = addTaskToContent(todoCard.content || "", text);
        await updateCard(todoCard._id, { content: updatedContent });
        setInputValue("");
      }
    } finally {
      setIsAdding(false);
    }
  }, [inputValue, isAdding, todoCards, workspace?._id, createCard, updateCard]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddTask();
    }
  };

  return (
    <SidebarSection title="Tasks" icon={CheckSquare} defaultOpen={true}>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a task..."
            disabled={isAdding}
            className={cn(
              "flex-1 bg-bg-surface-2 border border-border-subtle rounded px-2 py-1 text-xs",
              "focus:outline-none focus:border-[var(--color-accent)]/50",
              "disabled:opacity-60",
            )}
          />
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={handleAddTask}
            disabled={!inputValue.trim() || isAdding}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {visibleTasks.length > 0 ? (
          <div className="space-y-1">
            {overdueTasks.length > 0 && (
              <>
                <div className="flex items-center gap-1.5 py-1 px-1.5">
                  <AlertTriangle className="h-3 w-3 text-red-500" />
                  <span className="text-[11px] font-medium text-red-500">
                    Overdue ({overdueTasks.length})
                  </span>
                </div>
                {overdueTasks.slice(0, 5).map((task) => (
                  <SidebarTaskItem
                    key={task.id}
                    task={task}
                    onToggle={handleToggle}
                    onClick={() => openCardDetail(task.cardId)}
                  />
                ))}
              </>
            )}

            {todayTasks.length > 0 && (
              <>
                <div className="flex items-center gap-1.5 py-1 px-1.5">
                  <CalendarDays className="h-3 w-3 text-amber-500" />
                  <span className="text-[11px] font-medium text-amber-500">
                    Today
                  </span>
                </div>
                {todayTasks.slice(0, overdueTasks.length > 0 ? 3 : 5).map((task) => (
                  <SidebarTaskItem
                    key={task.id}
                    task={task}
                    onToggle={handleToggle}
                    onClick={() => openCardDetail(task.cardId)}
                  />
                ))}
              </>
            )}

            {otherTasks.length > 0 && overdueTasks.length === 0 && todayTasks.length === 0 && (
              <>
                {otherTasks.slice(0, 5).map((task) => (
                  <SidebarTaskItem
                    key={task.id}
                    task={task}
                    onToggle={handleToggle}
                    onClick={() => openCardDetail(task.cardId)}
                  />
                ))}
              </>
            )}

            {totalIncomplete > 10 && (
              <p className="text-[11px] text-text-muted text-center pt-1">
                +{totalIncomplete - 10} more
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-4">
            <CheckSquare className="h-6 w-6 text-text-muted/50 mb-1.5" />
            <p className="text-xs text-text-muted">All caught up!</p>
          </div>
        )}
      </div>
    </SidebarSection>
  );
}

// 3. Calendar Sources (Filters)
export function CalendarSources() {
  const [sources, setSources] = useState([
    { id: "work", label: "Work", color: "bg-red-500", visible: true },
    { id: "personal", label: "Personal", color: "bg-blue-500", visible: true },
    { id: "holidays", label: "Holidays", color: "bg-green-500", visible: true },
  ]);

  const toggleSource = (id: string) => {
    setSources(
      sources.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s)),
    );
  };

  return (
    <SidebarSection title="Calendars" icon={CalendarIcon} defaultOpen={true}>
      <div className="space-y-1">
        {sources.map((source) => (
          <button
            key={source.id}
            onClick={() => toggleSource(source.id)}
            className="flex items-center gap-2 w-full p-1.5 rounded hover:bg-bg-surface-2 transition-colors text-xs"
          >
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                source.color,
                !source.visible && "opacity-30",
              )}
            />
            <span
              className={cn(
                "flex-1 text-left",
                !source.visible && "text-text-muted line-through",
              )}
            >
              {source.label}
            </span>
          </button>
        ))}
      </div>
    </SidebarSection>
  );
}

// --- View Specific Components ---

// 4. Upcoming Events (Month View)
export function UpcomingEvents() {
  const today = startOfDay(new Date());
  const calendarEvents = useCalendarEvents();
  const cards = useCards();
  const openCardDetail = useModalStore((s) => s.openCardDetail);

  const { todayItems, upcomingItems } = useMemo(() => {
    const start = today;
    const end = addDays(start, 7);
    const items: Array<{
      id: string;
      title: string;
      dateKey: string;
      startTime?: string;
      isAllDay?: boolean;
      source?: { type?: string; cardId?: string };
    }> = [];

    const expandedEvents = expandRecurringEvents(calendarEvents, start, end);
    for (const event of expandedEvents) {
      const dateKey = event.occurrenceDate;
      const dateValue = startOfDay(parseISO(dateKey));
      if (isBefore(dateValue, start) || isAfter(dateValue, end)) continue;
      items.push({
        id: event.isOccurrence ? `${event._id}-${dateKey}` : event._id,
        title: event.title,
        dateKey,
        startTime: event.startTime,
        isAllDay: event.isAllDay,
        source: event.source as { type?: string; cardId?: string } | undefined,
      });
    }

    for (const card of cards) {
      if (card.deleted) continue;
      if (card.isDailyNote || card.tags?.includes("daily-note")) continue;
      if (!card.scheduledDates || card.scheduledDates.length === 0) continue;
      for (const scheduledDate of card.scheduledDates) {
        const dateValue = startOfDay(parseISO(scheduledDate));
        if (Number.isNaN(dateValue.getTime())) continue;
        if (isBefore(dateValue, start) || isAfter(dateValue, end)) continue;
        const dateKey = format(dateValue, "yyyy-MM-dd");
        items.push({
          id: `${card._id}-${dateKey}`,
          title: card.title || card.url || "Untitled",
          dateKey,
          startTime: card.scheduledStartTime,
          isAllDay: !card.scheduledStartTime,
          source: { type: "card", cardId: card._id },
        });
      }
    }

    items.sort((a, b) => {
      const dateCompare = compareAsc(parseISO(a.dateKey), parseISO(b.dateKey));
      if (dateCompare !== 0) return dateCompare;
      if (a.startTime && b.startTime) {
        return a.startTime.localeCompare(b.startTime);
      }
      if (a.startTime && !b.startTime) return -1;
      if (!a.startTime && b.startTime) return 1;
      return 0;
    });

    const todayKey = format(start, "yyyy-MM-dd");
    const todays = items.filter((item) => item.dateKey === todayKey);
    const upcoming = items.filter((item) => item.dateKey !== todayKey).slice(0, 6);

    return { todayItems: todays, upcomingItems: upcoming };
  }, [calendarEvents, cards, today]);

  return (
    <SidebarSection title="Upcoming" icon={Clock} defaultOpen={true}>
      <div className="space-y-2">
        {todayItems.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] font-medium text-text-muted uppercase tracking-wide px-1">
              Today
            </div>
            {todayItems.map((item) => (
              <UpcomingItem
                key={item.id}
                item={item}
                onOpenCard={openCardDetail}
              />
            ))}
          </div>
        )}

        {upcomingItems.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] font-medium text-text-muted uppercase tracking-wide px-1">
              Upcoming
            </div>
            {upcomingItems.map((item) => (
              <UpcomingItem
                key={item.id}
                item={item}
                onOpenCard={openCardDetail}
              />
            ))}
          </div>
        )}

        {todayItems.length === 0 && upcomingItems.length === 0 && (
          <p className="text-xs text-text-muted italic">
            No upcoming items
          </p>
        )}
      </div>
    </SidebarSection>
  );
}

function UpcomingItem({
  item,
  onOpenCard,
}: {
  item: {
    id: string;
    title: string;
    dateKey: string;
    startTime?: string;
    isAllDay?: boolean;
    source?: { type?: string; cardId?: string };
  };
  onOpenCard: (cardId: string) => void;
}) {
  const dateValue = startOfDay(parseISO(item.dateKey));
  const dateLabel = isToday(dateValue)
    ? "Today"
    : isTomorrow(dateValue)
      ? "Tomorrow"
      : format(dateValue, "EEE, MMM d");
  const timeLabel = item.isAllDay || !item.startTime ? "All day" : item.startTime;
  const canOpenCard = item.source?.type === "card" && !!item.source.cardId;

  const content = (
    <div className="flex flex-col gap-0.5 p-2 rounded bg-bg-surface-2 border border-border-subtle">
      <span className="text-xs font-medium text-text-primary">
        {item.title}
      </span>
      <div className="flex justify-between text-[10px] text-text-secondary">
        <span>{timeLabel}</span>
        <span>{dateLabel}</span>
      </div>
    </div>
  );

  if (canOpenCard) {
    return (
      <button
        onClick={() => onOpenCard(item.source!.cardId!)}
        className="w-full text-left"
      >
        {content}
      </button>
    );
  }

  return <div>{content}</div>;
}

// 5. Month Settings
export function MonthSettings() {
  const [showWeekends, setShowWeekends] = useState(true);

  return (
    <SidebarSection title="View Settings" icon={Settings}>
      <div className="flex items-center justify-between py-1">
        <span className="text-xs text-text-secondary">Show Weekends</span>
        {/* Simple Toggle - could use Switch component if available, using button for now */}
        <button
          onClick={() => setShowWeekends(!showWeekends)}
          className={cn(
            "w-8 h-4 rounded-full relative transition-colors",
            showWeekends ? "bg-[var(--color-accent)]" : "bg-bg-surface-3",
          )}
        >
          <div
            className={cn(
              "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform",
              showWeekends ? "left-4.5" : "left-0.5",
            )}
            style={{ left: showWeekends ? "calc(100% - 14px)" : "2px" }}
          />
        </button>
      </div>
    </SidebarSection>
  );
}

// 6. Time Grid Settings (Week/Day)
export function TimeGridSettings() {
  const [workHours, setWorkHours] = useState(true);
  const [density, setDensity] = useState(50);

  return (
    <SidebarSection title="Grid Settings" icon={Settings}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary">Work Hours Only</span>
          <button
            onClick={() => setWorkHours(!workHours)}
            className={cn(
              "w-8 h-4 rounded-full relative transition-colors",
              workHours ? "bg-[var(--color-accent)]" : "bg-bg-surface-3",
            )}
          >
            <div
              className={cn(
                "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform",
              )}
              style={{ left: workHours ? "calc(100% - 14px)" : "2px" }}
            />
          </button>
        </div>

        <div className="space-y-1">
          <span className="text-xs text-text-secondary">Grid Density</span>
          <input
            type="range"
            min="0"
            max="100"
            value={density}
            onChange={(e) => setDensity(Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[var(--color-accent)] bg-bg-surface-3"
          />
        </div>
      </div>
    </SidebarSection>
  );
}

// 7. Agenda Grouping
export function AgendaGrouping() {
  return (
    <SidebarSection title="Grouping" icon={Layers}>
      <div className="flex flex-col gap-1">
        {["Date", "Priority", "Calendar"].map((opt) => (
          <button
            key={opt}
            className="flex items-center gap-2 px-2 py-1.5 text-xs text-text-secondary hover:bg-bg-surface-2 rounded text-left"
          >
            {opt}
          </button>
        ))}
      </div>
    </SidebarSection>
  );
}
