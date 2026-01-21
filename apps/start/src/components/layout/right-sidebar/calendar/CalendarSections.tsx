"use client";

import {
  Calendar as CalendarIcon,
  CheckSquare,
  Clock,
  Settings,
  Layers,
  CalendarDays,
} from "lucide-react";
import { SidebarSection } from "../SidebarSection";
import { Calendar } from "@/components/ui/calendar"; // Assuming standard UI calendar exists
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DayButton, getDefaultClassNames } from "react-day-picker";

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
  const [date, setDate] = useState<Date | undefined>(new Date());

  return (
    <div className="p-2">
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
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

// 2. Task Inbox (Time Blocking)
export function TaskInbox() {
  // Placeholder tasks
  const tasks = [
    { id: 1, title: "Review quarterly report" },
    { id: 2, title: "Email marketing team" },
    { id: 3, title: "Update project roadmap" },
  ];

  return (
    <SidebarSection title="Tasks" icon={CheckSquare} defaultOpen={true}>
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add a task..."
            className="flex-1 bg-bg-surface-2 border border-border-subtle rounded px-2 py-1 text-xs"
          />
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
            +
          </Button>
        </div>
        <div className="space-y-1">
          {tasks.map((task) => (
            <div
              key={task.id}
              draggable
              className="p-2 text-xs bg-bg-surface-2 rounded cursor-grab hover:bg-bg-surface-3 transition-colors border border-transparent hover:border-border-subtle"
            >
              {task.title}
            </div>
          ))}
          {tasks.length === 0 && (
            <p className="text-xs text-text-muted italic">No tasks in inbox</p>
          )}
        </div>
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
  // Placeholder events
  const events = [
    { id: 1, title: "Team Sync", time: "10:00 AM", date: "Today" },
    { id: 2, title: "Lunch with Sarah", time: "12:30 PM", date: "Today" },
    { id: 3, title: "Project Demo", time: "2:00 PM", date: "Tomorrow" },
  ];

  return (
    <SidebarSection title="Upcoming" icon={Clock} defaultOpen={true}>
      <div className="space-y-2">
        {events.map((event) => (
          <div
            key={event.id}
            className="flex flex-col gap-0.5 p-2 rounded bg-bg-surface-2 border border-border-subtle"
          >
            <span className="text-xs font-medium text-text-primary">
              {event.title}
            </span>
            <div className="flex justify-between text-[10px] text-text-secondary">
              <span>{event.time}</span>
              <span>{event.date}</span>
            </div>
          </div>
        ))}
      </div>
    </SidebarSection>
  );
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
