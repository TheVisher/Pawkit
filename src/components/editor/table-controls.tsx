'use client';

import { useEffect, useState, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import { cn } from '@/lib/utils';
import {
  Plus,
  Minus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  MoreHorizontal,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TableControlsProps {
  editor: Editor;
}

interface TablePosition {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface RowInfo {
  top: number;
  height: number;
}

interface ColInfo {
  left: number;
  width: number;
}

export function TableControls({ editor }: TableControlsProps) {
  const [isInTable, setIsInTable] = useState(false);
  const [tablePosition, setTablePosition] = useState<TablePosition | null>(null);
  const [rows, setRows] = useState<RowInfo[]>([]);
  const [cols, setCols] = useState<ColInfo[]>([]);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);

  // Update table detection and position
  useEffect(() => {
    if (!editor) return;

    const updateTableState = () => {
      const inTable = editor.isActive('table');
      setIsInTable(inTable);

      if (inTable) {
        const { state } = editor;
        const { $from } = state.selection;

        // Find table position in document
        let tablePos = null;
        for (let d = $from.depth; d > 0; d--) {
          if ($from.node(d).type.name === 'table') {
            tablePos = $from.start(d) - 1;
            break;
          }
        }

        if (tablePos !== null) {
          try {
            const dom = editor.view.nodeDOM(tablePos) as HTMLElement;
            if (dom && dom.tagName === 'TABLE') {
              const rect = dom.getBoundingClientRect();
              const editorRect = editor.view.dom.getBoundingClientRect();

              // Get row info
              const tableRows = dom.querySelectorAll('tr');
              const rowInfos: RowInfo[] = [];
              tableRows.forEach((row) => {
                const rowRect = row.getBoundingClientRect();
                rowInfos.push({
                  top: rowRect.top - editorRect.top,
                  height: rowRect.height,
                });
              });
              setRows(rowInfos);

              // Get column info from first row
              const firstRow = tableRows[0];
              if (firstRow) {
                const cells = firstRow.querySelectorAll('th, td');
                const colInfos: ColInfo[] = [];
                cells.forEach((cell) => {
                  const cellRect = cell.getBoundingClientRect();
                  colInfos.push({
                    left: cellRect.left - editorRect.left,
                    width: cellRect.width,
                  });
                });
                setCols(colInfos);
              }

              setTablePosition({
                top: rect.top - editorRect.top,
                left: rect.left - editorRect.left,
                width: rect.width,
                height: rect.height,
              });
            }
          } catch {
            // DOM access may fail during transitions
          }
        }
      } else {
        setTablePosition(null);
        setRows([]);
        setCols([]);
        setHoveredRow(null);
        setHoveredCol(null);
      }
    };

    editor.on('selectionUpdate', updateTableState);
    editor.on('transaction', updateTableState);

    // Initial update
    updateTableState();

    return () => {
      editor.off('selectionUpdate', updateTableState);
      editor.off('transaction', updateTableState);
    };
  }, [editor]);

  // Table commands
  const addRowBefore = useCallback(() => {
    editor.chain().focus().addRowBefore().run();
  }, [editor]);

  const addRowAfter = useCallback(() => {
    editor.chain().focus().addRowAfter().run();
  }, [editor]);

  const deleteRow = useCallback(() => {
    editor.chain().focus().deleteRow().run();
  }, [editor]);

  const addColumnBefore = useCallback(() => {
    editor.chain().focus().addColumnBefore().run();
  }, [editor]);

  const addColumnAfter = useCallback(() => {
    editor.chain().focus().addColumnAfter().run();
  }, [editor]);

  const deleteColumn = useCallback(() => {
    editor.chain().focus().deleteColumn().run();
  }, [editor]);

  if (!isInTable || !tablePosition) return null;

  return (
    <>
      {/* Row controls - left side of table */}
      <div
        className="absolute pointer-events-auto"
        style={{
          top: tablePosition.top,
          left: tablePosition.left - 32,
          height: tablePosition.height,
          width: 28,
        }}
      >
        {rows.map((row, index) => (
          <div
            key={`row-control-${index}`}
            className="absolute w-full group"
            style={{
              top: row.top - tablePosition.top,
              height: row.height,
            }}
            onMouseEnter={() => setHoveredRow(index)}
            onMouseLeave={() => setHoveredRow(null)}
          >
            {/* Add row button - appears at bottom edge of hovered row */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // We need to position cursor in this row before adding
                // Just add row after - the current cursor position will determine where
                addRowAfter();
              }}
              className={cn(
                'absolute left-0 right-0 h-5 flex items-center justify-center',
                'transition-opacity duration-150',
                hoveredRow === index ? 'opacity-100' : 'opacity-0'
              )}
              style={{
                bottom: -2,
              }}
              title="Add row below"
            >
              <div
                className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center',
                  'bg-[var(--color-accent)] text-white',
                  'hover:scale-110 hover:bg-[var(--color-accent-hover)]',
                  'shadow-sm transition-transform duration-100'
                )}
              >
                <Plus className="h-3 w-3" />
              </div>
            </button>
          </div>
        ))}
      </div>

      {/* Column controls - above table */}
      <div
        className="absolute pointer-events-auto"
        style={{
          top: tablePosition.top - 28,
          left: tablePosition.left,
          width: tablePosition.width,
          height: 24,
        }}
      >
        {cols.map((col, index) => (
          <div
            key={`col-control-${index}`}
            className="absolute h-full group"
            style={{
              left: col.left - tablePosition.left,
              width: col.width,
            }}
            onMouseEnter={() => setHoveredCol(index)}
            onMouseLeave={() => setHoveredCol(null)}
          >
            {/* Add column button - appears at right edge of hovered column */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                addColumnAfter();
              }}
              className={cn(
                'absolute top-0 bottom-0 w-5 flex items-center justify-center',
                'transition-opacity duration-150',
                hoveredCol === index ? 'opacity-100' : 'opacity-0'
              )}
              style={{
                right: -10,
              }}
              title="Add column to right"
            >
              <div
                className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center',
                  'bg-[var(--color-accent)] text-white',
                  'hover:scale-110 hover:bg-[var(--color-accent-hover)]',
                  'shadow-sm transition-transform duration-100'
                )}
              >
                <Plus className="h-3 w-3" />
              </div>
            </button>
          </div>
        ))}
      </div>

      {/* Table control menu - appears at top-right of table */}
      <div
        className="absolute pointer-events-auto z-10"
        style={{
          top: tablePosition.top - 32,
          left: tablePosition.left + tablePosition.width + 4,
        }}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'w-7 h-7 rounded-md flex items-center justify-center',
                'bg-[var(--glass-bg)] border border-[var(--glass-border)]',
                'text-[var(--color-text-secondary)]',
                'hover:bg-[var(--glass-bg-hover)] hover:text-[var(--color-text-primary)]',
                'transition-colors duration-150'
              )}
              title="Table options"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => editor.chain().focus().addRowBefore().run()}>
              <ArrowUp className="h-4 w-4 mr-2" />
              Add row above
            </DropdownMenuItem>
            <DropdownMenuItem onClick={addRowAfter}>
              <ArrowDown className="h-4 w-4 mr-2" />
              Add row below
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().deleteRow().run()} className="text-red-400 focus:text-red-400">
              <Minus className="h-4 w-4 mr-2" />
              Delete row
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => editor.chain().focus().addColumnBefore().run()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Add column left
            </DropdownMenuItem>
            <DropdownMenuItem onClick={addColumnAfter}>
              <ArrowRight className="h-4 w-4 mr-2" />
              Add column right
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().deleteColumn().run()} className="text-red-400 focus:text-red-400">
              <Minus className="h-4 w-4 mr-2" />
              Delete column
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeaderRow().run()}>
              Toggle header row
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeaderColumn().run()}>
              Toggle header column
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => editor.chain().focus().deleteTable().run()} className="text-red-400 focus:text-red-400">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete table
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
