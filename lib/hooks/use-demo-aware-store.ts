import { useDataStore } from '@/lib/stores/data-store-v2';

/**
 * Hook that returns the data store
 * Demo mode has been temporarily removed during UI overhaul
 */
export function useDemoAwareStore() {
  return useDataStore();
}
