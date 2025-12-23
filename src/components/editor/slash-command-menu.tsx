'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import {
  Type,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Code,
  Minus,
  Quote,
  Table2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Command {
  id: string;
  label: string;
  shortcut: string;
  icon: typeof Heading1;
  action: (editor: Editor) => void;
}

const commands: Command[] = [
  {
    id: 'text',
    label: 'Text',
    shortcut: '',
    icon: Type,
    action: (editor) => editor.chain().focus().setParagraph().run(),
  },
  {
    id: 'heading1',
    label: 'Heading 1',
    shortcut: '#',
    icon: Heading1,
    action: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: 'heading2',
    label: 'Heading 2',
    shortcut: '##',
    icon: Heading2,
    action: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: 'heading3',
    label: 'Heading 3',
    shortcut: '###',
    icon: Heading3,
    action: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    id: 'bulletlist',
    label: 'Bulleted list',
    shortcut: '-',
    icon: List,
    action: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: 'orderedlist',
    label: 'Numbered list',
    shortcut: '1.',
    icon: ListOrdered,
    action: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    id: 'checklist',
    label: 'To-do list',
    shortcut: '[]',
    icon: CheckSquare,
    action: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    id: 'blockquote',
    label: 'Quote',
    shortcut: '>',
    icon: Quote,
    action: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    id: 'divider',
    label: 'Divider',
    shortcut: '---',
    icon: Minus,
    action: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
  {
    id: 'code',
    label: 'Code block',
    shortcut: '```',
    icon: Code,
    action: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: 'table',
    label: 'Table',
    shortcut: '',
    icon: Table2,
    action: (editor) => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
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
        'absolute z-50 min-w-[220px]',
        'rounded-lg',
        'bg-[var(--glass-panel-bg)]',
        'backdrop-blur-[var(--glass-blur)] backdrop-saturate-[var(--glass-saturate)]',
        'border border-[var(--glass-border)]',
        'shadow-[var(--glass-shadow)]',
        'py-1.5',
        // Custom scrollbar - minimal thumb only
        'max-h-[320px] overflow-y-auto',
        'scrollbar-thin scrollbar-thumb-[var(--glass-border)] scrollbar-track-transparent'
      )}
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      {/* Section header */}
      <div className="px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
        Basic blocks
      </div>

      {/* Command list */}
      {filteredCommands.length > 0 ? (
        <div>
          {filteredCommands.map((command, index) => {
            const Icon = command.icon;
            return (
              <button
                key={command.id}
                onClick={() => selectCommand(command)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={cn(
                  'w-full flex items-center justify-between gap-3 px-3 py-1.5 text-left transition-colors',
                  index === selectedIndex
                    ? 'bg-[var(--glass-bg-hover)]'
                    : 'hover:bg-[var(--glass-bg)]'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={cn(
                      'h-4 w-4 flex-shrink-0',
                      index === selectedIndex
                        ? 'text-[var(--color-text-primary)]'
                        : 'text-[var(--color-text-muted)]'
                    )}
                  />
                  <span
                    className={cn(
                      'text-sm',
                      index === selectedIndex
                        ? 'text-[var(--color-text-primary)]'
                        : 'text-[var(--color-text-secondary)]'
                    )}
                  >
                    {command.label}
                  </span>
                </div>
                {command.shortcut && (
                  <span className="text-xs text-[var(--color-text-muted)] font-mono">
                    {command.shortcut}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="px-3 py-3 text-center text-sm text-[var(--color-text-muted)]">
          No commands found
        </div>
      )}

      {/* Footer hint */}
      <div className="mt-1 pt-1.5 px-3 pb-1 border-t border-[var(--glass-border)]">
        <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
          <span>Type <span className="font-mono">/</span> to filter</span>
          <span className="font-mono">esc</span>
        </div>
      </div>

      {/* Minimal scrollbar styles */}
      <style jsx>{`
        div::-webkit-scrollbar {
          width: 4px;
        }
        div::-webkit-scrollbar-track {
          background: transparent;
        }
        div::-webkit-scrollbar-thumb {
          background: var(--glass-border);
          border-radius: 2px;
        }
        div::-webkit-scrollbar-thumb:hover {
          background: var(--color-text-muted);
        }
      `}</style>
    </div>
  );
}
