'use client';

import { Cloud, Download, HardDrive, Plus, Trash2, AlertTriangle, Database, Server } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
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

type DeleteType = 'local' | 'database' | 'all' | null;

export function DataSection() {
  const [deleteType, setDeleteType] = useState<DeleteType>(null);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteConfigs = {
    local: {
      title: 'Delete Local Data',
      description: 'This will delete all data stored in your browser (IndexedDB). Your cloud data will remain intact and will sync back when you reload.',
      icon: HardDrive,
      buttonText: 'Delete Local Data',
    },
    database: {
      title: 'Delete Database',
      description: 'This will permanently delete all your data from the cloud database. Your local data will remain until you clear it or it syncs.',
      icon: Database,
      buttonText: 'Delete Database',
    },
    all: {
      title: 'Delete All Data',
      description: 'This will permanently delete ALL your data - both local storage and cloud database. This action cannot be undone.',
      icon: Server,
      buttonText: 'Delete Everything',
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

  const handleDeleteDatabase = async () => {
    const response = await fetch('/api/user/delete-data', {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete database');
    }
  };

  const handleDelete = async () => {
    if (confirmText !== 'DELETE' || !deleteType) return;

    setIsDeleting(true);
    try {
      if (deleteType === 'local') {
        await handleDeleteLocal();
      } else if (deleteType === 'database') {
        await handleDeleteDatabase();
      } else if (deleteType === 'all') {
        await handleDeleteDatabase();
        await handleDeleteLocal();
      }

      // Close dialog and reload
      setDeleteType(null);
      setConfirmText('');
      window.location.reload();
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
            Irreversible actions - proceed with caution
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
                Delete Local Data
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
              Delete
            </Button>
          </div>

          <div className="border-t border-red-500/20" />

          {/* Delete Database */}
          <div className="p-4 flex items-center gap-3 bg-bg-surface-1">
            <div className="p-2 rounded-lg bg-red-500/10">
              <Database className="h-5 w-5 text-red-500" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-text-primary">
                Delete Database
              </h4>
              <p className="text-xs text-text-muted mt-0.5">
                Remove all data from cloud. Local data remains until cleared.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-red-500/50 text-red-500 hover:bg-red-500/10 hover:text-red-500"
              onClick={() => openDeleteDialog('database')}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Delete
            </Button>
          </div>

          <div className="border-t border-red-500/20" />

          {/* Delete All */}
          <div className="p-4 flex items-center gap-3 bg-bg-surface-1">
            <div className="p-2 rounded-lg bg-red-500/10">
              <Server className="h-5 w-5 text-red-500" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-text-primary">
                Delete All Data
              </h4>
              <p className="text-xs text-text-muted mt-0.5">
                Permanently delete everything - local and cloud. Cannot be undone.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-red-500/50 text-red-500 hover:bg-red-500/10 hover:text-red-500"
              onClick={() => openDeleteDialog('all')}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Delete All
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
              Type <span className="font-mono font-bold text-red-500">DELETE</span> to confirm:
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE"
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
              disabled={confirmText !== 'DELETE' || isDeleting}
            >
              {isDeleting ? 'Deleting...' : deleteType && deleteConfigs[deleteType].buttonText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
