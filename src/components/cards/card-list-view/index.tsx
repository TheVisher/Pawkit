'use client';

import { createPortal } from 'react-dom';
import Image from 'next/image';
import { DragOverlay, type Modifier } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Check, Minus, Globe, FileText, Pin } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { CardItem } from '../card-item';
import { CardContextMenu } from '@/components/context-menus';
import type { LocalCard } from '@/lib/db';
import { type ColumnId, type CardListViewProps, COLUMN_LABELS, getCardType } from './types';
import { useListView } from './use-list-view';
import { ResizableHeader, ColumnPicker } from './table-header';
import { ListRowIcon, ListRowActions, SortableListRow } from './list-row';
import { EditableCell, EditableTagsCell } from './editable-cells';
import { GroupSeparator } from './bulk-actions';

// Custom modifier that centers the overlay on cursor
const centerOverlayOnCursor: Modifier = ({ transform, draggingNodeRect }) => {
  if (draggingNodeRect) {
    return {
      ...transform,
      x: transform.x - draggingNodeRect.width / 2,
      y: transform.y - draggingNodeRect.height / 2,
    };
  }
  return transform;
};

export function CardListView({ cards, groups, groupIcon, onReorder, currentCollection }: CardListViewProps) {
  const {
    columnOrder,
    columnWidths,
    sortColumn,
    sortDirection,
    dragOverColumn,
    activeRowId,
    overRowId,
    activeDragCard,
    cardIds,
    sortedCards,
    selectedIds,
    allSelected,
    someSelected,
    isEditing,
    handleColumnDragStart,
    handleColumnDragOver,
    handleColumnDrop,
    handleToggleColumn,
    handleSort,
    handleResize,
    handleSelectAll,
    handleToggleSelect,
    handleStartEdit,
    handleCancelEdit,
    handleSaveCell,
    handleRowClick,
    openCardDetail,
  } = useListView(cards, onReorder);

  // Render cell content
  const renderCell = (card: LocalCard, column: ColumnId) => {
    const displayTitle = card.title || card.url || 'Untitled';
    const cardType = getCardType(card);
    const createdDate = card.createdAt ? format(new Date(card.createdAt), 'MM/dd/yyyy') : '-';
    const modifiedDate = card.updatedAt ? format(new Date(card.updatedAt), 'MM/dd/yyyy') : '-';
    const scheduledDateFormatted = card.scheduledDate ? format(new Date(card.scheduledDate), 'MM/dd/yyyy') : '-';
    const tags = card.tags || [];
    const collections = card.collections || [];

    switch (column) {
      case 'name':
        if (card.type === 'quick-note') {
          const plainContent = card.content?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || '';
          return (
            <div className="flex items-center gap-3 min-w-0" onClick={(e) => e.stopPropagation()}>
              <span className="flex items-center justify-center h-8 w-8 rounded-lg bg-[var(--bg-surface-3)] flex-shrink-0 border-l-2 border-l-[var(--color-accent)]">
                <ListRowIcon card={card} />
              </span>
              <div className="flex-1 min-w-0">
                <EditableCell
                  value={plainContent}
                  cardId={card.id}
                  field="content"
                  onSave={(cardId, field, value) => {
                    const htmlContent = `<p>${value.replace(/\n/g, '</p><p>')}</p>`;
                    handleSaveCell(cardId, field, htmlContent);
                  }}
                  isEditing={isEditing(card.id, 'name')}
                  onStartEdit={() => handleStartEdit(card.id, 'name')}
                  onCancelEdit={handleCancelEdit}
                  placeholder="Empty note"
                  multiline
                />
              </div>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex items-center justify-center h-8 w-8 rounded-lg bg-[var(--bg-surface-3)] flex-shrink-0">
              <ListRowIcon card={card} />
            </span>
            <span className="text-sm text-[var(--color-text-primary)] font-medium truncate min-w-0 flex-1">
              {displayTitle}
            </span>
          </div>
        );
      case 'type':
        return <span className="text-sm text-[var(--color-text-muted)]">{cardType}</span>;
      case 'tags':
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <EditableTagsCell
              tags={tags}
              cardId={card.id}
              onSave={handleSaveCell}
              isEditing={isEditing(card.id, 'tags')}
              onStartEdit={() => handleStartEdit(card.id, 'tags')}
              onCancelEdit={handleCancelEdit}
            />
          </div>
        );
      case 'createdAt':
        return <span className="text-sm text-[var(--color-text-muted)]">{createdDate}</span>;
      case 'updatedAt':
        return <span className="text-sm text-[var(--color-text-muted)]">{modifiedDate}</span>;
      case 'url':
        return card.url ? (
          <a
            href={card.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-sm text-[var(--color-accent)] hover:underline truncate block"
          >
            {card.url}
          </a>
        ) : (
          <span className="text-sm text-[var(--color-text-muted)]">-</span>
        );
      case 'domain':
        return (
          <span className="text-sm text-[var(--color-text-muted)] truncate block">
            {card.domain || '-'}
          </span>
        );
      case 'description':
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <EditableCell
              value={card.description || ''}
              cardId={card.id}
              field="description"
              onSave={handleSaveCell}
              isEditing={isEditing(card.id, 'description')}
              onStartEdit={() => handleStartEdit(card.id, 'description')}
              onCancelEdit={handleCancelEdit}
            />
          </div>
        );
      case 'collections':
        return (
          <div className="flex flex-wrap gap-1">
            {collections.length > 0 ? (
              collections.slice(0, 2).map((col) => (
                <span
                  key={col}
                  className="text-xs text-[var(--color-text-muted)] bg-[var(--bg-surface-3)] px-2 py-0.5 rounded"
                >
                  {col}
                </span>
              ))
            ) : (
              <span className="text-sm text-[var(--color-text-muted)]">-</span>
            )}
          </div>
        );
      case 'status':
        const statusColors: Record<string, string> = {
          READY: 'text-green-400',
          PENDING: 'text-yellow-400',
          ERROR: 'text-red-400',
        };
        return (
          <span className={cn('text-xs font-medium', statusColors[card.status] || 'text-[var(--color-text-muted)]')}>
            {card.status}
          </span>
        );
      case 'pinned':
        return card.pinned ? (
          <Pin className="h-4 w-4 text-[var(--color-accent)]" />
        ) : (
          <span className="text-sm text-[var(--color-text-muted)]">-</span>
        );
      case 'scheduledDate':
        return (
          <span className="text-sm text-[var(--color-text-muted)]">{scheduledDateFormatted}</span>
        );
      case 'thumbnail':
        return card.image ? (
          <Image
            src={card.image}
            alt=""
            width={40}
            height={30}
            className="rounded object-cover"
          />
        ) : (
          <span className="text-sm text-[var(--color-text-muted)]">-</span>
        );
      case 'notes':
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <EditableCell
              value={card.notes || ''}
              cardId={card.id}
              field="notes"
              onSave={handleSaveCell}
              isEditing={isEditing(card.id, 'notes')}
              onStartEdit={() => handleStartEdit(card.id, 'notes')}
              onCancelEdit={handleCancelEdit}
              multiline
            />
          </div>
        );
      default:
        return null;
    }
  };

  const renderRow = (card: LocalCard) => {
    const isSelected = selectedIds.has(card.id);
    const isDragging = activeRowId === card.id;
    const isDropTarget = overRowId === card.id && activeRowId !== card.id;

    return (
      <CardContextMenu key={card.id} card={card} currentCollection={currentCollection}>
        <SortableListRow
          card={card}
          isDragging={isDragging}
          isDropTarget={isDropTarget}
        >
          <div
            onClick={() => handleRowClick(card)}
            className={cn(
              'flex flex-1 cursor-pointer transition-colors',
              isSelected
                ? 'bg-[var(--color-accent)]/10 hover:bg-[var(--color-accent)]/15'
                : 'hover:bg-[var(--bg-surface-2)]'
            )}
          >
            <div className="w-12 py-3 px-4 flex-shrink-0 flex items-center">
              <button
                onClick={(e) => handleToggleSelect(card.id, e)}
                className={cn(
                  'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                  isSelected
                    ? 'bg-[var(--color-accent)] border-[var(--color-accent)]'
                    : 'border-[var(--color-text-muted)]/40 hover:border-[var(--color-text-muted)]/60'
                )}
              >
                {isSelected && <Check className="h-3 w-3 text-white" />}
              </button>
            </div>
            {columnOrder.map((col) => (
              <div
                key={col}
                className="py-3 px-4 flex-shrink-0 overflow-hidden"
                style={{ width: columnWidths[col] }}
              >
                {renderCell(card, col)}
              </div>
            ))}
            <div className="py-3 px-4 flex-shrink-0 w-12" onClick={(e) => e.stopPropagation()}>
              <ListRowActions card={card} onEdit={() => openCardDetail(card.id)} />
            </div>
          </div>
        </SortableListRow>
      </CardContextMenu>
    );
  };

  return (
    <>
      <div className="w-full overflow-x-auto relative">
        {/* Header row */}
        <div
          className="sticky top-0 z-20 flex border-b border-[var(--color-text-muted)]/20 text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-surface)]/95 backdrop-blur-sm"
          style={{ minWidth: 'max-content' }}
        >
          <div className="w-12 py-3 px-4 flex-shrink-0 flex items-center">
            <button
              onClick={handleSelectAll}
              className={cn(
                'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                allSelected
                  ? 'bg-[var(--color-accent)] border-[var(--color-accent)]'
                  : someSelected
                    ? 'bg-[var(--color-accent)]/50 border-[var(--color-accent)]'
                    : 'border-[var(--color-text-muted)]/40 hover:border-[var(--color-text-muted)]/60'
              )}
            >
              {allSelected && <Check className="h-3 w-3 text-white" />}
              {someSelected && <Minus className="h-3 w-3 text-white" />}
            </button>
          </div>
          {columnOrder.map((col) => (
            <ResizableHeader
              key={col}
              column={col}
              label={COLUMN_LABELS[col]}
              width={columnWidths[col]}
              onResize={handleResize}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              onDragStart={handleColumnDragStart}
              onDragOver={handleColumnDragOver}
              onDrop={handleColumnDrop}
              isDragOver={dragOverColumn === col}
            />
          ))}
          <div className="py-2 px-2 flex-shrink-0 flex items-center gap-1">
            <ColumnPicker visibleColumns={columnOrder} onToggleColumn={handleToggleColumn} />
          </div>
        </div>

        {/* Data rows */}
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          <div>
            {groups && groups.length > 0 ? (
              groups.map((group) => (
                <div key={group.key}>
                  <GroupSeparator label={group.label} count={group.cards.length} icon={groupIcon} />
                  {group.cards.map(renderRow)}
                </div>
              ))
            ) : (
              sortedCards.map(renderRow)
            )}
          </div>
        </SortableContext>
      </div>

      {/* Drag overlay */}
      {typeof document !== 'undefined' &&
        createPortal(
          <DragOverlay
            adjustScale={false}
            dropAnimation={null}
            modifiers={[centerOverlayOnCursor]}
            style={{ zIndex: 9999 }}
          >
            {activeDragCard && (
              <div
                style={{
                  width: 200,
                  opacity: 0.85,
                  transform: 'rotate(-2deg)',
                  pointerEvents: 'none',
                  filter: 'drop-shadow(0 8px 24px rgba(0, 0, 0, 0.4))',
                }}
              >
                <CardItem card={activeDragCard} variant="grid" />
              </div>
            )}
          </DragOverlay>,
          document.body
        )}
    </>
  );
}

// Re-export types for backward compatibility
export type { ColumnId, CardGroup, CardListViewProps } from './types';
export { DEFAULT_COLUMN_ORDER, ALL_COLUMNS, DEFAULT_COLUMN_WIDTHS, COLUMN_LABELS } from './types';
