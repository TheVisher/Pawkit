'use client';

/**
 * Contact Template Panel
 * Shown in the right sidebar for cards with #contact tag
 * Allows switching template types, adding/removing/reordering sections
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
import {
  CONTACT_TEMPLATE_TYPES,
  CONTACT_SECTIONS,
  detectSectionsInContent,
  getContactTemplate,
  getContactSection,
  removeSectionFromContent,
  reorderSections,
  convertFormat,
  type ContactTemplateType,
  type TemplateFormat,
} from '@/lib/tags/supertags';

interface ContactTemplatePanelProps {
  content: string;
  onContentChange: (newContent: string) => void;
}

export function ContactTemplatePanel({ content, onContentChange }: ContactTemplatePanelProps) {
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [format, setFormat] = useState<TemplateFormat>('list');
  const [draggedSection, setDraggedSection] = useState<string | null>(null);

  // Detect which sections are currently in the content (in order)
  const sectionsInUse = useMemo(() => detectSectionsInContent(content), [content]);

  // Get sections that can be added (not already in use)
  const availableSections = useMemo(() => {
    return Object.values(CONTACT_SECTIONS).filter(
      (section) => !sectionsInUse.includes(section.id)
    );
  }, [sectionsInUse]);

  // Handle template type change (replaces entire content)
  const handleTypeChange = useCallback(
    (type: ContactTemplateType) => {
      const hasContent = content.trim().length > 50;

      if (hasContent) {
        const confirmed = window.confirm(
          `Switch to ${CONTACT_TEMPLATE_TYPES[type].name} template? This will replace your current content.`
        );
        if (!confirmed) {
          setIsTypeOpen(false);
          return;
        }
      }

      const newContent = getContactTemplate(type, format);
      onContentChange(newContent);
      setIsTypeOpen(false);
    },
    [content, format, onContentChange]
  );

  // Handle format toggle (list <-> table) - preserves field values
  const handleFormatChange = useCallback(
    (newFormat: TemplateFormat) => {
      if (newFormat === format) return;

      const currentSections = sectionsInUse.length > 0 ? sectionsInUse : ['contact-info', 'notes'];

      // Convert format while preserving all field values
      const newContent = convertFormat(content, newFormat, currentSections);

      setFormat(newFormat);
      onContentChange(newContent);
    },
    [content, format, sectionsInUse, onContentChange]
  );

  // Handle adding a section
  const handleAddSection = useCallback(
    (sectionId: string) => {
      const sectionHtml = getContactSection(sectionId, format);
      if (!sectionHtml) return;

      // Append section before Notes if Notes exists, otherwise at end
      let newContent = content;
      const notesIndex = content.toLowerCase().lastIndexOf('<h2>notes</h2>');

      if (notesIndex > -1) {
        newContent = content.slice(0, notesIndex) + sectionHtml + '\n' + content.slice(notesIndex);
      } else {
        newContent = content + '\n' + sectionHtml;
      }

      onContentChange(newContent);
    },
    [content, format, onContentChange]
  );

  // Handle removing a section
  const handleRemoveSection = useCallback(
    (sectionId: string) => {
      const newContent = removeSectionFromContent(content, sectionId);
      onContentChange(newContent);
    },
    [content, onContentChange]
  );

  // Handle moving a section up
  const handleMoveUp = useCallback(
    (sectionId: string) => {
      const index = sectionsInUse.indexOf(sectionId);
      if (index <= 0) return;

      const newOrder = [...sectionsInUse];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];

      const newContent = reorderSections(content, newOrder);
      onContentChange(newContent);
    },
    [content, sectionsInUse, onContentChange]
  );

  // Handle moving a section down
  const handleMoveDown = useCallback(
    (sectionId: string) => {
      const index = sectionsInUse.indexOf(sectionId);
      if (index < 0 || index >= sectionsInUse.length - 1) return;

      const newOrder = [...sectionsInUse];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];

      const newContent = reorderSections(content, newOrder);
      onContentChange(newContent);
    },
    [content, sectionsInUse, onContentChange]
  );

  // Drag and drop handlers
  const handleDragStart = useCallback((sectionId: string) => {
    setDraggedSection(sectionId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, targetSectionId: string) => {
    e.preventDefault();
    if (!draggedSection || draggedSection === targetSectionId) return;
  }, [draggedSection]);

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

      // Create new order
      const newOrder = [...sectionsInUse];
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedSection);

      const newContent = reorderSections(content, newOrder);
      onContentChange(newContent);
      setDraggedSection(null);
    },
    [content, draggedSection, sectionsInUse, onContentChange]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedSection(null);
  }, []);

  return (
    <div className="space-y-4">
      {/* Template Type Selector */}
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
              {Object.entries(CONTACT_TEMPLATE_TYPES).map(([key, type]) => (
                <button
                  key={key}
                  onClick={() => handleTypeChange(key as ContactTemplateType)}
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

      {/* Sections In Use - with reorder and remove */}
      {sectionsInUse.length > 0 && (
        <div>
          <div className="text-xs font-medium uppercase text-text-muted mb-2">Sections</div>
          <div className="space-y-1">
            {sectionsInUse.map((sectionId, index) => {
              const section = CONTACT_SECTIONS[sectionId];
              if (!section) return null;

              const isFirst = index === 0;
              const isLast = index === sectionsInUse.length - 1;
              const isDragging = draggedSection === sectionId;

              return (
                <div
                  key={sectionId}
                  draggable
                  onDragStart={() => handleDragStart(sectionId)}
                  onDragOver={(e) => handleDragOver(e, sectionId)}
                  onDrop={(e) => handleDrop(e, sectionId)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1.5 text-xs rounded-md',
                    'bg-bg-surface-2 border border-border-subtle',
                    'group cursor-grab active:cursor-grabbing',
                    isDragging && 'opacity-50'
                  )}
                >
                  {/* Drag handle */}
                  <GripVertical className="h-3 w-3 text-text-muted flex-shrink-0" />

                  {/* Section name */}
                  <span className="flex-1 text-text-secondary">{section.name}</span>

                  {/* Move arrows */}
                  <button
                    onClick={() => handleMoveUp(sectionId)}
                    disabled={isFirst}
                    className={cn(
                      'p-0.5 rounded transition-colors',
                      isFirst
                        ? 'text-text-muted/30 cursor-not-allowed'
                        : 'text-text-muted hover:text-text-primary hover:bg-bg-surface-3'
                    )}
                    title="Move up"
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
                    title="Move down"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>

                  {/* Remove button */}
                  <button
                    onClick={() => handleRemoveSection(sectionId)}
                    className="p-0.5 rounded text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Remove section"
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
