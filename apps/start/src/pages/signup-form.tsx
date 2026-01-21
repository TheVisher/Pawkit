'use client';

import { useState } from 'react';
import { useRouter } from '@/lib/navigation';
import { Link } from '@tanstack/react-router';
import { useAuthActions } from '@convex-dev/auth/react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { validatePassword } from '@/lib/password-validator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function SignupForm() {
  const router = useRouter();
  const { signIn } = useAuthActions();
  const ensureDefaultWorkspace = useMutation(api.users.ensureDefaultWorkspace);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const { valid, errors } = validatePassword(password);
    if (!valid) {
      setError(errors.join('. '));
      return;
    }

    setIsLoading(true);

    try {
      await signIn('password', {
        email,
        password,
        flow: 'signUp',
      });
      try {
        await ensureDefaultWorkspace();
      } catch (workspaceError) {
        console.warn('[Signup] Failed to ensure default workspace:', workspaceError);
      }
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
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
        <CardTitle className="text-2xl text-zinc-100">Create an account</CardTitle>
        <CardDescription className="text-zinc-400">
          Get started with Pawkit
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-400 bg-red-950/50 border border-red-900 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailSignup} className="space-y-4">
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
            <Label htmlFor="password" className="text-zinc-300">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={12}
              className="border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-zinc-300">Confirm password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-500"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            disabled={isLoading}
          >
            {isLoading ? 'Creating account...' : 'Create account'}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center">
        <p className="text-sm text-zinc-400">
          Already have an account?{' '}
          <Link to="/login" className="text-purple-400 hover:text-purple-300">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
    </div>
  );
}
