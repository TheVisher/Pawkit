/**
 * Next.js Middleware
 * Protects routes and refreshes auth session
 */

import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { createServerClient } from '@supabase/ssr';

// Routes that don't require authentication
const publicRoutes = ['/login', '/signup', '/callback', '/'];
const publicPrefixes = ['/api/', '/_next/', '/favicon'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth check for public routes
  if (
    publicRoutes.includes(pathname) ||
    publicPrefixes.some((prefix) => pathname.startsWith(prefix))
  ) {
    return updateSession(request);
  }

  // Check authentication for protected routes
  const response = await updateSession(request);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          // Not needed for auth check
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Redirect to login if not authenticated
  if (!user && pathname.startsWith('/dashboard')) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
