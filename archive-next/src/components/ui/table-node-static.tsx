import * as React from 'react';

import type { TTableCellElement, TTableElement } from 'platejs';
import type { SlateElementProps } from 'platejs/static';

import { BaseTablePlugin } from '@platejs/table';
import { SlateElement } from 'platejs/static';

import { cn } from '@/lib/utils';

export function TableElementStatic({
  children,
  ...props
}: SlateElementProps<TTableElement>) {
  const { disableMarginLeft } = props.editor.getOptions(BaseTablePlugin);
  const marginLeft = disableMarginLeft ? 0 : props.element.marginLeft;

  return (
    <SlateElement
      {...props}
      className="overflow-x-auto py-5"
      style={{ paddingLeft: marginLeft }}
    >
      <div className="group/table relative w-fit">
        <table className="mr-0 ml-px table h-px table-fixed border-collapse">
          <tbody className="min-w-full">{children}</tbody>
        </table>
      </div>
    </SlateElement>
  );
}

export function TableRowElementStatic(props: SlateElementProps) {
  return (
    <SlateElement {...props} as="tr" className="h-full">
      {props.children}
    </SlateElement>
  );
}

export function TableCellElementStatic({
  isHeader,
  ...props
}: SlateElementProps<TTableCellElement> & {
  isHeader?: boolean;
}) {
  const { editor, element } = props;
  const { api } = editor.getPlugin(BaseTablePlugin);

  const { minHeight, width } = api.table.getCellSize({ element });
  const borders = api.table.getCellBorders({ element });

  // Get span values
  const cellColSpan = api.table.getColSpan(element);
  const cellRowSpan = api.table.getRowSpan(element);

  // Filter out colSpan/rowSpan from element to prevent React DOM warnings
  // These properties are stored on the Plate node but shouldn't be passed as HTML attributes
  // We apply them via ref callback instead (see below)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { colSpan: _elColSpan, rowSpan: _elRowSpan, attributes: elAttributes, ...restElement } = element as typeof element & { colSpan?: number; rowSpan?: number };

  // Also filter colspan/rowspan from element.attributes (Plate stores them there too)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { colspan: _attrColspan, rowspan: _attrRowspan, ...filteredAttributes } = (elAttributes || {}) as Record<string, unknown> & { colspan?: string; rowspan?: string };

  // Create filtered element with filtered attributes
  const filteredElement = {
    ...restElement,
    attributes: Object.keys(filteredAttributes).length > 0 ? filteredAttributes : undefined,
  } as TTableCellElement;

  // Also filter from props in case they're passed directly
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { colSpan: _colSpan, rowSpan: _rowSpan, element: _element, ...restProps } = props as typeof props & { colSpan?: number; rowSpan?: number };

  // Create filtered props with the filtered element
  const filteredProps = {
    ...restProps,
    element: filteredElement,
  };

  return (
    <SlateElement
      {...filteredProps}
      as={isHeader ? 'th' : 'td'}
      className={cn(
        'h-full overflow-visible border-none bg-background p-0',
        element.background ? 'bg-(--cellBackground)' : 'bg-background',
        isHeader && 'text-left font-normal *:m-0',
        'before:size-full',
        "before:absolute before:box-border before:select-none before:content-['']",
        borders &&
          cn(
            borders.bottom?.size && 'before:border-b before:border-b-border',
            borders.right?.size && 'before:border-r before:border-r-border',
            borders.left?.size && 'before:border-l before:border-l-border',
            borders.top?.size && 'before:border-t before:border-t-border'
          )
      )}
      style={
        {
          '--cellBackground': element.background,
          maxWidth: width || 240,
          minWidth: width || 120,
        } as React.CSSProperties
      }
      attributes={{
        ...filteredProps.attributes,
        // Use ref callback to set colSpan/rowSpan to avoid React DOM property warning
        ref: (el: HTMLTableCellElement | null) => {
          if (el) {
            if (cellColSpan > 1) el.colSpan = cellColSpan;
            if (cellRowSpan > 1) el.rowSpan = cellRowSpan;
          }
          // Call original ref if present
          const originalRef = filteredProps.attributes?.ref;
          if (typeof originalRef === 'function') {
            originalRef(el);
          } else if (originalRef && 'current' in originalRef) {
            (originalRef as React.MutableRefObject<HTMLTableCellElement | null>).current = el;
          }
        },
      }}
    >
      <div
        className="relative z-20 box-border h-full px-4 py-2"
        style={{ minHeight }}
      >
        {filteredProps.children}
      </div>
    </SlateElement>
  );
}

export function TableCellHeaderElementStatic(
  props: SlateElementProps<TTableCellElement>
) {
  return <TableCellElementStatic {...props} isHeader />;
}
