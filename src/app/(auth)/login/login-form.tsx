'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

// Whitelist of allowed redirect paths to prevent open redirect attacks
const ALLOWED_REDIRECT_PATHS = ['/dashboard', '/library', '/home', '/calendar', '/notes', '/favorites'];

/**
 * Normalize a path to prevent directory traversal and other bypass attempts
 * Returns null if the path is invalid/suspicious
 */
function normalizePath(path: string): string | null {
  // Must start with /
  if (!path.startsWith('/')) return null;

  // Block protocol-relative URLs (//example.com)
  if (path.startsWith('//')) return null;

  // Block directory traversal patterns
  if (path.includes('..')) return null;
  if (path.includes('./')) return null;

  // Block encoded traversal attempts (%2e = ., %2f = /)
  const decoded = decodeURIComponent(path);
  if (decoded.includes('..')) return null;
  if (decoded.includes('./')) return null;

  // Block null bytes and other control characters
  if (/[\x00-\x1f]/.test(path)) return null;

  // Normalize multiple slashes to single slash
  const normalized = path.replace(/\/+/g, '/');

  // Remove trailing slash for consistency (except for root)
  if (normalized.length > 1 && normalized.endsWith('/')) {
    return normalized.slice(0, -1);
  }

  return normalized;
}

function getSafeRedirectPath(requestedPath: string | null): string {
  if (!requestedPath) return '/dashboard';

  // Normalize the path first to prevent bypass attempts
  const normalizedPath = normalizePath(requestedPath);
  if (!normalizedPath) {
    console.warn('[Login] Blocked suspicious redirect path:', requestedPath);
    return '/dashboard';
  }

  // Only allow relative paths that are exactly in our whitelist
  if (ALLOWED_REDIRECT_PATHS.includes(normalizedPath)) {
    return normalizedPath;
  }

  // Check if it starts with an allowed path (for nested routes like /library/123)
  // Use normalized path to ensure consistent comparison
  if (ALLOWED_REDIRECT_PATHS.some(allowed => normalizedPath.startsWith(allowed + '/'))) {
    return normalizedPath;
  }

  return '/dashboard';
}

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = getSafeRedirectPath(searchParams.get('redirectTo'));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const supabase = getClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setIsLoading(true);

    const supabase = getClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    });

    if (error) {
      setError(error.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 w-full max-w-md">
      {/* V2 Migration Notice */}
      <div className="p-4 bg-red-950/80 border border-red-800 rounded-lg text-sm">
        <p className="font-semibold text-red-200 mb-2">
          Welcome to Pawkit 2.0!
        </p>
        <p className="text-red-300/90 mb-3">
          This is a completely rebuilt version of Pawkit. If you were using the previous version,
          your data is still available at{' '}
          <a
            href="https://v1.getpawkit.com"
            className="text-red-200 underline hover:text-white font-medium"
            target="_blank"
            rel="noopener noreferrer"
          >
            v1.getpawkit.com
          </a>
        </p>
        <p className="text-red-300/80 text-xs">
          Need help migrating your data? Reach out to us and we&apos;ll assist you.
        </p>
      </div>

      <Card className="border-zinc-800 bg-zinc-900/50">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl text-zinc-100">Welcome back</CardTitle>
        <CardDescription className="text-zinc-400">
          Sign in to your Pawkit account
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-400 bg-red-950/50 border border-red-900 rounded-md">
            {error}
          </div>
        )}

        <Button
          variant="outline"
          className="w-full border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-100"
          onClick={handleGoogleLogin}
          disabled={isLoading}
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-zinc-700" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-zinc-900 px-2 text-zinc-500">Or continue with</span>
          </div>
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-zinc-300">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-500"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-zinc-300">Password</Label>
              <Link
                href="/forgot-password"
                className="text-sm text-zinc-400 hover:text-zinc-300"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-500"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center">
        <p className="text-sm text-zinc-400">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-purple-400 hover:text-purple-300">
            Sign up
          </Link>
        </p>
      </CardFooter>
    </Card>
    </div>
  );
}

export default function LoginForm() {
  return (
    <Suspense fallback={<div className="text-zinc-400">Loading...</div>}>
      <LoginFormInner />
    </Suspense>
  );
}
