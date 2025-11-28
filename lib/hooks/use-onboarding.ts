"use client";

import { useEffect, useRef } from 'react';
import { useDataStore } from '@/lib/stores/data-store';
import {
  hasCompletedOnboarding,
  seedOnboardingData,
  shouldRunOnboarding,
} from '@/lib/services/onboarding-service';

// Maximum number of retries when auth isn't ready
const MAX_AUTH_RETRIES = 5;
// Delay between retries (doubles each time)
const INITIAL_RETRY_DELAY = 500;

/**
 * Hook to trigger onboarding data seeding for new users
 *
 * This hook:
 * 1. Waits for user storage to be ready (auth complete)
 * 2. Waits for the data store to be initialized
 * 3. Checks if onboarding has already been completed (with retry on auth errors)
 * 4. If not, and user has no data, seeds the account with sample data
 * 5. Runs only once per account lifetime
 *
 * @param isUserStorageReady - Whether user storage/auth is ready (from useUserStorage)
 */
export function useOnboarding(isUserStorageReady: boolean = false) {
  const isInitialized = useDataStore((state) => state.isInitialized);
  const cards = useDataStore((state) => state.cards);
  const collections = useDataStore((state) => state.collections);
  const hasTriggered = useRef(false);

  console.log('[useOnboarding] Hook rendered:', {
    isUserStorageReady,
    isInitialized,
    cardsLength: cards.length,
    collectionsLength: collections.length,
    hasTriggered: hasTriggered.current,
  });

  useEffect(() => {
    console.log('[useOnboarding] useEffect triggered:', {
      isUserStorageReady,
      isInitialized,
      hasTriggered: hasTriggered.current,
    });

    // Wait for user storage to be ready (auth complete) AND data store initialized
    if (!isUserStorageReady || !isInitialized || hasTriggered.current) {
      console.log('[useOnboarding] Early return - isUserStorageReady:', isUserStorageReady, 'isInitialized:', isInitialized, 'hasTriggered:', hasTriggered.current);
      return;
    }

    const runOnboarding = async () => {
      console.log('[useOnboarding] runOnboarding started');
      hasTriggered.current = true;

      try {
        // Check if onboarding was already completed (stored in server)
        // Retry with backoff if we get auth errors (session not ready yet)
        let result = { completed: false, authError: true };
        let retryCount = 0;
        let delay = INITIAL_RETRY_DELAY;

        while (result.authError && retryCount < MAX_AUTH_RETRIES) {
          if (retryCount > 0) {
            console.log(`[useOnboarding] Auth not ready, retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_AUTH_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Exponential backoff
          }

          console.log('[useOnboarding] Checking hasCompletedOnboarding...');
          result = await hasCompletedOnboarding();
          console.log('[useOnboarding] hasCompletedOnboarding returned:', result);
          retryCount++;
        }

        // If we exhausted retries due to auth errors, don't proceed
        if (result.authError) {
          console.warn('[useOnboarding] Auth still not ready after retries, will try again on next render');
          hasTriggered.current = false; // Allow retry on next render
          return;
        }

        if (result.completed) {
          console.log('[useOnboarding] Onboarding already completed, skipping');
          return;
        }

        // Check if user has any existing data
        console.log('[useOnboarding] Checking shouldRunOnboarding with cards:', cards.length, 'collections:', collections.length);
        const shouldRun = shouldRunOnboarding(cards, collections);
        console.log('[useOnboarding] shouldRunOnboarding returned:', shouldRun);

        if (!shouldRun) {
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
  }, [isUserStorageReady, isInitialized, cards, collections]);
}
