import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/server/prisma'

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
        set(name: string, value: string, options: any) {
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
        remove(name: string, options: any) {
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
          // Check user's serverSync setting from database
          try {
            const dbUser = await prisma.user.findUnique({
              where: { id: user.id },
              select: { serverSync: true },
            })

            if (dbUser && !dbUser.serverSync) {
              // User has local-only mode enabled - block the write operation
              return NextResponse.json(
                {
                  error: 'Local-Only Mode Active',
                  message: 'Server sync is disabled. This operation cannot be performed in local-only mode. Please enable server sync in settings to sync your data to the cloud.',
                  localOnly: true,
                },
                { status: 403 }
              )
            }
          } catch (error) {
            console.error('[Middleware] Failed to check serverSync setting:', error)
            // On error, allow the operation to proceed (fail open for availability)
          }
        }
      }
    }

    return response
  }

  // Skip auth check for landing page and demo
  if (request.nextUrl.pathname === '/' || request.nextUrl.pathname.startsWith('/demo')) {
    return response
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If user is not signed in and the current path is not /login or /signup, redirect to login
  if (!user && !request.nextUrl.pathname.startsWith('/login') && !request.nextUrl.pathname.startsWith('/signup')) {
    return NextResponse.redirect(new URL('/login', request.url))
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
