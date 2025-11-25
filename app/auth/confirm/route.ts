import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const next = requestUrl.searchParams.get('next') ?? '/home'

  // Handle email confirmation
  if (token_hash && type) {
    const supabase = await createClient()

    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'email' | 'signup' | 'recovery' | 'invite' | 'magiclink' | 'email_change',
    })

    if (!error) {
      // Email verified successfully - redirect to home with success message
      const redirectUrl = new URL(next, requestUrl.origin)
      redirectUrl.searchParams.set('verified', 'true')
      return NextResponse.redirect(redirectUrl)
    }

    // Verification failed - redirect to login with error
    const errorUrl = new URL('/login', requestUrl.origin)
    errorUrl.searchParams.set('error', 'email_verification_failed')
    errorUrl.searchParams.set('message', error.message || 'Email verification failed. Please try again.')
    return NextResponse.redirect(errorUrl)
  }

  // No token - redirect to login
  const loginUrl = new URL('/login', requestUrl.origin)
  loginUrl.searchParams.set('error', 'missing_token')
  return NextResponse.redirect(loginUrl)
}
