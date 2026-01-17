'use client';

import { useEffect, useRef, useState } from 'react';
import { Editor } from '@tiptap/react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check, Trash2, X } from 'lucide-react';

export interface LinkPopoverProps {
  editor: Editor;
  isOpen: boolean;
  onClose: () => void;
  position: { top: number; left: number };
  savedSelection?: { from: number; to: number } | null;
}

export function LinkPopover({ editor, isOpen, onClose, position, savedSelection }: LinkPopoverProps) {
  const [url, setUrl] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Get the current link URL when popover opens
  useEffect(() => {
    if (isOpen) {
      const currentUrl = editor.getAttributes('link').href || '';
      setUrl(currentUrl);
      // Auto-focus the input
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [isOpen, editor]);

  // Handle click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        // Don't close if clicking in the editor
        if (editor.view.dom.contains(event.target as Node)) {
          return;
        }
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, editor]);

  const handleSave = () => {
    // Restore selection first if we have it saved
    if (savedSelection) {
      editor.chain().focus().setTextSelection(savedSelection).run();
    }

    if (url === '') {
      // Empty URL removes the link
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      // Prepend https:// if no protocol is specified
      let finalUrl = url.trim();
      if (finalUrl && !finalUrl.match(/^[a-zA-Z][a-zA-Z\d+\-.]*:/)) {
        finalUrl = 'https://' + finalUrl;
      }
      // Add or update the link
      editor.chain().focus().extendMarkRange('link').setLink({ href: finalUrl }).run();
    }
    onClose();
  };

  const handleRemove = () => {
    editor.chain().focus().unsetLink().run();
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      className={cn(
        'fixed z-[9999] flex flex-col gap-2 p-3 rounded-lg',
        'bg-[var(--glass-panel-bg)]',
        'backdrop-blur-[var(--glass-blur)] backdrop-saturate-[var(--glass-saturate)]',
        'border border-[var(--glass-border)]',
        'shadow-[var(--glass-shadow)]',
        'animate-in fade-in-0 zoom-in-95 duration-100',
        'min-w-[280px]'
      )}
      style={{
        top: Math.max(8, position.top),
        left: Math.max(8, position.left),
      }}
    >
      <Input
        ref={inputRef}
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Paste or type link..."
        className="text-sm"
      />
      <div className="flex items-center gap-1.5">
        <Button
          onClick={handleSave}
          size="sm"
          className="flex-1"
        >
          <Check className="h-3.5 w-3.5" />
          Save
        </Button>
        {editor.isActive('link') && (
          <Button
            onClick={handleRemove}
            variant="destructive"
            size="sm"
            className="flex-1"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </Button>
        )}
        <Button
          onClick={onClose}
          variant="ghost"
          size="icon-sm"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
