'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Code,
  Minus,
  Quote,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Command {
  id: string;
  label: string;
  description: string;
  icon: typeof Heading1;
  action: (editor: Editor) => void;
}

const commands: Command[] = [
  {
    id: 'heading1',
    label: 'Heading 1',
    description: 'Large section heading',
    icon: Heading1,
    action: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: 'heading2',
    label: 'Heading 2',
    description: 'Medium section heading',
    icon: Heading2,
    action: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: 'heading3',
    label: 'Heading 3',
    description: 'Small section heading',
    icon: Heading3,
    action: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    id: 'bulletlist',
    label: 'Bullet List',
    description: 'Create a simple list',
    icon: List,
    action: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: 'orderedlist',
    label: 'Numbered List',
    description: 'Create a numbered list',
    icon: ListOrdered,
    action: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    id: 'checklist',
    label: 'Checklist',
    description: 'Create a todo list',
    icon: CheckSquare,
    action: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    id: 'code',
    label: 'Code Block',
    description: 'Display code with syntax',
    icon: Code,
    action: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: 'blockquote',
    label: 'Quote',
    description: 'Capture a quotation',
    icon: Quote,
    action: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    id: 'divider',
    label: 'Divider',
    description: 'Insert a horizontal line',
    icon: Minus,
    action: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
];

interface SlashCommandMenuProps {
  editor: Editor;
}

export function SlashCommandMenu({ editor }: SlashCommandMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const slashPosRef = useRef<number | null>(null);

  // Filter commands based on query
  const filteredCommands = commands.filter((command) =>
    command.label.toLowerCase().includes(query.toLowerCase()) ||
    command.id.includes(query.toLowerCase())
  );

  // Reset selection when filtered commands change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Listen to editor transactions to detect "/" and build query
  useEffect(() => {
    if (!editor) return;

    const handleTransaction = () => {
      const { state } = editor;
      const { selection } = state;
      const { $from } = selection;

      // Get text from start of current block to cursor
      const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);

      // Check if we have a slash command pattern
      const slashMatch = textBefore.match(/\/([a-zA-Z]*)$/);

      if (slashMatch) {
        if (!isOpen) {
          // Opening the menu - get position
          const coords = editor.view.coordsAtPos(selection.from - slashMatch[0].length);
          const editorElement = editor.view.dom.closest('.relative');
          const editorRect = editorElement?.getBoundingClientRect() || { top: 0, left: 0 };

          setPosition({
            top: coords.bottom - editorRect.top + 8,
            left: coords.left - editorRect.left,
          });
          slashPosRef.current = selection.from - slashMatch[0].length;
        }
        setIsOpen(true);
        setQuery(slashMatch[1] || '');
      } else if (isOpen) {
        // Close if we no longer have a slash pattern
        setIsOpen(false);
        setQuery('');
        slashPosRef.current = null;
      }
    };

    editor.on('transaction', handleTransaction);
    return () => {
      editor.off('transaction', handleTransaction);
    };
  }, [editor, isOpen]);

  // Handle keyboard navigation when menu is open
  useEffect(() => {
    if (!isOpen || !editor) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          event.stopPropagation();
          setSelectedIndex((prev) =>
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          event.stopPropagation();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
          break;
        case 'Enter':
          event.preventDefault();
          event.stopPropagation();
          if (filteredCommands[selectedIndex]) {
            selectCommand(filteredCommands[selectedIndex]);
          }
          break;
        case 'Escape':
          event.preventDefault();
          event.stopPropagation();
          closeMenu();
          break;
      }
    };

    // Use capture phase to intercept before Tiptap
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, filteredCommands, selectedIndex, editor]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    slashPosRef.current = null;
    editor?.commands.focus();
  }, [editor]);

  const selectCommand = useCallback((command: Command) => {
    if (!editor || slashPosRef.current === null) return;

    // Get current position before any changes
    const from = slashPosRef.current;
    const to = editor.state.selection.from;

    // Close menu first to prevent state issues
    setIsOpen(false);
    setQuery('');

    // Delete the slash and query text, then execute command
    editor
      .chain()
      .focus()
      .deleteRange({ from, to })
      .run();

    // Small delay to ensure deletion completes before command
    requestAnimationFrame(() => {
      command.action(editor);
      slashPosRef.current = null;
    });
  }, [editor]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className={cn(
        'absolute z-50 w-64 max-h-80 overflow-y-auto',
        'rounded-xl',
        'bg-[var(--glass-panel-bg)]',
        'backdrop-blur-[var(--glass-blur)] backdrop-saturate-[var(--glass-saturate)]',
        'border border-[var(--glass-border)]',
        'shadow-[var(--glass-shadow)]',
        'py-2'
      )}
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      {/* Search indicator */}
      {query && (
        <div className="px-3 pb-2 mb-2 border-b border-[var(--glass-border)]">
          <span className="text-xs text-[var(--color-text-muted)]">
            Filtering: <span className="text-[var(--color-text-primary)]">{query}</span>
          </span>
        </div>
      )}

      {/* Command list */}
      {filteredCommands.length > 0 ? (
        <div className="space-y-0.5">
          {filteredCommands.map((command, index) => {
            const Icon = command.icon;
            return (
              <button
                key={command.id}
                onClick={() => selectCommand(command)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
                  index === selectedIndex
                    ? 'bg-[var(--glass-bg-hover)]'
                    : 'hover:bg-[var(--glass-bg)]'
                )}
              >
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-lg',
                    'bg-[var(--glass-bg)] border border-[var(--glass-border)]'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-4 w-4',
                      index === selectedIndex
                        ? 'text-[var(--color-accent)]'
                        : 'text-[var(--color-text-secondary)]'
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className={cn(
                      'text-sm font-medium',
                      index === selectedIndex
                        ? 'text-[var(--color-text-primary)]'
                        : 'text-[var(--color-text-secondary)]'
                    )}
                  >
                    {command.label}
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)] truncate">
                    {command.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="px-3 py-4 text-center text-sm text-[var(--color-text-muted)]">
          No commands found
        </div>
      )}

      {/* Keyboard hints */}
      <div className="mt-2 pt-2 px-3 border-t border-[var(--glass-border)]">
        <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-[var(--glass-bg)] border border-[var(--glass-border)]">
              ↑↓
            </kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-[var(--glass-bg)] border border-[var(--glass-border)]">
              ↵
            </kbd>
            select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-[var(--glass-bg)] border border-[var(--glass-border)]">
              esc
            </kbd>
            close
          </span>
        </div>
      </div>
    </div>
  );
}
