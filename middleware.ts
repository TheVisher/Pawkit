import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Handle API routes - check server sync for write operations
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Handle CORS preflight for extension requests
    const origin = request.headers.get('origin') || '';
    const isExtensionOrigin = origin.startsWith('chrome-extension://') || origin.startsWith('moz-extension://');

    if (request.method === 'OPTIONS' && isExtensionOrigin) {
      // Return CORS preflight response directly - don't let middleware interfere
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Get user for API routes that need serverSync check
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      // Check if this is a write operation (POST, PUT, PATCH, DELETE)
      const isWriteOperation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)

      if (isWriteOperation) {
        // Exceptions: These endpoints are allowed even in local-only mode
        const allowedPaths = [
          '/api/cards/[id]/fetch-metadata', // Metadata fetching (stores locally)
          '/api/user', // User profile updates (includes serverSync toggle itself)
          '/api/extension/token', // Extension token management
        ]

        const isAllowedException = allowedPaths.some(path => {
          // Convert Next.js dynamic route patterns to regex
          const pattern = path.replace(/\[id\]/g, '[^/]+')
          return new RegExp(`^${pattern}$`).test(request.nextUrl.pathname)
        })

        if (!isAllowedException) {
          // Note: ServerSync check moved to individual API routes
          // Middleware can't access PrismaClient in Edge Runtime
          // Each API route will handle its own serverSync validation
        }
      }
    }

    // Add CORS headers for extension requests
    if (isExtensionOrigin) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }

    return response
  }

  // Skip auth check for public pages
  const PUBLIC_PATHS = ['/privacy', '/privacy.html', '/terms', '/robots.txt', '/sitemap.xml', '/favicon.ico'];
  if (
    request.nextUrl.pathname === '/' ||
    PUBLIC_PATHS.some(p => request.nextUrl.pathname === p)
  ) {
    return response
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If user is not signed in and the current path is not /login or /signup, redirect to login
  if (!user && !request.nextUrl.pathname.startsWith('/login') && !request.nextUrl.pathname.startsWith('/signup')) {
    const loginUrl = new URL('/login', request.url)
    // Pass current path as returnUrl for post-login redirect
    const currentPath = request.nextUrl.pathname + request.nextUrl.search
    if (currentPath !== '/home') {
      loginUrl.searchParams.set('returnUrl', currentPath)
    }
    return NextResponse.redirect(loginUrl)
  }

  // If user is signed in and trying to access /login or /signup, redirect to home
  if (user && (request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/signup'))) {
    return NextResponse.redirect(new URL('/home', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
