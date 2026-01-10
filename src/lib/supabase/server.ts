/**
 * Supabase Server Client
 * For use in server components and API routes
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { cache } from 'react';
import type { User } from '@supabase/supabase-js';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component - cookies are read-only
          }
        },
      },
    }
  );
}

/**
 * Admin client with service role key
 * Use only in API routes for privileged operations
 */
export function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          // Admin client doesn't need cookies
        },
      },
    }
  );
}

/**
 * Get authenticated user with request-level caching
 *
 * Uses React's cache() to deduplicate getUser() calls within the same request.
 * This prevents multiple Supabase round-trips when the same API route
 * or its dependencies need to check auth multiple times.
 *
 * @returns User if authenticated, null otherwise
 */
export const getAuthUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
});

/**
 * Require authenticated user or throw
 * Convenience wrapper for routes that require auth
 *
 * @throws Error if not authenticated
 */
export const requireAuth = cache(async (): Promise<User> => {
  const user = await getAuthUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
});
