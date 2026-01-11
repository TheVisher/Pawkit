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

/**
 * Get authenticated user from request with Bearer token support
 *
 * This function supports both:
 * 1. Cookie-based auth (standard web app)
 * 2. Bearer token auth (browser extension)
 *
 * Use this in API routes that need to support extension authentication.
 *
 * @param request - The incoming request object
 * @returns User if authenticated via cookies or Bearer token, null otherwise
 */
export async function getAuthUserFromRequest(request: Request): Promise<User | null> {
  // First try cookie auth (standard flow)
  const cookieUser = await getAuthUser();
  if (cookieUser) {
    return cookieUser;
  }

  // Try Bearer token auth (for browser extension)
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);

    try {
      // Create a Supabase client and validate the token
      const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
      const supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (!error && user) {
        return user;
      }
    } catch (err) {
      console.error('[Auth] Bearer token validation failed:', err);
    }
  }

  return null;
}
