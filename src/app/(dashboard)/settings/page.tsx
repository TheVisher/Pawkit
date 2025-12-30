'use client';

import { Suspense } from 'react';
import { SettingsPage } from '@/components/settings/settings-page';

export default function SettingsRoute() {
  return (
    <Suspense fallback={<SettingsPageLoading />}>
      <SettingsPage />
    </Suspense>
  );
}

function SettingsPageLoading() {
  return (
    <div className="flex-1">
      <div className="pt-5 pb-4 px-4 md:px-6">
        <div className="h-8 w-32 bg-bg-surface-2 rounded animate-pulse" />
      </div>
      <div className="px-4 md:px-6 pt-4 pb-6">
        <div className="text-center py-12 text-text-muted">Loading settings...</div>
      </div>
    </div>
  );
}
