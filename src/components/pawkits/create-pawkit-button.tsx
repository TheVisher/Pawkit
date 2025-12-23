'use client';

import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useModalStore } from '@/lib/stores/modal-store';

export function CreatePawkitButton() {
    const openModal = useModalStore(state => state.openCreatePawkitModal);

    return (
        <button
            onClick={() => openModal()}
            className={cn(
                'flex items-center gap-2 w-full py-1.5 rounded-md transition-colors',
                'text-text-muted hover:text-text-primary'
            )}
        >
            <Plus className="h-3.5 w-3.5" />
            <span>New Pawkit</span>
        </button>
    );
}
