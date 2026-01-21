'use client';

/**
 * Pawkit Mention Node Components
 *
 * Custom mention elements for Pawkit's 3 mention types with
 * type-based styling and click handlers for navigation.
 */

import * as React from 'react';
import { useCallback, useMemo } from 'react';
import { useRouter } from '@/lib/navigation';
import { parseISO, format } from 'date-fns';

import type { TComboboxInputElement, TMentionElement } from 'platejs';
import type { PlateElementProps } from 'platejs/react';

import { MentionInputPlugin } from '@platejs/mention/react';
import { IS_APPLE, KEYS } from 'platejs';
import {
  PlateElement,
  useFocused,
  useReadOnly,
  useSelected,
  useEditorRef,
} from 'platejs/react';

import { cn } from '@/lib/utils';
import { useMounted } from '@/hooks/use-mounted';
import { useModalStore } from '@/lib/stores/modal-store';
import { useCalendarStore } from '@/lib/stores/calendar-store';
import { useMentionSearch, type MentionItem } from '@/lib/hooks/use-mention-search';

import {
  InlineCombobox,
  InlineComboboxContent,
  InlineComboboxEmpty,
  InlineComboboxGroup,
  InlineComboboxGroupLabel,
  InlineComboboxInput,
  InlineComboboxItem,
} from './inline-combobox';

// Mention type for Pawkit
export type MentionType = 'card' | 'pawkit' | 'date';

// Extended mention element with Pawkit attributes
interface PawkitMentionElement extends TMentionElement {
  id?: string;
  mentionType?: MentionType;
  deleted?: boolean;
}

/**
 * Get styling classes based on mention type
 */
function getMentionTypeStyles(type: MentionType, deleted?: boolean): string {
  const baseStyles = 'inline-block rounded-md px-1.5 py-0.5 align-baseline font-medium text-sm';

  if (deleted) {
    return cn(baseStyles, 'bg-red-500/10 text-red-400 line-through');
  }

  switch (type) {
    case 'card':
      return cn(baseStyles, 'bg-teal-500/15 text-teal-400');
    case 'pawkit':
      return cn(baseStyles, 'bg-purple-500/15 text-purple-400');
    case 'date':
      return cn(baseStyles, 'bg-blue-500/15 text-blue-400');
    default:
      return cn(baseStyles, 'bg-muted text-foreground');
  }
}

/**
 * Pawkit Mention Element
 *
 * Renders a mention pill with type-based styling and click handlers.
 */
export function PawkitMentionElement(
  props: PlateElementProps<PawkitMentionElement> & {
    prefix?: string;
  }
) {
  const element = props.element;
  const router = useRouter();
  const openCardDetail = useModalStore((s) => s.openCardDetail);
  const setCalendarDate = useCalendarStore((s) => s.setDate);

  const selected = useSelected();
  const focused = useFocused();
  const mounted = useMounted();
  const readOnly = useReadOnly();

  const mentionType = (element.mentionType || 'card') as MentionType;
  const mentionId = element.id as string | undefined;
  const isDeleted = element.deleted === true;

  // Handle click on mention
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!mentionId || isDeleted) return;

      switch (mentionType) {
        case 'card':
          // Open card in detail modal
          openCardDetail(mentionId);
          break;
        case 'pawkit':
          // Navigate to Pawkit page
          router.push(`/pawkits/${mentionId}`);
          break;
        case 'date':
          // Navigate to calendar with date
          try {
            const date = parseISO(mentionId);
            setCalendarDate(date);
            router.push('/calendar');
          } catch {
            console.error('[PawkitMention] Invalid date:', mentionId);
          }
          break;
      }
    },
    [mentionType, mentionId, isDeleted, openCardDetail, router, setCalendarDate]
  );

  return (
    <PlateElement
      {...props}
      className={cn(
        getMentionTypeStyles(mentionType, isDeleted),
        !readOnly && !isDeleted && 'cursor-pointer hover:opacity-80',
        selected && focused && 'ring-2 ring-ring',
        element.children[0]?.[KEYS.bold] === true && 'font-bold',
        element.children[0]?.[KEYS.italic] === true && 'italic',
        element.children[0]?.[KEYS.underline] === true && 'underline'
      )}
      attributes={{
        ...props.attributes,
        contentEditable: false,
        'data-slate-value': element.value,
        'data-mention-type': mentionType,
        'data-mention-id': mentionId,
        draggable: true,
      }}
    >
      <span onClick={handleClick} role="button" tabIndex={0}>
        {mounted && IS_APPLE ? (
          <>
            {props.children}
            {props.prefix || '@'}
            {element.value}
          </>
        ) : (
          <>
            {props.prefix || '@'}
            {element.value}
            {props.children}
          </>
        )}
      </span>
    </PlateElement>
  );
}

