'use client';

import { useRef, useEffect } from 'react';
import { Link2, FileText, Upload, Calendar, StickyNote } from 'lucide-react';

interface TopBarAddMenuProps {
  open: boolean;
  onClose: () => void;
}

const menuItems = [
  { icon: Link2, label: 'Add Bookmark', action: 'bookmark', shortcut: '⌘⇧B' },
  { icon: FileText, label: 'New Note', action: 'note', shortcut: '⌘⇧N' },
  { icon: StickyNote, label: 'Quick Note', action: 'quick-note' },
  { icon: Upload, label: 'Upload File', action: 'upload' },
  { icon: Calendar, label: 'New Event', action: 'event' },
];

export function TopBarAddMenu({ open, onClose }: TopBarAddMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, onClose]);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  const handleAction = (action: string) => {
    switch (action) {
      case 'bookmark':
        // Dispatch event to open add card modal
        window.dispatchEvent(new CustomEvent('pawkit:open-add-card'));
        break;
      case 'note':
        // Dispatch event to open create note modal
        window.dispatchEvent(new CustomEvent('pawkit:open-create-note'));
        break;
      case 'quick-note':
        // Open command palette for quick capture
        window.dispatchEvent(new CustomEvent('pawkit:open-command-palette'));
        break;
      case 'upload':
        // Trigger file input click
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = 'image/*,application/pdf,.doc,.docx,.txt,.md';
        input.onchange = (e) => {
          const files = (e.target as HTMLInputElement).files;
          if (files) {
            window.dispatchEvent(new CustomEvent('pawkit:upload-files', {
              detail: { files: Array.from(files) }
            }));
          }
        };
        input.click();
        break;
      case 'event':
        // Navigate to calendar or open event modal
        window.dispatchEvent(new CustomEvent('pawkit:open-create-event'));
        break;
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div
      ref={menuRef}
      className="top-bar-add-menu"
    >
      {menuItems.map((item) => (
        <button
          key={item.action}
          onClick={() => handleAction(item.action)}
          className="add-menu-item"
        >
          <item.icon size={16} />
          <span>{item.label}</span>
          {item.shortcut && (
            <kbd className="add-menu-shortcut">{item.shortcut}</kbd>
          )}
        </button>
      ))}
    </div>
  );
}
