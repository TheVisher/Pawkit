"use client";

import { create } from "zustand";

export interface Todo {
  id: string;
  userId: string;
  text: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface TodoStore {
  todos: Todo[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchTodos: () => Promise<void>;
  addTodo: (text: string) => Promise<void>;
  toggleTodo: (id: string) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  updateTodo: (id: string, updates: Partial<Todo>) => Promise<void>;
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
      const parsedTodos = todos.map((todo: any) => ({
        ...todo,
        createdAt: new Date(todo.createdAt),
        updatedAt: new Date(todo.updatedAt)
      }));

      set({ todos: parsedTodos, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  addTodo: async (text: string) => {
    if (!text.trim()) return;

    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() })
      });

      if (!response.ok) throw new Error('Failed to add todo');

      const data = await response.json();
      const newTodo = data.success ? data.data : data;

      // Convert date strings to Date objects
      const parsedTodo = {
        ...newTodo,
        createdAt: new Date(newTodo.createdAt),
        updatedAt: new Date(newTodo.updatedAt)
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
                updatedAt: new Date(updatedTodo.updatedAt)
              }
            : t
        )
      }));
    } catch (error) {
      // Revert optimistic update
      set((state) => ({
        todos: state.todos.map((t) =>
          t.id === id ? { ...t, completed: !t.completed } : t
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

  updateTodo: async (id: string, updates: Partial<Todo>) => {
    // Optimistic update
    const previousTodos = get().todos;
    set((state) => ({
      todos: state.todos.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      )
    }));

    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
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
                updatedAt: new Date(updatedTodo.updatedAt)
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
