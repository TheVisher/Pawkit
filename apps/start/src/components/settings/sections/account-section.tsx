'use client';

import { User, Mail, Shield, AlertTriangle, Trash2, UserX } from 'lucide-react';
import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCurrentWorkspace, useWorkspaces } from '@/lib/stores/workspace-store';
import { useConvexUser } from '@/lib/hooks/convex/use-convex-user';

export function AccountSection() {
  const workspace = useCurrentWorkspace();
  const workspaces = useWorkspaces();
  const { user } = useConvexUser();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE') return;

    alert('Account deletion is not available yet.');
  };

  const closeDialog = () => {
    setShowDeleteDialog(false);
    setConfirmText('');
  };

  return (
    <div className="space-y-8">
      {/* Profile */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-text-primary">Profile</h3>
          <p className="text-xs text-text-muted mt-0.5">
            Your account information
          </p>
        </div>

        <div className="flex items-start gap-4 p-4 rounded-xl bg-bg-surface-1 border border-border-subtle">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-bg-surface-3 text-text-secondary text-lg">
              {workspace?.name?.charAt(0).toUpperCase() ?? 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-base font-medium text-text-primary truncate">
                {workspace?.name ?? 'User'}
              </h4>
              <Badge variant="secondary" className="text-[10px]">
                Free
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-sm text-text-muted">
              <Mail className="h-3.5 w-3.5" />
              <span className="truncate">{user?.email ?? 'user@example.com'}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 gap-1.5"
              disabled
            >
              <User className="h-3.5 w-3.5" />
              Edit Profile
              <Badge variant="outline" className="ml-1 text-[10px]">
                Soon
              </Badge>
            </Button>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-text-primary">Security</h3>
          <p className="text-xs text-text-muted mt-0.5">
            Manage your account security
          </p>
        </div>

        <div className="p-4 rounded-xl bg-bg-surface-1 border border-border-subtle">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-bg-surface-2">
              <Shield className="h-5 w-5 text-text-muted" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-text-primary">
                Password & Authentication
              </h4>
              <p className="text-xs text-text-muted mt-0.5">
                Manage your password and 2FA settings
              </p>
            </div>
            <Button variant="outline" size="sm" disabled>
              Manage
              <Badge variant="outline" className="ml-1.5 text-[10px]">
                Soon
              </Badge>
            </Button>
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
          <div className="p-4 flex items-center gap-3 bg-bg-surface-1">
            <div className="p-2 rounded-lg bg-red-500/10">
              <UserX className="h-5 w-5 text-red-500" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-text-primary">
                Delete Account
              </h4>
              <p className="text-xs text-text-muted mt-0.5">
                Permanently delete your account and all associated data. This cannot be undone.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-red-500/50 text-red-500 hover:bg-red-500/10 hover:text-red-500"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Delete Account
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="bg-bg-surface-1 border-border-subtle">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="h-5 w-5" />
              Delete Account
            </DialogTitle>
            <DialogDescription asChild>
              <div className="text-text-muted">
                <p>This will permanently delete your account including:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>All local browser data</li>
                  <li>All cloud database data ({workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''})</li>
                  <li>Your user account and authentication</li>
                </ul>
                <p className="mt-2 font-medium text-red-500">This action cannot be undone.</p>
              </div>
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
              onClick={handleDeleteAccount}
              disabled={confirmText !== 'DELETE' || isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete My Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
