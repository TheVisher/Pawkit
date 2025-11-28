"use client";

import { useEffect, useRef } from 'react';
import { useDataStore } from '@/lib/stores/data-store';
import {
  hasCompletedOnboarding,
  seedOnboardingData,
  shouldRunOnboarding,
} from '@/lib/services/onboarding-service';

/**
 * Hook to trigger onboarding data seeding for new users
 *
 * This hook:
 * 1. Waits for the data store to be initialized
 * 2. Checks if onboarding has already been completed
 * 3. If not, and user has no data, seeds the account with sample data
 * 4. Runs only once per account lifetime
 */
export function useOnboarding() {
  const isInitialized = useDataStore((state) => state.isInitialized);
  const cards = useDataStore((state) => state.cards);
  const collections = useDataStore((state) => state.collections);
  const hasTriggered = useRef(false);

  useEffect(() => {
    // Only run once, after data store is initialized
    if (!isInitialized || hasTriggered.current) {
      return;
    }

    const runOnboarding = async () => {
      hasTriggered.current = true;

      try {
        // Check if onboarding was already completed (stored in server)
        const completed = await hasCompletedOnboarding();
        if (completed) {
          console.log('[useOnboarding] Onboarding already completed, skipping');
          return;
        }

        // Check if user has any existing data
        if (!shouldRunOnboarding(cards, collections)) {
          console.log('[useOnboarding] User has existing data, marking onboarding complete');
          // User has data, mark onboarding as complete to prevent future checks
          const { markOnboardingComplete } = await import('@/lib/services/onboarding-service');
          await markOnboardingComplete();
          return;
        }

        // User is new and has no data - seed onboarding content
        console.log('[useOnboarding] New user detected, seeding onboarding data...');
        await seedOnboardingData();
        console.log('[useOnboarding] Onboarding data seeded successfully');

      } catch (error) {
        console.error('[useOnboarding] Error during onboarding:', error);
        // Don't prevent app from working if onboarding fails
      }
    };

    // Run onboarding check in background (don't block UI)
    runOnboarding();
  }, [isInitialized, cards, collections]);
}
