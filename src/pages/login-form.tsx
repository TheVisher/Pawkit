'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from '@/lib/navigation';
import { Link } from '@tanstack/react-router';
import { useAuthActions } from '@convex-dev/auth/react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

// Whitelist of allowed redirect paths to prevent open redirect attacks
const ALLOWED_REDIRECT_PATHS = ['/dashboard', '/library', '/home', '/calendar', '/notes', '/favorites', '/extension/connect'];

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
  const { signIn } = useAuthActions();
  const ensureDefaultWorkspace = useMutation(api.users.ensureDefaultWorkspace);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await signIn('password', {
        email,
        password,
        flow: 'signIn',
      });
      try {
        await ensureDefaultWorkspace();
      } catch (workspaceError) {
        console.warn('[Login] Failed to ensure default workspace:', workspaceError);
      }
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
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
              <Link to="/forgot-password" className="text-sm text-purple-400 hover:text-purple-300">
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
          <Link to="/signup" className="text-purple-400 hover:text-purple-300">
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
