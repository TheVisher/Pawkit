'use client';

import { useRef, useEffect } from 'react';
import { Link2, FileText, Upload, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FabMenuProps {
  open: boolean;
  onClose: () => void;
}

const menuItems = [
  { icon: Link2, label: 'Add Bookmark', action: 'bookmark' },
  { icon: FileText, label: 'New Note', action: 'note' },
  { icon: Upload, label: 'Upload File', action: 'upload' },
  { icon: Calendar, label: 'New Event', action: 'event' },
];

export function FabMenu({ open, onClose }: FabMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

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

  const handleAction = (action: string) => {
    // TODO: Implement actions
    // - bookmark: Open add bookmark modal
    // - note: Navigate to /notes/new or open note modal
    // - upload: Open file picker
    // - event: Open event modal
    console.log('FAB action:', action);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      ref={menuRef}
      className={cn(
        "absolute bottom-full right-0 mb-2",
        "bg-black/60 backdrop-blur-xl rounded-xl",
        "border border-white/10 shadow-xl",
        "p-2 min-w-[160px]",
        "animate-in fade-in slide-in-from-bottom-2 duration-200"
      )}
    >
      {menuItems.map((item) => (
        <button
          key={item.action}
          onClick={() => handleAction(item.action)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg",
            "text-sm text-white/80 hover:text-white",
            "hover:bg-white/10 transition-colors"
          )}
        >
          <item.icon size={16} />
          {item.label}
        </button>
      ))}
    </div>
  );
}
