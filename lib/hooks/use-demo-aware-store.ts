import { usePathname } from 'next/navigation';
import { useDataStore } from '@/lib/stores/data-store';
import { useDemoDataStore } from '@/lib/stores/demo-data-store';

/**
 * Hook that returns the appropriate data store based on whether we're in demo mode
 * Note: Both stores are always called to satisfy React Hooks rules
 */
export function useDemoAwareStore() {
  const pathname = usePathname();
  const demoStore = useDemoDataStore();
  const dataStore = useDataStore();

  const isDemo = pathname?.startsWith('/demo');

  return isDemo ? demoStore : dataStore;
}
