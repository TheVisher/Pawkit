'use client';

import { useState, useEffect } from 'react';
import { FolderOpen } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
import { useModalStore } from '@/lib/stores/modal-store';
import { useDataStore, useCollections } from '@/lib/stores/data-store';
import { useCurrentWorkspace } from '@/lib/stores/workspace-store';
import { useToastStore } from '@/lib/stores/toast-store';
import { slugify } from '@/lib/utils';

export function CreatePawkitModal() {
    const { isCreatePawkitOpen, closeCreatePawkitModal } = useModalStore();
    const createCollection = useDataStore((state) => state.createCollection);
    const collections = useCollections();
    const workspace = useCurrentWorkspace();
    const toast = useToastStore((s) => s.toast);

    const [name, setName] = useState('');
    const [parentId, setParentId] = useState<string>('none');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filter out deleted collections for parent selector
    const availableParents = collections.filter(c => !c._deleted);

    // Reset form when modal opens
    useEffect(() => {
        if (isCreatePawkitOpen) {
            setName('');
            setParentId('none');
            setError(null);
        }
    }, [isCreatePawkitOpen]);

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

            // Check for slug collision locally
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

            closeCreatePawkitModal();
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

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            closeCreatePawkitModal();
        }
    };

    return (
        <Dialog open={isCreatePawkitOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-bg-surface-1 border-border-subtle">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FolderOpen className="h-5 w-5 text-accent" />
                        Create New Pawkit
                    </DialogTitle>
                    <DialogDescription>
                        Organize your cards into a new collection.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            placeholder="e.g. Recipes, Travel, Work"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoFocus
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
                            <SelectTrigger>
                                <SelectValue placeholder="Select a parent pawkit" />
                            </SelectTrigger>
                            <SelectContent>
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

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Creating...' : 'Create Pawkit'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
