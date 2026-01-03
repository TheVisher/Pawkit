'use client';

/**
 * Generic Supertag Panel
 * Works with any supertag that has sections defined
 * Allows switching template types, adding/removing/reordering sections, format toggle
 */

import { useState, useCallback, useMemo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  GripVertical,
  LayoutList,
  Table2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SupertagDefinition, TemplateSection, TemplateFormat } from '@/lib/tags/supertags';

interface SupertagPanelProps {
  supertag: SupertagDefinition;
  content: string;
  onContentChange: (newContent: string) => void;
}

// =============================================================================
// SECTION DETECTION & MANIPULATION (generic versions)
// =============================================================================

function detectSectionsInContent(content: string, sections: Record<string, TemplateSection>): string[] {
  const detected: { id: string; index: number }[] = [];
  const lower = content.toLowerCase();

  for (const [id, section] of Object.entries(sections)) {
    // Look for the section header in content
    const sectionNameLower = section.name.toLowerCase();
    const idx = lower.indexOf(`>${sectionNameLower}<`);
    if (idx > -1) {
      detected.push({ id, index: idx });
    } else {
      // Also try without the angle brackets (for h2 text content)
      const h2Idx = lower.indexOf(`<h2>${sectionNameLower}</h2>`);
      if (h2Idx > -1) {
        detected.push({ id, index: h2Idx });
      }
    }
  }

  return detected.sort((a, b) => a.index - b.index).map((d) => d.id);
}

function getSectionHtml(section: TemplateSection, format: TemplateFormat): string {
  return format === 'list' ? section.listHtml : section.tableHtml;
}

function removeSectionFromContent(
  content: string,
  sectionId: string,
  sections: Record<string, TemplateSection>
): string {
  const section = sections[sectionId];
  if (!section) return content;

  const headerRegex = new RegExp(`<h2>${section.name}</h2>`, 'i');
  const match = content.match(headerRegex);

  if (!match || match.index === undefined) return content;

  const startIndex = match.index;
  const afterHeader = content.slice(startIndex + match[0].length);
  const nextH2Match = afterHeader.match(/<h2>/i);

  const endIndex = nextH2Match?.index !== undefined
    ? startIndex + match[0].length + nextH2Match.index
    : content.length;

  return (content.slice(0, startIndex) + content.slice(endIndex)).trim();
}

function extractSectionFromContent(
  content: string,
  sectionId: string,
  sections: Record<string, TemplateSection>
): string | null {
  const section = sections[sectionId];
  if (!section) return null;

  const headerRegex = new RegExp(`<h2>${section.name}</h2>`, 'i');
  const match = content.match(headerRegex);

  if (!match || match.index === undefined) return null;

  const startIndex = match.index;
  const afterHeader = content.slice(startIndex + match[0].length);
  const nextH2Match = afterHeader.match(/<h2>/i);

  const endIndex = nextH2Match?.index !== undefined
    ? startIndex + match[0].length + nextH2Match.index
    : content.length;

  return content.slice(startIndex, endIndex).trim();
}

function reorderSections(
  content: string,
  newOrder: string[],
  sections: Record<string, TemplateSection>
): string {
  const extracted: string[] = [];

  for (const sectionId of newOrder) {
    const html = extractSectionFromContent(content, sectionId, sections);
    if (html) {
      extracted.push(html);
    }
  }

  return extracted.join('\n');
}

function buildTemplate(
  sectionIds: string[],
  format: TemplateFormat,
  sections: Record<string, TemplateSection>
): string {
  return sectionIds
    .map((id) => {
      const section = sections[id];
      return section ? getSectionHtml(section, format) : '';
    })
    .filter(Boolean)
    .join('\n');
}

// =============================================================================
// COMPONENT
// =============================================================================