/**
 * Insert a mention with custom Pawkit attributes
 */
function insertPawkitMention(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: any,
  item: MentionItem
) {
  // Find and remove the mention input element
  const inputPath = editor.api.node({
    match: { type: MentionInputPlugin.key },
  })?.[1];

  if (inputPath) {
    editor.tf.removeNodes({ at: inputPath });
  }

  // Insert the mention node with all custom attributes
  editor.tf.insertNodes({
    type: 'mention',
    value: item.label,
    id: item.id,
    mentionType: item.type,
    children: [{ text: '' }],
  });

  // Move cursor after the mention
  editor.tf.move({ unit: 'offset' });
}

/**
 * Pawkit Mention Input Element
 *
 * Renders the mention search dropdown with categories.
 */
export function PawkitMentionInputElement(
  props: PlateElementProps<TComboboxInputElement>
) {
  const { editor, element } = props;
  const [search, setSearch] = React.useState('');

  // Get workspaceId from editor context or meta
  const workspaceId = (editor.meta?.workspaceId as string) || undefined;

  // Use Pawkit's mention search hook
  const searchResults = useMentionSearch(search, workspaceId, 5);

  // Flatten results into groups for rendering
  const groups = useMemo(() => {
    const result: { label: string; items: MentionItem[] }[] = [];

    if (searchResults.dates.length > 0) {
      result.push({ label: 'Dates', items: searchResults.dates });
    }
    if (searchResults.recent.length > 0) {
      result.push({ label: 'Recent', items: searchResults.recent });
    }
    if (searchResults.notes.length > 0) {
      result.push({ label: 'Notes', items: searchResults.notes });
    }
    if (searchResults.bookmarks.length > 0) {
      result.push({ label: 'Bookmarks', items: searchResults.bookmarks });
    }
    if (searchResults.pawkits.length > 0) {
      result.push({ label: 'Pawkits', items: searchResults.pawkits });
    }

    return result;
  }, [searchResults]);

  return (
    <PlateElement {...props} as="span">
      <InlineCombobox
        value={search}
        element={element}
        setValue={setSearch}
        showTrigger={false}
        trigger="@"
        filter={false} // We do our own filtering in useMentionSearch
      >
        <span className="inline-block rounded-md bg-muted px-1.5 py-0.5 align-baseline text-sm ring-ring focus-within:ring-2">
          <InlineComboboxInput />
        </span>

        <InlineComboboxContent className="my-1.5 max-h-80 overflow-y-auto">
          {searchResults.isEmpty ? (
            <InlineComboboxEmpty>No results found</InlineComboboxEmpty>
          ) : (
            groups.map((group) => (
              <InlineComboboxGroup key={group.label}>
                <InlineComboboxGroupLabel>{group.label}</InlineComboboxGroupLabel>
                {group.items.map((item, index) => (
                  <InlineComboboxItem
                    key={`${group.label}-${item.type}-${item.id}-${index}`}
                    value={item.label}
                    onClick={() => insertPawkitMention(editor, item)}
                    className={cn(
                      'flex items-center gap-2',
                      item.type === 'card' && 'text-teal-400',
                      item.type === 'pawkit' && 'text-purple-400',
                      item.type === 'date' && 'text-blue-400'
                    )}
                  >
                    {item.icon && <span className="text-sm">{item.icon}</span>}
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.subtitle && (
                      <span className="text-xs text-muted-foreground">
                        {item.subtitle}
                      </span>
                    )}
                  </InlineComboboxItem>
                ))}
              </InlineComboboxGroup>
            ))
          )}
        </InlineComboboxContent>
      </InlineCombobox>

      {props.children}
    </PlateElement>
  );
}
