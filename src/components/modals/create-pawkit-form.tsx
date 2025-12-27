'use client';

import { useState, useEffect } from 'react';
import { FolderOpen, Loader2 } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useDataStore, useCollections } from '@/lib/stores/data-store';
import { useCurrentWorkspace } from '@/lib/stores/workspace-store';
import { useToastStore } from '@/lib/stores/toast-store';
import { slugify } from '@/lib/utils';

interface CreatePawkitFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function CreatePawkitForm({ onSuccess, onCancel }: CreatePawkitFormProps) {
    const createCollection = useDataStore((state) => state.createCollection);
    const collections = useCollections();
    const workspace = useCurrentWorkspace();
    const toast = useToastStore((s) => s.toast);

    const [name, setName] = useState('');
    const [parentId, setParentId] = useState<string>('none');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const availableParents = collections.filter(c => !c._deleted);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!workspace) return;
        if (!name.trim()) {
            setError('Name is required');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const slug = slugify(name);
            const exists = collections.find(c => c.slug === slug && c.workspaceId === workspace.id && !c._deleted);
            if (exists) {
                setError('A pawkit with this name already exists');
                setIsSubmitting(false);
                return;
            }

            await createCollection({
                workspaceId: workspace.id,
                name: name.trim(),
                slug,
                parentId: parentId === 'none' ? undefined : parentId,
                isPrivate: false,
                isSystem: false,
                icon: 'folder',
                position: collections.length,
                hidePreview: false,
                useCoverAsBackground: false,
                pinned: false,
            });

            toast({
                type: 'success',
                message: `Pawkit "${name}" created`,
            });

            onSuccess();
        } catch (err) {
            console.error('Failed to create pawkit:', err);
            setError('Failed to create pawkit');
            toast({
                type: 'error',
                message: 'Failed to create pawkit',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 w-full">
            <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                    id="name"
                    placeholder="e.g. Recipes, Travel, Work"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                    className="bg-[var(--glass-bg)] border-[var(--glass-border)] text-text-primary"
                />
                {error && (
                    <p className="text-xs text-red-400">{error}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="parentId">Nest under (Optional)</Label>
                <Select
                    value={parentId}
                    onValueChange={setParentId}
                >
                    <SelectTrigger className="bg-[var(--glass-bg)] border-[var(--glass-border)] text-text-primary">
                        <SelectValue placeholder="Select a parent pawkit" />
                    </SelectTrigger>
                    <SelectContent className="bg-[var(--glass-panel-bg)] backdrop-blur-[var(--glass-blur)] border-[var(--glass-border)]">
                        <SelectItem value="none">
                            <span className="text-text-muted italic">No parent (Root level)</span>
                        </SelectItem>
                        {availableParents.map((collection) => (
                            <SelectItem key={collection.id} value={collection.id}>
                                {collection.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="ghost" onClick={onCancel} className="text-text-secondary">
                    Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/50 text-[var(--color-accent)]"
                >
                    {isSubmitting ? 'Creating...' : 'Create Pawkit'}
                </Button>
            </div>
        </form>
    );
}
