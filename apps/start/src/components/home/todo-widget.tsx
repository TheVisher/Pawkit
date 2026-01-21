'use client';

/**
 * Todo Widget
 * Shows incomplete tasks from todo supertag cards with quick-add functionality
 */

import { useMemo, useState, useCallback, KeyboardEvent } from 'react';
import { CheckSquare, Plus, Check, ArrowUpRight, AlertTriangle, Calendar } from 'lucide-react';
import { Card as UICard, CardContent } from '@/components/ui/card';
import { useCards } from '@/lib/contexts/convex-data-context';
import { useCurrentWorkspace } from '@/lib/stores/workspace-store';
import { useModalStore } from '@/lib/stores/modal-store';
import { useMutations } from '@/lib/contexts/convex-data-context';
import { Id } from '@/lib/types/convex';
import { cn } from '@/lib/utils';
import {
  parseTaskItemsFromCard,
  toggleTaskInContent,
  addTaskToContent,
  createInitialTodoContent,
  isTaskFromToday,
  isDateHeaderOverdue,
  isDateHeaderToday,
  type TaskItem,
} from '@/lib/utils/parse-task-items';

interface TodoTaskItemProps {
  task: TaskItem;
  onToggle: (task: TaskItem, checked: boolean) => void;
  onClick: () => void;
}

function TodoTaskItem({ task, onToggle, onClick }: TodoTaskItemProps) {
  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(task, !task.checked);
  };

  return (
    <div
      className={cn(
        'group flex items-start gap-2 py-1 px-1.5 rounded-lg transition-colors',
        'hover:bg-bg-surface-3/50'
      )}
    >
      <button
        onClick={handleCheckboxClick}
        className={cn(
          'mt-0.5 shrink-0 w-4 h-4 rounded border transition-colors flex items-center justify-center',
          task.checked
            ? 'bg-[var(--color-accent)] border-[var(--color-accent)]'
            : 'border-text-muted/40 hover:border-[var(--color-accent)]'
        )}
      >
        {task.checked && <Check className="w-3 h-3 text-white" />}
      </button>
      <button
        onClick={onClick}
        className="flex-1 min-w-0 text-left"
      >
        <p className={cn(
          'text-sm text-text-primary truncate',
          task.checked && 'line-through text-text-muted'
        )}>
          {task.text}
        </p>
        <p className="text-xs text-text-muted/70 truncate opacity-0 group-hover:opacity-100 transition-opacity">
          {task.cardTitle}
        </p>
      </button>
    </div>
  );
}

