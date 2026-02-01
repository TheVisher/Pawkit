'use client';

import { Cloud, Download, HardDrive, Plus, Trash2, AlertTriangle, Database, Server, Archive, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type DeleteType = 'local' | 'trash' | 'purge' | null;

export function DataSection() {
  const [deleteType, setDeleteType] = useState<DeleteType>(null);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const trashAllUserData = useMutation(api.users.trashAllUserData);
  const purgeAllUserData = useMutation(api.users.purgeAllUserData);

  const deleteConfigs = {
    local: {
      title: 'Delete Local Data',
      description: 'This will delete all data stored in your browser (IndexedDB). Your cloud data will remain intact and will sync back when you reload.',
      icon: HardDrive,
      buttonText: 'Delete Local Data',
      confirmWord: 'DELETE',
    },
    trash: {
      title: 'Move All Data to Trash',
      description: 'This will move all your cards, collections, events, and todos to trash. You can restore them within 30 days. Your account and workspaces will remain.',
      icon: Archive,
      buttonText: 'Move to Trash',
      confirmWord: 'TRASH',
    },
    purge: {
      title: 'Permanently Delete All Data (GDPR)',
      description: 'This will IMMEDIATELY and PERMANENTLY delete all your data including cards, collections, events, todos, and uploaded files. This action cannot be undone. Your account will remain but all content will be gone.',
      icon: ShieldAlert,
      buttonText: 'Permanently Delete',
      confirmWord: 'DELETE',
    },
  };

  const handleDeleteLocal = async () => {
    const databases = await indexedDB.databases();
    await Promise.all(
      databases.map((db) => {
        return new Promise<void>((resolve, reject) => {
          if (!db.name) {
            resolve();
            return;
          }
          const request = indexedDB.deleteDatabase(db.name);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      })
    );
  };

  const handleDelete = async () => {
    if (!deleteType) return;
    const config = deleteConfigs[deleteType];
    if (confirmText !== config.confirmWord) return;

    setIsDeleting(true);
    try {
      if (deleteType === 'local') {
        await handleDeleteLocal();
        toast.success('Local data deleted. Reloading...');
      } else if (deleteType === 'trash') {
        const result = await trashAllUserData();
        toast.success(`Moved to trash: ${result.cards} cards, ${result.collections} collections, ${result.events} events, ${result.todos} todos`);
      } else if (deleteType === 'purge') {
        const result = await purgeAllUserData();
        toast.success(`Permanently deleted: ${result.cards} cards, ${result.collections} collections, ${result.events} events, ${result.todos} todos, ${result.files} files`);
      }

      // Close dialog and reload
      setDeleteType(null);
      setConfirmText('');

      // For local delete, reload to resync; for others, just close
      if (deleteType === 'local') {
        window.location.reload();
      }
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error(`Failed to delete data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteDialog = (type: DeleteType) => {
    setDeleteType(type);
    setConfirmText('');
  };

  const closeDialog = () => {
    setDeleteType(null);
    setConfirmText('');
  };

  return (
    <div className="space-y-8">
      {/* Cloud Connections */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-text-primary">Cloud Connections</h3>
          <p className="text-xs text-text-muted mt-0.5">
            Connect cloud storage providers
          </p>
        </div>

        <div className="p-6 rounded-xl bg-bg-surface-1 border border-border-subtle border-dashed">
          <div className="flex flex-col items-center text-center">
            <div className="p-3 rounded-full bg-bg-surface-2 mb-3">
              <Cloud className="h-6 w-6 text-text-muted" />
            </div>
            <h4 className="text-sm font-medium text-text-primary">
              No cloud storage connected
            </h4>
            <p className="text-xs text-text-muted mt-1 max-w-xs">
              Connect Filen, Google Drive, or Dropbox to sync your files across devices
            </p>
            <Button variant="outline" size="sm" className="mt-4 gap-1.5" disabled>
              <Plus className="h-3.5 w-3.5" />
              Add Connection
              <Badge variant="outline" className="ml-1 text-[10px]">
                Soon
              </Badge>
            </Button>
          </div>
        </div>
      </div>

      {/* Export */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-text-primary">Export Data</h3>
          <p className="text-xs text-text-muted mt-0.5">
            Download a copy of your data
          </p>
        </div>

        <div className="p-4 rounded-xl bg-bg-surface-1 border border-border-subtle">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-bg-surface-2">
              <Download className="h-5 w-5 text-text-muted" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-text-primary">
                Export Everything
              </h4>
              <p className="text-xs text-text-muted mt-0.5">
                Download all your bookmarks, notes, and files
              </p>
            </div>
            <Button variant="outline" size="sm" disabled>
              Export
              <Badge variant="outline" className="ml-1.5 text-[10px]">
                Soon
              </Badge>
            </Button>
          </div>
        </div>
      </div>

      {/* Storage Usage */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-text-primary">Local Storage</h3>
          <p className="text-xs text-text-muted mt-0.5">
            Browser storage usage
          </p>
        </div>

        <div className="p-4 rounded-xl bg-bg-surface-1 border border-border-subtle">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-bg-surface-2">
              <HardDrive className="h-5 w-5 text-text-muted" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-text-primary">
                IndexedDB Storage
              </h4>
              <p className="text-xs text-text-muted mt-0.5">
                Used for offline data and caching
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-text-muted">Used</span>
              <span className="text-text-secondary">~2.5 MB / 50 GB</span>
            </div>
            <Progress value={0.05} className="h-2" />
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-red-500 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Danger Zone
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Destructive actions - proceed with caution
          </p>
        </div>

        <div className="rounded-xl border border-red-500/30 overflow-hidden">
          {/* Delete Local Data */}
          <div className="p-4 flex items-center gap-3 bg-bg-surface-1">
            <div className="p-2 rounded-lg bg-red-500/10">
              <HardDrive className="h-5 w-5 text-red-500" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-text-primary">
                Clear Local Data
              </h4>
              <p className="text-xs text-text-muted mt-0.5">
                Clear browser storage (IndexedDB). Data will re-sync from cloud.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-red-500/50 text-red-500 hover:bg-red-500/10 hover:text-red-500"
              onClick={() => openDeleteDialog('local')}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Clear
            </Button>
          </div>

          <div className="border-t border-red-500/20" />

          {/* Trash All Data (Soft Delete) */}
          <div className="p-4 flex items-center gap-3 bg-bg-surface-1">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Archive className="h-5 w-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-text-primary">
                Move All to Trash
              </h4>
              <p className="text-xs text-text-muted mt-0.5">
                Move all content to trash. Recoverable for 30 days.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-amber-500/50 text-amber-500 hover:bg-amber-500/10 hover:text-amber-500"
              onClick={() => openDeleteDialog('trash')}
            >
              <Archive className="h-3.5 w-3.5 mr-1.5" />
              Move to Trash
            </Button>
          </div>

          <div className="border-t border-red-500/20" />

          {/* Purge Data (GDPR Hard Delete) */}
          <div className="p-4 flex items-center gap-3 bg-bg-surface-1">
            <div className="p-2 rounded-lg bg-red-500/10">
              <ShieldAlert className="h-5 w-5 text-red-500" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-text-primary">
                Permanently Delete All Data
              </h4>
              <p className="text-xs text-text-muted mt-0.5">
                Immediately delete everything. For GDPR requests. Cannot be undone.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-red-500/50 text-red-500 hover:bg-red-500/10 hover:text-red-500"
              onClick={() => openDeleteDialog('purge')}
            >
              <ShieldAlert className="h-3.5 w-3.5 mr-1.5" />
              Purge Data
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={deleteType !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="bg-bg-surface-1 border-border-subtle">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="h-5 w-5" />
              {deleteType && deleteConfigs[deleteType].title}
            </DialogTitle>
            <DialogDescription className="text-text-muted">
              {deleteType && deleteConfigs[deleteType].description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <p className="text-sm text-text-secondary">
              Type <span className="font-mono font-bold text-red-500">{deleteType && deleteConfigs[deleteType].confirmWord}</span> to confirm:
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={`Type ${deleteType && deleteConfigs[deleteType].confirmWord}`}
              className="font-mono"
              autoComplete="off"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!deleteType || confirmText !== deleteConfigs[deleteType].confirmWord || isDeleting}
            >
              {isDeleting ? 'Processing...' : deleteType && deleteConfigs[deleteType].buttonText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
