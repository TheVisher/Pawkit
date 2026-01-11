/**
 * Next.js Middleware
 * Protects routes and refreshes auth session
 * Handles CORS for browser extension
 */

import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { createServerClient } from '@supabase/ssr';

// Routes that don't require authentication
const publicRoutes = ['/login', '/signup', '/callback', '/'];
const publicPrefixes = ['/api/', '/_next/', '/favicon'];

/**
 * Check if origin is a browser extension
 */
function isExtensionOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return origin.startsWith('chrome-extension://') ||
         origin.startsWith('moz-extension://') ||
         origin.startsWith('safari-extension://');
}

/**
 * Add CORS headers for extension requests
 */
function addCorsHeaders(response: NextResponse, origin: string): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get('origin');

  // Handle CORS preflight for API routes from extensions
  if (request.method === 'OPTIONS' && pathname.startsWith('/api/') && isExtensionOrigin(origin)) {
    const response = new NextResponse(null, { status: 200 });
    return addCorsHeaders(response, origin!);
  }

  // Skip auth check for public routes
  if (
    publicRoutes.includes(pathname) ||
    publicPrefixes.some((prefix) => pathname.startsWith(prefix))
  ) {
    const response = await updateSession(request);

    // Add CORS headers for extension requests to API routes
    if (pathname.startsWith('/api/') && isExtensionOrigin(origin)) {
      return addCorsHeaders(response, origin!);
    }

    return response;
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
