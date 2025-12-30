'use client';

import { Cloud, Download, HardDrive, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export function DataSection() {
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
    </div>
  );
}
