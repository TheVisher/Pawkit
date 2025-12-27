'use client';

import { cn } from '@/lib/utils';

interface PageHeaderProps {
  /** Main title text (e.g., "Library", "Calendar", or greeting) */
  title: React.ReactNode;
  /** Optional subtitle/meta line above the title */
  subtitle?: React.ReactNode;
  /** Optional right-aligned actions */
  actions?: React.ReactNode;
  /** Additional className for the container */
  className?: string;
}

/**
 * Consistent page header component for all center panel views.
 *
 * Usage:
 * - Home: <PageHeader subtitle={<DateDisplay />} title={<Greeting />} />
 * - Library: <PageHeader title="Library" subtitle="12 items" />
 * - Calendar: <PageHeader title="Calendar" actions={<ViewToggles />} />
 * - Pawkit: <PageHeader title={collection.name} subtitle={<Breadcrumbs />} />
 *
 * Styling spec (from Home view):
 * - Container: pt-5 pb-4 px-6 min-h-[76px]
 * - Subtitle: text-xs text-text-muted
 * - Title: text-2xl font-semibold text-text-primary
 */
export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('pt-5 pb-4 px-4 md:px-6 min-h-[76px]', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-0.5 min-w-0 flex-1">
          {subtitle && (
            <div className="text-xs text-text-muted">
              {subtitle}
            </div>
          )}
          <h1 className="text-2xl font-semibold text-text-primary truncate">
            {title}
          </h1>
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
