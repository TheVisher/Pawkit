'use client';

import { User, Mail, Shield } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCurrentWorkspace } from '@/lib/stores/workspace-store';

export function AccountSection() {
  const workspace = useCurrentWorkspace();

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
              <span className="truncate">user@example.com</span>
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
    </div>
  );
}
