'use client'

import { useState, useEffect, Suspense } from 'react'
import { useAuth } from '@/lib/contexts/auth-context'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Turnstile } from '@marsidev/react-turnstile'

// Skip captcha on Vercel preview deployments (domain not in Turnstile allowlist)
const isPreview = process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview'
const showTurnstile = !isPreview && !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const { signIn } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Check for verification success or error from email confirmation
  useEffect(() => {
    const verified = searchParams.get('verified')
    const errorParam = searchParams.get('error')
    const message = searchParams.get('message')

    if (verified === 'true') {
      setSuccess('Email verified successfully! You can now sign in.')
    }
    if (errorParam) {
      setError(message || 'An error occurred. Please try again.')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    const { error } = await signIn(email, password, captchaToken || undefined)

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      // Get return URL from query params, default to /home
      const returnUrl = searchParams.get('returnUrl') || '/home'
      // Force a full page refresh to ensure middleware picks up auth state
      router.refresh()
      router.push(returnUrl)
      // Fallback: force reload if push doesn't work
      setTimeout(() => {
        window.location.href = returnUrl
      }, 500)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold text-gray-100">Welcome back</h1>
        <p className="text-sm text-gray-400">
          Sign in to your Pawkit account
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {success && (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/50 p-3 text-sm text-emerald-400">
            {success}
          </div>
        )}
        {error && (
          <div className="rounded-lg bg-rose-500/10 border border-rose-500/50 p-3 text-sm text-rose-400">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-gray-300">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-800 bg-gray-900 px-4 py-2 text-gray-100 placeholder-gray-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder="you@example.com"
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium text-gray-300">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-800 bg-gray-900 px-4 py-2 text-gray-100 placeholder-gray-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder="••••••••"
            disabled={loading}
          />
        </div>

        {showTurnstile && (
          <div className="flex justify-center">
            <Turnstile
              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
              onSuccess={(token) => setCaptchaToken(token)}
              onError={() => setCaptchaToken(null)}
              onExpire={() => setCaptchaToken(null)}
              options={{
                theme: 'dark',
              }}
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading || (showTurnstile && !captchaToken)}
          className="w-full rounded-lg bg-accent px-4 py-2 font-medium text-gray-900 hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-400">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-accent hover:text-accent/80 font-medium">
          Sign up
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center text-gray-400">Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}
