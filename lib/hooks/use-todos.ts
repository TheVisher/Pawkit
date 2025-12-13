"use client";

import { create } from "zustand";
import { startOfDay, endOfDay, isBefore, isToday, isTomorrow, isAfter, addDays } from "date-fns";

export interface Todo {
  id: string;
  userId: string;
  text: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
  dueDate: Date | null;
  completedAt: Date | null;
}

// API response has date strings instead of Date objects
interface TodoApiResponse {
  id: string;
  userId: string;
  text: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  dueDate: string | null;
  completedAt: string | null;
}

// Helper to categorize todos
export type TodoCategory = "overdue" | "today" | "upcoming" | "backlog";

export function categorizeTodo(todo: Todo): TodoCategory {
  if (!todo.dueDate) return "backlog";

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  if (isBefore(todo.dueDate, todayStart)) return "overdue";
  if (todo.dueDate >= todayStart && todo.dueDate <= todayEnd) return "today";
  return "upcoming";
}

export function groupTodosByCategory(todos: Todo[]) {
  const groups: Record<TodoCategory, Todo[]> = {
    overdue: [],
    today: [],
    upcoming: [],
    backlog: [],
  };

  todos.forEach((todo) => {
    const category = categorizeTodo(todo);
    groups[category].push(todo);
  });

  // Sort each group
  // Overdue: oldest first
  groups.overdue.sort((a, b) => (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0));
  // Today: by creation date
  groups.today.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  // Upcoming: nearest first
  groups.upcoming.sort((a, b) => (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0));
  // Backlog: newest first
  groups.backlog.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return groups;
}

interface TodoStore {
  todos: Todo[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchTodos: () => Promise<void>;
  addTodo: (text: string, dueDate?: Date | null) => Promise<void>;
  toggleTodo: (id: string) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  updateTodo: (id: string, updates: Partial<Pick<Todo, "text" | "dueDate">>) => Promise<void>;
}

export const useTodoStore = create<TodoStore>((set, get) => ({
  todos: [],
  isLoading: false,
  error: null,

  fetchTodos: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/todos');
      if (!response.ok) throw new Error('Failed to fetch todos');

      const data = await response.json();
      const todos = data.success ? data.data : data;

      // Convert date strings to Date objects
      const parsedTodos = (todos as TodoApiResponse[]).map((todo) => ({
        ...todo,
        createdAt: new Date(todo.createdAt),
        updatedAt: new Date(todo.updatedAt),
        dueDate: todo.dueDate ? new Date(todo.dueDate) : null,
        completedAt: todo.completedAt ? new Date(todo.completedAt) : null,
      }));

      set({ todos: parsedTodos, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  addTodo: async (text: string, dueDate?: Date | null) => {
    if (!text.trim()) return;

    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          dueDate: dueDate ? dueDate.toISOString() : null,
        })
      });

      if (!response.ok) throw new Error('Failed to add todo');

      const data = await response.json();
      const newTodo = data.success ? data.data : data;

      // Convert date strings to Date objects
      const parsedTodo = {
        ...newTodo,
        createdAt: new Date(newTodo.createdAt),
        updatedAt: new Date(newTodo.updatedAt),
        dueDate: newTodo.dueDate ? new Date(newTodo.dueDate) : null,
        completedAt: newTodo.completedAt ? new Date(newTodo.completedAt) : null,
      };

      set((state) => ({
        todos: [parsedTodo, ...state.todos]
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  toggleTodo: async (id: string) => {
    const todo = get().todos.find((t) => t.id === id);
    if (!todo) return;

    // Optimistic update
    set((state) => ({
      todos: state.todos.map((t) =>
        t.id === id ? { ...t, completed: !t.completed } : t
      )
    }));

    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !todo.completed })
      });

      if (!response.ok) throw new Error('Failed to toggle todo');

      const data = await response.json();
      const updatedTodo = data.success ? data.data : data;

      // Update with server response
      set((state) => ({
        todos: state.todos.map((t) =>
          t.id === id
            ? {
                ...updatedTodo,
                createdAt: new Date(updatedTodo.createdAt),
                updatedAt: new Date(updatedTodo.updatedAt),
                dueDate: updatedTodo.dueDate ? new Date(updatedTodo.dueDate) : null,
                completedAt: updatedTodo.completedAt ? new Date(updatedTodo.completedAt) : null,
              }
            : t
        )
      }));
    } catch (error) {
      // Revert optimistic update
      set((state) => ({
        todos: state.todos.map((t) =>
          t.id === id ? { ...t, completed: todo.completed } : t
        ),
        error: (error as Error).message
      }));
    }
  },

  deleteTodo: async (id: string) => {
    // Optimistic delete
    const previousTodos = get().todos;
    set((state) => ({
      todos: state.todos.filter((t) => t.id !== id)
    }));

    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete todo');
    } catch (error) {
      // Revert optimistic delete
      set({ todos: previousTodos, error: (error as Error).message });
    }
  },

  updateTodo: async (id: string, updates: Partial<Pick<Todo, "text" | "dueDate">>) => {
    // Optimistic update
    const previousTodos = get().todos;
    set((state) => ({
      todos: state.todos.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      )
    }));

    try {
      // Convert dueDate to ISO string for API
      const apiUpdates: Record<string, unknown> = { ...updates };
      if (updates.dueDate !== undefined) {
        apiUpdates.dueDate = updates.dueDate ? updates.dueDate.toISOString() : null;
      }

      const response = await fetch(`/api/todos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiUpdates)
      });

      if (!response.ok) throw new Error('Failed to update todo');

      const data = await response.json();
      const updatedTodo = data.success ? data.data : data;

      // Update with server response
      set((state) => ({
        todos: state.todos.map((t) =>
          t.id === id
            ? {
                ...updatedTodo,
                createdAt: new Date(updatedTodo.createdAt),
                updatedAt: new Date(updatedTodo.updatedAt),
                dueDate: updatedTodo.dueDate ? new Date(updatedTodo.dueDate) : null,
                completedAt: updatedTodo.completedAt ? new Date(updatedTodo.completedAt) : null,
              }
            : t
        )
      }));
    } catch (error) {
      // Revert optimistic update
      set({ todos: previousTodos, error: (error as Error).message });
    }
  }
}));
