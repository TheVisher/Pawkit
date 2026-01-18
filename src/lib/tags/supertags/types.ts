/**
 * Supertag Type Definitions
 */

export interface SupertagDefinition {
  /** The tag string (lowercase, no hash) */
  tag: string;

  /** Human-readable display name */
  displayName: string;

  /** Icon name (for lucide or emoji mapping) */
  icon: string;

  /** Description of what this supertag is for */
  description: string;

  /** Suggested fields for the note template */
  suggestedFields?: string[];

  /** HTML template for new notes with this tag */
  template?: string;

  /** UI behavior hints */
  uiHints?: {
    /** Show checkboxes for markdown task lists */
    showCheckboxes?: boolean;

    /** Which home widget should display these cards */
    showInWidget?: 'todo-widget' | 'bills-widget' | 'reading-widget' | 'birthdays-widget';

    /** Fields to parse for calendar event creation */
    calendarFields?: string[];

    /** Whether this supertag implies clickable protocol links */
    hasProtocolLinks?: boolean;
  };

  /** Available quick actions for cards with this supertag */
  actions?: Array<{
    id: string;
    label: string;
    icon?: string;
    /** URL protocol to use (e.g., 'tel:', 'mailto:') */
    protocol?: string;
    /** Field to extract the value from */
    field?: string;
  }>;

  /** Section definitions for this supertag (for template panel) */
  sections?: Record<string, TemplateSection>;

  /** Template type variants (e.g., Personal, Work for contacts) */
  templateTypes?: Record<string, TemplateType>;
}

export interface TemplateSection {
  id: string;
  name: string;
  /** @deprecated Use listJson instead - HTML templates are converted at runtime */
  listHtml: string;
  /** @deprecated Use tableJson instead - HTML templates are converted at runtime */
  tableHtml: string;
  /** Native Plate JSON template for list format (preferred) */
  listJson?: import('platejs').Descendant[];
  /** Native Plate JSON template for table format (preferred) */
  tableJson?: import('platejs').Descendant[];
}

export interface TemplateType {
  name: string;
  description: string;
  defaultSections: string[];
}

export type TemplateFormat = 'list' | 'table';
