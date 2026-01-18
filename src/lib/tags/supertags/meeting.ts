/**
 * Meeting Supertag
 * For meeting notes with attendees, agenda, and action items
 */

import type { SupertagDefinition, TemplateSection, TemplateType, TemplateFormat } from './types';
import { isPlateJson, parseJsonContent } from '@/lib/plate/html-to-plate';

// =============================================================================
// TYPES
// =============================================================================

export type MeetingTemplateType = 'one-on-one' | 'team' | 'client' | 'brainstorm';

// =============================================================================
// SECTIONS
// =============================================================================

export const MEETING_SECTIONS: Record<string, TemplateSection> = {
  'meeting-info': {
    id: 'meeting-info',
    name: 'Meeting Info',
    // CRITICAL: Date field is parsed by calendar sync - do not change field name
    listHtml: `<h2>Meeting Info</h2>
<ul>
<li><strong>Date:</strong>&nbsp;</li>
<li><strong>Time:</strong>&nbsp;</li>
<li><strong>Duration:</strong>&nbsp;</li>
<li><strong>Location:</strong>&nbsp;</li>
<li><strong>Meeting URL:</strong>&nbsp;</li>
</ul>`,
    tableHtml: `<h2>Meeting Info</h2>
<table><tbody>
<tr><td><strong>Date</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Time</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Duration</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Location</strong></td><td>&nbsp;</td></tr>
<tr><td><strong>Meeting URL</strong></td><td>&nbsp;</td></tr>
</tbody></table>`,
  },
  attendees: {
    id: 'attendees',
    name: 'Attendees',
    listHtml: `<h2>Attendees</h2>
<ul>
<li></li>
</ul>`,
    tableHtml: `<h2>Attendees</h2>
<ul>
<li></li>
</ul>`,
  },
  agenda: {
    id: 'agenda',
    name: 'Agenda',
    listHtml: `<h2>Agenda</h2>
<ol>
<li></li>
</ol>`,
    tableHtml: `<h2>Agenda</h2>
<ol>
<li></li>
</ol>`,
  },
  discussion: {
    id: 'discussion',
    name: 'Discussion',
    listHtml: `<h2>Discussion</h2>
<p></p>`,
    tableHtml: `<h2>Discussion</h2>
<p></p>`,
  },
  decisions: {
    id: 'decisions',
    name: 'Decisions',
    listHtml: `<h2>Decisions</h2>
<ul>
<li></li>
</ul>`,
    tableHtml: `<h2>Decisions</h2>
<ul>
<li></li>
</ul>`,
  },
  'action-items': {
    id: 'action-items',
    name: 'Action Items',
    listHtml: `<h2>Action Items</h2>
<ul data-type="taskList">
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div><p></p></div></li>
</ul>`,
    tableHtml: `<h2>Action Items</h2>
<ul data-type="taskList">
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div><p></p></div></li>
</ul>`,
  },
  notes: {
    id: 'notes',
    name: 'Notes',
    listHtml: `<h2>Notes</h2>
<p></p>`,
    tableHtml: `<h2>Notes</h2>
<p></p>`,
  },
};

// =============================================================================
// TEMPLATE TYPES
// =============================================================================

export const MEETING_TEMPLATE_TYPES: Record<string, TemplateType> = {
  'one-on-one': {
    name: '1:1',
    description: 'Personal check-in, coaching',
    defaultSections: ['meeting-info', 'agenda', 'discussion', 'action-items', 'notes'],
  },
  team: {
    name: 'Team',
    description: 'Team sync, standup',
    defaultSections: ['meeting-info', 'attendees', 'agenda', 'decisions', 'action-items', 'notes'],
  },
  client: {
    name: 'Client',
    description: 'External stakeholder meetings',
    defaultSections: ['meeting-info', 'attendees', 'agenda', 'discussion', 'decisions', 'action-items', 'notes'],
  },
  brainstorm: {
    name: 'Brainstorm',
    description: 'Ideation session',
    defaultSections: ['meeting-info', 'attendees', 'agenda', 'discussion', 'notes'],
  },
};

// =============================================================================
// INFO EXTRACTION (for quick actions)
// =============================================================================