export function TodoWidget() {
  const workspace = useCurrentWorkspace();
  const cards = useCards();
  const openCardDetail = useModalStore((s) => s.openCardDetail);
  const { updateCard, createCard } = useMutations();

  const [inputValue, setInputValue] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Get all todo cards
  const todoCards = useMemo(() => {
    return cards.filter((c) => {
      if (c.deleted) return false;
      return c.tags?.includes('todo');
    });
  }, [cards]);

  // Get tasks grouped by: overdue, today, other
  const { overdueTasks, todayTasks, otherTasks, visibleTasks } = useMemo(() => {
    const overdue: TaskItem[] = [];
    const today: TaskItem[] = [];
    const other: TaskItem[] = [];

    for (const card of todoCards) {
      const tasks = parseTaskItemsFromCard(card);
      // Show: incomplete tasks OR completed tasks from today
      const visible = tasks.filter((t) => {
        if (!t.text.trim()) return false;
        if (!t.checked) return true; // Always show incomplete
        return isTaskFromToday(t); // Show completed only if from today
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

    // Sort each group: incomplete first
    const sortTasks = (a: TaskItem, b: TaskItem) => {
      if (a.checked === b.checked) return 0;
      return a.checked ? 1 : -1;
    };

    overdue.sort(sortTasks);
    today.sort(sortTasks);
    other.sort(sortTasks);

    // Combine: overdue first, then today, then other (limited to 10 total)
    const all = [...overdue, ...today, ...other].slice(0, 10);

    return {
      overdueTasks: overdue,
      todayTasks: today,
      otherTasks: other,
      visibleTasks: all,
    };
  }, [todoCards]);

  const totalIncomplete = useMemo(() => {
    let count = 0;
    for (const card of todoCards) {
      const tasks = parseTaskItemsFromCard(card);
      count += tasks.filter((t) => !t.checked && t.text.trim()).length;
    }
    return count;
  }, [todoCards]);

  // Toggle a task's completion status
  const handleToggle = useCallback(async (task: TaskItem, checked: boolean) => {
    const card = cards.find((c) => c._id === task.cardId);
    if (!card || !card.content) return;

    const updatedContent = toggleTaskInContent(card.content, task.text, checked);
    await updateCard(card._id, { content: updatedContent });
  }, [cards, updateCard]);

  // Add a new task
  const handleAddTask = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || isAdding) return;

    setIsAdding(true);
    try {
      // Find existing todo card or create one
      const todoCard = todoCards[0]; // Use first todo card if multiple

      if (!todoCard && workspace?._id) {
        // Create a new todo card with the task already in it
        const content = addTaskToContent(createInitialTodoContent(), text);
        await createCard({
          workspaceId: workspace._id as Id<'workspaces'>,
          type: 'md-note',
          url: '',
          title: 'Todos',
          content,
          tags: ['todo'],
          pinned: false,
          isFileCard: false,
        });
        setInputValue('');
        return;
      }

      if (todoCard) {
        // Add task to the existing card
        const updatedContent = addTaskToContent(todoCard.content || '', text);
        await updateCard(todoCard._id, { content: updatedContent });
        setInputValue('');
      }
    } finally {
      setIsAdding(false);
    }
  }, [inputValue, isAdding, todoCards, workspace?._id, createCard, updateCard]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddTask();
    }
  };

  return (
    <UICard className="border-border-subtle bg-bg-surface-2 h-full py-0">
      <CardContent className="p-3 h-full flex flex-col">
        {/* Header - clickable to open todo card */}
        <button
          onClick={() => todoCards[0] && openCardDetail(todoCards[0]._id)}
          disabled={todoCards.length === 0}
          className={cn(
            'flex items-center gap-2 mb-2 w-full text-left rounded-lg transition-colors',
            'hover:bg-bg-surface-3/30',
            'disabled:cursor-default disabled:hover:bg-transparent'
          )}
        >
          <div className={cn(
            'p-2 rounded-lg',
            overdueTasks.length > 0 ? 'bg-red-500/20' : 'bg-amber-500/20'
          )}>
            {overdueTasks.length > 0 ? (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            ) : (
              <CheckSquare className="h-4 w-4 text-amber-500" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <h3 className="font-medium text-text-primary text-sm">Tasks</h3>
              {todoCards.length > 0 && (
                <ArrowUpRight className="h-3 w-3 text-text-muted/50" />
              )}
            </div>
            <p className="text-xs text-text-muted">
              {overdueTasks.length > 0 ? (
                <span className="text-red-400">{overdueTasks.length} overdue</span>
              ) : (
                <>{totalIncomplete} {totalIncomplete === 1 ? 'item' : 'items'} to do</>
              )}
            </p>
          </div>
        </button>

        {/* Quick Add Input */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a task..."
              disabled={isAdding}
              className={cn(
                'w-full px-3 py-2 text-sm rounded-lg',
                'bg-bg-surface-3/50 border border-transparent',
                'text-text-primary placeholder:text-text-muted/50',
                'focus:outline-none focus:border-[var(--color-accent)]/50',
                'disabled:opacity-50'
              )}
            />
          </div>
          <button
            onClick={handleAddTask}
            disabled={!inputValue.trim() || isAdding}
            className={cn(
              'p-2 rounded-lg transition-colors',
              'bg-[var(--color-accent)]/20 text-[var(--color-accent)]',
              'hover:bg-[var(--color-accent)]/30',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Task List */}
        {visibleTasks.length > 0 ? (
          <div className="flex-1 space-y-1 overflow-y-auto min-h-0">
            {/* Overdue Section */}
            {overdueTasks.length > 0 && (
              <>
                <div className="flex items-center gap-1.5 py-1 px-1.5">
                  <AlertTriangle className="h-3 w-3 text-red-500" />
                  <span className="text-xs font-medium text-red-500">
                    Overdue ({overdueTasks.length})
                  </span>
                </div>
                {overdueTasks.slice(0, 5).map((task) => (
                  <TodoTaskItem
                    key={task.id}
                    task={task}
                    onToggle={handleToggle}
                    onClick={() => openCardDetail(task.cardId)}
                  />
                ))}
              </>
            )}

            {/* Today Section */}
            {todayTasks.length > 0 && (
              <>
                <div className="flex items-center gap-1.5 py-1 px-1.5">
                  <Calendar className="h-3 w-3 text-amber-500" />
                  <span className="text-xs font-medium text-amber-500">Today</span>
                </div>
                {todayTasks.slice(0, overdueTasks.length > 0 ? 3 : 5).map((task) => (
                  <TodoTaskItem
                    key={task.id}
                    task={task}
                    onToggle={handleToggle}
                    onClick={() => openCardDetail(task.cardId)}
                  />
                ))}
              </>
            )}

            {/* Other Tasks (no date or future) */}
            {otherTasks.length > 0 && (overdueTasks.length === 0 && todayTasks.length === 0) && (
              <>
                {otherTasks.slice(0, 5).map((task) => (
                  <TodoTaskItem
                    key={task.id}
                    task={task}
                    onToggle={handleToggle}
                    onClick={() => openCardDetail(task.cardId)}
                  />
                ))}
              </>
            )}

            {/* Show remaining count if more tasks exist */}
            {totalIncomplete > 10 && (
              <p className="text-xs text-text-muted text-center pt-1">
                +{totalIncomplete - 10} more
              </p>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <CheckSquare className="h-8 w-8 text-text-muted/50 mb-2" />
            <p className="text-sm text-text-muted">All caught up!</p>
            <p className="text-xs text-text-muted/70 mt-1">
              Add a task above to get started
            </p>
          </div>
        )}
      </CardContent>
    </UICard>
  );
}
