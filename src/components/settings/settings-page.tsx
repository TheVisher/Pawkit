'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useOmnibarCollision } from '@/lib/hooks/use-omnibar-collision';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SettingsNav, type SettingsSection } from './settings-nav';
import { AppearanceSection } from './sections/appearance-section';
import { AccountSection } from './sections/account-section';
import { DataSection } from './sections/data-section';

export function SettingsPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<SettingsSection>('appearance');

  // Collision detection for omnibar
  const headerRef = useRef<HTMLDivElement>(null);
  const needsOffset = useOmnibarCollision(headerRef);

  const renderSection = () => {
    switch (activeSection) {
      case 'appearance':
        return <AppearanceSection />;
      case 'account':
        return <AccountSection />;
      case 'data':
        return <DataSection />;
      default:
        return <AppearanceSection />;
    }
  };

  return (
    <div className="flex-1">
      {/* Header with collision-aware offset */}
      <div className={cn('transition-[padding] duration-200', needsOffset && 'md:pt-20')}>
        <div className="pt-5 pb-4 px-4 md:px-6 min-h-[76px]">
          <div className="flex items-start justify-between gap-4">
            {/* Title area */}
            <div ref={headerRef} className="w-fit space-y-0.5">
              <div className="text-xs text-text-muted">Preferences</div>
              <h1 className="text-2xl font-semibold text-text-primary">Settings</h1>
            </div>
            {/* Back button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="gap-1.5 h-8 text-sm text-text-secondary hover:text-text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
        </div>
      </div>

      {/* Content with two-column layout */}
      <div className="px-4 md:px-6 pt-2 pb-6">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          {/* Sidebar navigation */}
          <div className="md:w-48 shrink-0">
            <SettingsNav
              activeSection={activeSection}
              onSectionChange={setActiveSection}
            />
          </div>

          {/* Content area */}
          <div className="flex-1 max-w-2xl">
            {renderSection()}
          </div>
        </div>
      </div>
    </div>
  );
}
