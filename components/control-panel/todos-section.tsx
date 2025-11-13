"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, CheckSquare, Square, ListTodo } from "lucide-react";
import { useTodoStore } from "@/lib/hooks/use-todos";
import { PanelSection } from "./control-panel";

export function TodosSection() {
  const { todos, fetchTodos, addTodo, toggleTodo, deleteTodo } = useTodoStore();
  const [newTodoText, setNewTodoText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch todos on mount
  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoText.trim()) return;

    await addTodo(newTodoText);
    setNewTodoText("");
    inputRef.current?.focus();
  };

  const handleToggleTodo = async (id: string) => {
    await toggleTodo(id);
  };

  const handleDeleteTodo = async (id: string) => {
    await deleteTodo(id);
  };

  // Sort: incomplete first, then by creation date
  const sortedTodos = [...todos].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const incompleteTodos = todos.filter(t => !t.completed);

  return (
    <div className="border-b border-white/5 px-6">
      <PanelSection
        id="todos-section"
        title="Today's Tasks"
        icon={<ListTodo className="h-4 w-4 text-accent" />}
        action={
          incompleteTodos.length > 0 ? (
            <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
              {incompleteTodos.length}
            </span>
          ) : undefined
        }
      >
        <div className="space-y-3">
          {/* Add Todo Form */}
          <form onSubmit={handleAddTodo} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newTodoText}
              onChange={(e) => setNewTodoText(e.target.value)}
              placeholder="Add a task..."
              className="flex-1 px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg
                       text-foreground placeholder:text-muted-foreground
                       focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50
                       transition-all"
            />
            <button
              type="submit"
              disabled={!newTodoText.trim()}
              className="px-3 py-2 bg-purple-500/20 text-purple-300 rounded-lg
                       hover:bg-purple-500/30 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center gap-1.5"
            >
              <Plus size={16} />
            </button>
          </form>

          {/* Todo List */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {sortedTodos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No tasks yet. Add one above!
              </p>
            ) : (
              sortedTodos.map((todo) => (
                <div
                  key={todo.id}
                  className={`group flex items-start gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors ${
                    todo.completed ? "opacity-60" : ""
                  }`}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => handleToggleTodo(todo.id)}
                    className="flex-shrink-0 mt-0.5 text-muted-foreground hover:text-purple-400 transition-colors"
                  >
                    {todo.completed ? (
                      <CheckSquare size={18} className="text-purple-400" />
                    ) : (
                      <Square size={18} />
                    )}
                  </button>

                  {/* Text */}
                  <span
                    className={`flex-1 text-sm ${
                      todo.completed
                        ? "line-through text-muted-foreground"
                        : "text-foreground"
                    }`}
                  >
                    {todo.text}
                  </span>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDeleteTodo(todo.id)}
                    className="flex-shrink-0 opacity-0 group-hover:opacity-100
                             text-muted-foreground hover:text-red-400
                             transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Summary */}
          {todos.length > 0 && (
            <div className="text-xs text-muted-foreground pt-2 border-t border-white/5">
              {incompleteTodos.length === 0 ? (
                <span className="text-green-400">All tasks completed!</span>
              ) : (
                <span>
                  {incompleteTodos.length} of {todos.length} remaining
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
