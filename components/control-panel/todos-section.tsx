"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Plus, Trash2, CheckSquare, Square, ListTodo, ChevronDown, ChevronRight, Calendar } from "lucide-react";
import { useTodoStore, groupTodosByCategory, type Todo, type TodoCategory } from "@/lib/hooks/use-todos";
import { PanelSection } from "./control-panel";
import { format, isToday, isTomorrow, startOfDay } from "date-fns";

// Category display config
const CATEGORY_CONFIG: Record<TodoCategory, {
  label: string;
  color: string;
  defaultCollapsed: boolean;
}> = {
  overdue: { label: "Overdue", color: "var(--ds-red, #ef4444)", defaultCollapsed: false },
  today: { label: "Today", color: "var(--text-primary)", defaultCollapsed: false },
  upcoming: { label: "Upcoming", color: "var(--text-secondary)", defaultCollapsed: true },
  backlog: { label: "Backlog", color: "var(--text-muted)", defaultCollapsed: true },
};

// Format due date for display
function formatDueDate(date: Date): string {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "MMM d");
}

// Single todo item component
function TodoItem({
  todo,
  onToggle,
  onDelete,
  categoryColor,
}: {
  todo: Todo;
  onToggle: () => void;
  onDelete: () => void;
  categoryColor: string;
}) {
  return (
    <div
      className={`group flex items-start gap-2 py-1.5 px-2 rounded-lg hover:bg-white/5 transition-colors ${
        todo.completed ? "opacity-50" : ""
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={onToggle}
        className="flex-shrink-0 mt-0.5 transition-colors"
        style={{ color: todo.completed ? 'var(--ds-accent)' : 'var(--text-muted)' }}
      >
        {todo.completed ? (
          <CheckSquare size={16} />
        ) : (
          <Square size={16} />
        )}
      </button>

      {/* Text */}
      <span
        className={`flex-1 text-sm leading-snug ${
          todo.completed
            ? "line-through text-muted-foreground"
            : "text-foreground"
        }`}
      >
        {todo.text}
      </span>

      {/* Delete Button */}
      <button
        onClick={onDelete}
        className="flex-shrink-0 opacity-0 group-hover:opacity-100
                 text-muted-foreground hover:text-red-400
                 transition-all"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

// Category section component
function CategorySection({
  category,
  todos,
  onToggle,
  onDelete,
}: {
  category: TodoCategory;
  todos: Todo[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const config = CATEGORY_CONFIG[category];
  const [collapsed, setCollapsed] = useState(config.defaultCollapsed);

  // Filter: show incomplete todos, plus completed todos that were completed today
  const incompleteTodos = todos.filter(t => !t.completed);
  const completedTodayTodos = todos.filter(t =>
    t.completed && t.completedAt && isToday(t.completedAt)
  );
  const displayTodos = [...incompleteTodos, ...completedTodayTodos];

  if (displayTodos.length === 0) return null;

  return (
    <div className="space-y-1">
      {/* Category Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between py-1 px-1 rounded hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-1.5">
          {collapsed ? (
            <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
          ) : (
            <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
          )}
          <span
            className="text-xs font-medium"
            style={{ color: config.color }}
          >
            {config.label}
          </span>
        </div>
        <span
          className="text-xs px-1.5 py-0.5 rounded-full"
          style={{
            background: category === "overdue" ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-surface-1)',
            color: config.color,
          }}
        >
          {incompleteTodos.length}
        </span>
      </button>

      {/* Todo Items */}
      {!collapsed && (
        <div className="pl-3 space-y-0.5">
          {displayTodos.map((todo) => (
            <div key={todo.id} className="flex items-start gap-2">
              {/* Date indicator for upcoming */}
              {category === "upcoming" && todo.dueDate && (
                <span
                  className="flex-shrink-0 text-[10px] mt-1 w-12"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {formatDueDate(todo.dueDate)}
                </span>
              )}
              <div className="flex-1">
                <TodoItem
                  todo={todo}
                  onToggle={() => onToggle(todo.id)}
                  onDelete={() => onDelete(todo.id)}
                  categoryColor={config.color}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TodosSection() {
  const { todos, fetchTodos, addTodo, toggleTodo, deleteTodo } = useTodoStore();
  const [newTodoText, setNewTodoText] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDueDate, setSelectedDueDate] = useState<Date | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch todos on mount
  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  // Group todos by category (only incomplete ones for counting)
  const groupedTodos = useMemo(() => {
    return groupTodosByCategory(todos);
  }, [todos]);

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoText.trim()) return;

    // Default to today if no date selected
    const dueDate = selectedDueDate || startOfDay(new Date());
    await addTodo(newTodoText, dueDate);
    setNewTodoText("");
    setSelectedDueDate(null);
    setShowDatePicker(false);
    inputRef.current?.focus();
  };

  const handleToggleTodo = async (id: string) => {
    await toggleTodo(id);
  };

  const handleDeleteTodo = async (id: string) => {
    await deleteTodo(id);
  };

  // Quick date options
  const setQuickDate = (option: "today" | "tomorrow" | "none") => {
    if (option === "today") {
      setSelectedDueDate(startOfDay(new Date()));
    } else if (option === "tomorrow") {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setSelectedDueDate(startOfDay(tomorrow));
    } else {
      setSelectedDueDate(null);
    }
    setShowDatePicker(false);
  };

  // Count incomplete todos
  const totalIncomplete = todos.filter(t => !t.completed).length;
  const overdueCount = groupedTodos.overdue.filter(t => !t.completed).length;

  return (
    <PanelSection
      id="todos-section"
      title="Tasks"
      icon={<ListTodo className="h-4 w-4 text-accent" />}
      action={
        totalIncomplete > 0 ? (
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{
              background: overdueCount > 0 ? 'rgba(239, 68, 68, 0.15)' : 'var(--ds-accent-muted)',
              color: overdueCount > 0 ? 'var(--ds-red, #ef4444)' : 'var(--ds-accent)',
            }}
          >
            {totalIncomplete}
          </span>
        ) : undefined
      }
    >
      <div className="space-y-3">
        {/* Add Todo Form - Inset container */}
        <form
          onSubmit={handleAddTodo}
          className="rounded-xl p-2"
          style={{
            background: 'var(--bg-surface-1)',
            boxShadow: 'var(--inset-shadow)',
            border: 'var(--inset-border)',
            borderBottomColor: 'var(--inset-border-bottom)',
            borderRightColor: 'var(--inset-border-right)',
          }}
        >
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newTodoText}
              onChange={(e) => setNewTodoText(e.target.value)}
              placeholder="Add a task..."
              maxLength={500}
              className="flex-1 px-3 py-2 text-sm rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none transition-all"
              style={{
                background: 'transparent',
                border: 'none',
              }}
            />
            <button
              type="submit"
              disabled={!newTodoText.trim()}
              className="px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all duration-200"
              style={newTodoText.trim() ? {
                background: 'var(--bg-surface-3)',
                boxShadow: 'var(--shadow-1)',
                border: '1px solid var(--border-subtle)',
                borderTopColor: 'var(--border-highlight-top)',
                color: 'var(--text-primary)',
              } : {
                background: 'transparent',
                boxShadow: 'none',
                border: '1px solid transparent',
                color: 'var(--text-muted)',
              }}
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Quick date selector - show when typing */}
          {newTodoText.trim() && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              <Calendar size={12} style={{ color: 'var(--text-muted)' }} />
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setQuickDate("today")}
                  className="px-2 py-0.5 rounded text-xs transition-colors"
                  style={{
                    background: selectedDueDate && isToday(selectedDueDate) ? 'var(--ds-accent)' : 'var(--bg-surface-2)',
                    color: selectedDueDate && isToday(selectedDueDate) ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate("tomorrow")}
                  className="px-2 py-0.5 rounded text-xs transition-colors"
                  style={{
                    background: selectedDueDate && isTomorrow(selectedDueDate) ? 'var(--ds-accent)' : 'var(--bg-surface-2)',
                    color: selectedDueDate && isTomorrow(selectedDueDate) ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate("none")}
                  className="px-2 py-0.5 rounded text-xs transition-colors"
                  style={{
                    background: !selectedDueDate ? 'var(--ds-accent)' : 'var(--bg-surface-2)',
                    color: !selectedDueDate ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  Backlog
                </button>
              </div>
            </div>
          )}
        </form>

        {/* Grouped Todo List */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {todos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No tasks yet. Add one above!
            </p>
          ) : (
            <>
              {/* Render in order: Overdue, Today, Upcoming, Backlog */}
              <CategorySection
                category="overdue"
                todos={groupedTodos.overdue}
                onToggle={handleToggleTodo}
                onDelete={handleDeleteTodo}
              />
              <CategorySection
                category="today"
                todos={groupedTodos.today}
                onToggle={handleToggleTodo}
                onDelete={handleDeleteTodo}
              />
              <CategorySection
                category="upcoming"
                todos={groupedTodos.upcoming}
                onToggle={handleToggleTodo}
                onDelete={handleDeleteTodo}
              />
              <CategorySection
                category="backlog"
                todos={groupedTodos.backlog}
                onToggle={handleToggleTodo}
                onDelete={handleDeleteTodo}
              />
            </>
          )}
        </div>

        {/* Summary */}
        {todos.length > 0 && totalIncomplete === 0 && (
          <div
            className="text-xs pt-2 text-center"
            style={{
              color: 'var(--ds-accent)',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            All tasks completed! 🎉
          </div>
        )}
      </div>
    </PanelSection>
  );
}