export function SupertagPanel({ supertag, content, onContentChange }: SupertagPanelProps) {
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [format, setFormat] = useState<TemplateFormat>('list');
  const [draggedSection, setDraggedSection] = useState<string | null>(null);

  const sections = supertag.sections || {};
  const templateTypes = supertag.templateTypes;
  const hasSections = Object.keys(sections).length > 0;
  const hasTemplateTypes = templateTypes && Object.keys(templateTypes).length > 0;

  // Detect which sections are currently in the content
  const sectionsInUse = useMemo(
    () => detectSectionsInContent(content, sections),
    [content, sections]
  );

  // Get sections that can be added
  const availableSections = useMemo(() => {
    return Object.values(sections).filter((section) => !sectionsInUse.includes(section.id));
  }, [sections, sectionsInUse]);

  // Handle template type change
  const handleTypeChange = useCallback(
    (typeKey: string) => {
      if (!templateTypes) return;

      const hasContent = content.trim().length > 50;
      const typeConfig = templateTypes[typeKey];

      if (hasContent) {
        const confirmed = window.confirm(
          `Switch to ${typeConfig.name} template? This will replace your current content.`
        );
        if (!confirmed) {
          setIsTypeOpen(false);
          return;
        }
      }

      const newContent = buildTemplate(typeConfig.defaultSections, format, sections);
      onContentChange(newContent);
      setIsTypeOpen(false);
    },
    [content, format, sections, templateTypes, onContentChange]
  );

  // Handle format toggle
  const handleFormatChange = useCallback(
    (newFormat: TemplateFormat) => {
      if (newFormat === format) return;

      const currentSections = sectionsInUse.length > 0 ? sectionsInUse : Object.keys(sections).slice(0, 2);
      const newContent = buildTemplate(currentSections, newFormat, sections);

      setFormat(newFormat);
      onContentChange(newContent);
    },
    [content, format, sections, sectionsInUse, onContentChange]
  );

  // Handle adding a section
  const handleAddSection = useCallback(
    (sectionId: string) => {
      const section = sections[sectionId];
      if (!section) return;

      const sectionHtml = getSectionHtml(section, format);

      // Append before Notes if exists, otherwise at end
      let newContent = content;
      const notesIndex = content.toLowerCase().lastIndexOf('<h2>notes</h2>');

      if (notesIndex > -1) {
        newContent = content.slice(0, notesIndex) + sectionHtml + '\n' + content.slice(notesIndex);
      } else {
        newContent = content + '\n' + sectionHtml;
      }

      onContentChange(newContent);
    },
    [content, format, sections, onContentChange]
  );

  // Handle removing a section
  const handleRemoveSection = useCallback(
    (sectionId: string) => {
      const newContent = removeSectionFromContent(content, sectionId, sections);
      onContentChange(newContent);
    },
    [content, sections, onContentChange]
  );

  // Handle moving a section up
  const handleMoveUp = useCallback(
    (sectionId: string) => {
      const index = sectionsInUse.indexOf(sectionId);
      if (index <= 0) return;

      const newOrder = [...sectionsInUse];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];

      const newContent = reorderSections(content, newOrder, sections);
      onContentChange(newContent);
    },
    [content, sections, sectionsInUse, onContentChange]
  );

  // Handle moving a section down
  const handleMoveDown = useCallback(
    (sectionId: string) => {
      const index = sectionsInUse.indexOf(sectionId);
      if (index < 0 || index >= sectionsInUse.length - 1) return;

      const newOrder = [...sectionsInUse];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];

      const newContent = reorderSections(content, newOrder, sections);
      onContentChange(newContent);
    },
    [content, sections, sectionsInUse, onContentChange]
  );

  // Drag handlers
  const handleDragStart = useCallback((sectionId: string) => {
    setDraggedSection(sectionId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetSectionId: string) => {
      e.preventDefault();
      if (!draggedSection || draggedSection === targetSectionId) {
        setDraggedSection(null);
        return;
      }

      const draggedIndex = sectionsInUse.indexOf(draggedSection);
      const targetIndex = sectionsInUse.indexOf(targetSectionId);

      if (draggedIndex < 0 || targetIndex < 0) {
        setDraggedSection(null);
        return;
      }

      const newOrder = [...sectionsInUse];
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedSection);

      const newContent = reorderSections(content, newOrder, sections);
      onContentChange(newContent);
      setDraggedSection(null);
    },
    [content, draggedSection, sections, sectionsInUse, onContentChange]
  );

  if (!hasSections) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Template Type Selector (if available) */}
      {hasTemplateTypes && (
        <div>
          <div className="text-xs font-medium uppercase text-text-muted mb-2">Template</div>
          <div className="relative">
            <button
              onClick={() => setIsTypeOpen(!isTypeOpen)}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 text-sm rounded-md',
                'bg-bg-surface-2 border border-border-subtle',
                'hover:bg-bg-surface-3 transition-colors'
              )}
            >
              <span>Select type...</span>
              <ChevronDown className={cn('h-4 w-4 transition-transform', isTypeOpen && 'rotate-180')} />
            </button>

            {isTypeOpen && (
              <div className="absolute z-10 w-full mt-1 py-1 rounded-md bg-bg-surface-2 border border-border-subtle shadow-lg">
                {Object.entries(templateTypes!).map(([key, type]) => (
                  <button
                    key={key}
                    onClick={() => handleTypeChange(key)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-bg-surface-3 transition-colors"
                  >
                    <div className="font-medium text-text-primary">{type.name}</div>
                    <div className="text-xs text-text-muted">{type.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Format Toggle */}
      <div>
        <div className="text-xs font-medium uppercase text-text-muted mb-2">Format</div>
        <div className="flex gap-1 p-1 rounded-md bg-bg-surface-2 border border-border-subtle">
          <button
            onClick={() => handleFormatChange('list')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs rounded transition-colors',
              format === 'list'
                ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)] border border-[var(--color-accent)]/30'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface-3/50'
            )}
          >
            <LayoutList className="h-3.5 w-3.5" />
            List
          </button>
          <button
            onClick={() => handleFormatChange('table')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs rounded transition-colors',
              format === 'table'
                ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)] border border-[var(--color-accent)]/30'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface-3/50'
            )}
          >
            <Table2 className="h-3.5 w-3.5" />
            Table
          </button>
        </div>
      </div>

      {/* Sections In Use */}
      {sectionsInUse.length > 0 && (
        <div>
          <div className="text-xs font-medium uppercase text-text-muted mb-2">Sections</div>
          <div className="space-y-1">
            {sectionsInUse.map((sectionId, index) => {
              const section = sections[sectionId];
              if (!section) return null;

              const isFirst = index === 0;
              const isLast = index === sectionsInUse.length - 1;
              const isDragging = draggedSection === sectionId;

              return (
                <div
                  key={sectionId}
                  draggable
                  onDragStart={() => handleDragStart(sectionId)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, sectionId)}
                  onDragEnd={() => setDraggedSection(null)}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1.5 text-xs rounded-md',
                    'bg-bg-surface-2 border border-border-subtle',
                    'group cursor-grab active:cursor-grabbing',
                    isDragging && 'opacity-50'
                  )}
                >
                  <GripVertical className="h-3 w-3 text-text-muted flex-shrink-0" />
                  <span className="flex-1 text-text-secondary">{section.name}</span>
                  <button
                    onClick={() => handleMoveUp(sectionId)}
                    disabled={isFirst}
                    className={cn(
                      'p-0.5 rounded transition-colors',
                      isFirst
                        ? 'text-text-muted/30 cursor-not-allowed'
                        : 'text-text-muted hover:text-text-primary hover:bg-bg-surface-3'
                    )}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleMoveDown(sectionId)}
                    disabled={isLast}
                    className={cn(
                      'p-0.5 rounded transition-colors',
                      isLast
                        ? 'text-text-muted/30 cursor-not-allowed'
                        : 'text-text-muted hover:text-text-primary hover:bg-bg-surface-3'
                    )}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleRemoveSection(sectionId)}
                    className="p-0.5 rounded text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Section */}
      {availableSections.length > 0 && (
        <div>
          <div className="text-xs font-medium uppercase text-text-muted mb-2">Add Section</div>
          <div className="space-y-1">
            {availableSections.map((section) => (
              <button
                key={section.id}
                onClick={() => handleAddSection(section.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded-md',
                  'text-text-secondary hover:text-text-primary',
                  'hover:bg-bg-surface-2 transition-colors'
                )}
              >
                <Plus className="h-3 w-3" />
                {section.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
