'use client';

import { usePathname, useParams } from 'next/navigation';
import { useMemo } from 'react';

export type KitContext = 'library' | 'notes' | 'calendar' | 'pawkit' | 'home';

interface CurrentContext {
  context: KitContext;
  pawkitSlug?: string;
  pawkitName?: string;
}

export function useCurrentContext(): CurrentContext {
  const pathname = usePathname();
  const params = useParams();

  return useMemo(() => {
    // Check route patterns
    if (pathname === '/' || pathname === '/home') {
      return { context: 'home' };
    }

    if (pathname.startsWith('/library')) {
      return { context: 'library' };
    }

    if (pathname.startsWith('/notes')) {
      return { context: 'notes' };
    }

    if (pathname.startsWith('/calendar')) {
      return { context: 'calendar' };
    }

    if (pathname.startsWith('/pawkits/')) {
      const slug = params?.slug as string;
      return {
        context: 'pawkit',
        pawkitSlug: slug,
        pawkitName: slug
      };
    }

    // Default to library
    return { context: 'library' };
  }, [pathname, params]);
}