/**
 * Extract all text content from a Plate JSON node recursively
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractTextFromPlateNode(node: any): string {
  if ('text' in node && typeof node.text === 'string') {
    return node.text;
  }
  if ('children' in node && Array.isArray(node.children)) {
    return node.children.map(extractTextFromPlateNode).join('');
  }
  return '';
}

/**
 * Extract links from Plate JSON content with context
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractLinksFromPlateJson(content: any[]): { url: string; context: string }[] {
  const links: { url: string; context: string }[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function traverse(node: any, parentText: string = ''): void {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'a' && node.url) {
      links.push({ url: node.url, context: parentText });
    }

    if (node.children && Array.isArray(node.children)) {
      const nodeText = extractTextFromPlateNode(node);
      for (const child of node.children) {
        traverse(child, nodeText);
      }
    }
  }

  for (const node of content) {
    traverse(node, '');
  }

  return links;
}

/**
 * Extract field values from Plate JSON content
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractFieldValuesFromPlateJson(content: any[]): Record<string, string> {
  const values: Record<string, string> = {};

  for (const node of content) {
    if ('type' in node && (node.type === 'ul' || node.type === 'ol' || node.type === 'li')) {
      const text = extractTextFromPlateNode(node);
      const lines = text.split(/\n/);
      for (const line of lines) {
        const colonMatch = line.match(/^([^:]+):\s*(.*)$/);
        if (colonMatch) {
          const label = colonMatch[1].trim();
          const value = colonMatch[2].trim();
          if (value && value !== '&nbsp;') {
            values[label] = value;
          }
        }
      }
    }

    if ('children' in node && Array.isArray(node.children)) {
      const childValues = extractFieldValuesFromPlateJson(node.children);
      Object.assign(values, childValues);
    }
  }

  return values;
}

/**
 * Extract meeting info from Plate JSON content
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractMeetingInfoFromPlateJson(content: any[]): { meetingUrl?: string } {
  const result: { meetingUrl?: string } = {};

  // Extract links
  const links = extractLinksFromPlateJson(content);

  // Look for meeting URL link
  for (const link of links) {
    if (!result.meetingUrl && link.context.toLowerCase().includes('meeting url')) {
      if (link.url.startsWith('http') || link.url.includes('.')) {
        result.meetingUrl = link.url.startsWith('http') ? link.url : `https://${link.url}`;
      }
    }
  }

  // Fall back to field value extraction
  if (!result.meetingUrl) {
    const fieldValues = extractFieldValuesFromPlateJson(content);
    if (fieldValues['Meeting URL']) {
      const url = fieldValues['Meeting URL'];
      if (url.startsWith('http') || url.includes('.')) {
        result.meetingUrl = url.startsWith('http') ? url : `https://${url}`;
      }
    }
  }

  return result;
}

export function extractMeetingInfo(content: string): {
  meetingUrl?: string;
} {
  // Check if content is Plate JSON
  if (isPlateJson(content)) {
    const parsed = parseJsonContent(content);
    if (parsed) {
      return extractMeetingInfoFromPlateJson(parsed);
    }
  }

  // Fall back to HTML parsing
  const result: { meetingUrl?: string } = {};

  // Extract meeting URL
  const urlMatch = content.match(/<strong>Meeting URL:?<\/strong>(?:&nbsp;|\s)*(?:<a[^>]*href="([^"]+)"[^>]*>|([^\s<]+))/i);
  if (urlMatch) {
    const url = urlMatch[1] || urlMatch[2];
    if (url && url !== '&nbsp;' && (url.startsWith('http') || url.includes('.'))) {
      result.meetingUrl = url.startsWith('http') ? url : `https://${url}`;
    }
  }

  return result;
}

// =============================================================================
// TEMPLATE BUILDERS
// =============================================================================

export function buildMeetingTemplate(sectionIds: string[], format: TemplateFormat = 'list'): string {
  return sectionIds
    .map((id) => {
      const section = MEETING_SECTIONS[id];
      if (!section) return '';
      return format === 'list' ? section.listHtml : section.tableHtml;
    })
    .filter(Boolean)
    .join('\n');
}

export function getMeetingTemplate(type: string = 'team', format: TemplateFormat = 'list'): string {
  const templateType = MEETING_TEMPLATE_TYPES[type];
  if (!templateType) return buildMeetingTemplate(['meeting-info', 'attendees', 'agenda', 'action-items', 'notes'], format);
  return buildMeetingTemplate(templateType.defaultSections, format);
}

export function getMeetingSection(sectionId: string, format: TemplateFormat = 'list'): string | null {
  const section = MEETING_SECTIONS[sectionId];
  if (!section) return null;
  return format === 'list' ? section.listHtml : section.tableHtml;
}

// =============================================================================
// DEFINITION
// =============================================================================

const DEFAULT_TEMPLATE = getMeetingTemplate('team', 'list');

export const meetingSupertag: SupertagDefinition = {
  tag: 'meeting',
  displayName: 'Meeting',
  icon: 'calendar',
  description: 'Meeting notes with attendees and action items',
  suggestedFields: ['date', 'attendees', 'agenda', 'actionItems'],
  template: DEFAULT_TEMPLATE,
  uiHints: {
    showCheckboxes: true,
    calendarFields: ['date'],
  },
  actions: [
    { id: 'join-meeting', label: 'Join Meeting', icon: 'video', field: 'meetingUrl' },
  ],
  sections: MEETING_SECTIONS,
  templateTypes: MEETING_TEMPLATE_TYPES,
};
