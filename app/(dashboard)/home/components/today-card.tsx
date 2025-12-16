"use client";

import { Clock, Bookmark, CheckSquare, FileText } from "lucide-react";
import { CalendarEvent } from "@/lib/types/calendar";
import { CardModel } from "@/lib/types";
import { Todo, TodoCategory } from "@/lib/hooks/use-todos";
import { usePanelStore } from "@/lib/hooks/use-panel-store";

// Helper to format time in 12-hour format
function formatTime12h(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

interface TodayCardProps {
  events: CalendarEvent[];
  scheduledCards: CardModel[];
  dailyNote: CardModel | undefined;
  groupedTodos: Record<TodoCategory, Todo[]>;
  onToggleTodo: (id: string) => void;
  onOpenDailyNote: () => void;
}

export function TodayCard({
  events,
  scheduledCards,
  dailyNote,
  groupedTodos,
  onToggleTodo,
  onOpenDailyNote,
}: TodayCardProps) {
  const openCardDetails = usePanelStore((state) => state.openCardDetails);

  // Get today's todos (today + overdue)
  const todayTodos = [...groupedTodos.overdue, ...groupedTodos.today];

  return (
    <div
      className="h-full rounded-xl p-4 flex flex-col min-h-0"
      style={{
        background: 'var(--bg-surface-2)',
        boxShadow: 'var(--shadow-2)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <div className="w-6 h-6 rounded-lg bg-accent/20 flex items-center justify-center">
          <Clock className="w-3 h-3 text-accent" />
        </div>
        <h2 className="font-semibold text-sm text-foreground">Today</h2>
      </div>

      <div className="grid grid-cols-3 gap-3 flex-1 min-h-0">
        {/* Events Panel */}
        <div className="bg-surface-soft rounded-lg p-3 flex flex-col min-h-0">
          <div className="flex items-center gap-1.5 mb-2 shrink-0">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Events</span>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5">
            {events.length === 0 ? (
              <p className="text-xs text-muted-foreground/60">No events</p>
            ) : (
              events.slice(0, 3).map((event) => (
                <div key={event.id} className="flex items-center gap-2">
                  <div
                    className="w-0.5 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: event.color || 'var(--ds-accent)' }}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {event.title}
                    </p>
                    {!event.isAllDay && event.startTime && (
                      <p className="text-[10px] text-muted-foreground">
                        {formatTime12h(event.startTime)}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Scheduled Panel */}
        <div className="bg-surface-soft rounded-lg p-3 flex flex-col min-h-0">
          <div className="flex items-center gap-1.5 mb-2 shrink-0">
            <Bookmark className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Scheduled</span>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5">
            {scheduledCards.length === 0 ? (
              <p className="text-xs text-muted-foreground/60">Nothing</p>
            ) : (
              scheduledCards.slice(0, 3).map((card) => (
                <button
                  key={card.id}
                  onClick={() => openCardDetails(card.id)}
                  className="w-full text-left flex items-center gap-2 hover:bg-surface-soft/80 rounded transition-colors"
                >
                  {card.image && (
                    <img
                      src={card.image}
                      alt=""
                      className="w-5 h-5 rounded object-cover flex-shrink-0"
                    />
                  )}
                  <p className="text-xs font-medium text-foreground truncate flex-1">
                    {card.title || card.domain || card.url}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Todos Panel */}
        <div className="bg-surface-soft rounded-lg p-3 flex flex-col min-h-0">
          <div className="flex items-center gap-1.5 mb-2 shrink-0">
            <CheckSquare className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Todos</span>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5">
            {todayTodos.length === 0 ? (
              <p className="text-xs text-muted-foreground/60">All done!</p>
            ) : (
              todayTodos.slice(0, 3).map((todo) => (
                <label key={todo.id} className="flex items-start gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => onToggleTodo(todo.id)}
                    className="mt-0.5 rounded border-subtle text-accent focus:ring-accent/50 w-3 h-3"
                  />
                  <span className={`text-xs leading-tight ${todo.completed ? 'line-through text-muted-foreground/60' : 'text-foreground'}`}>
                    {todo.text}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Daily Note Button */}
      <button
        onClick={onOpenDailyNote}
        className="mt-3 shrink-0 w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent text-xs font-medium transition-colors"
      >
        <FileText className="w-3.5 h-3.5" />
        {dailyNote ? "Open today's note" : "Create today's note"}
      </button>
    </div>
  );
}
