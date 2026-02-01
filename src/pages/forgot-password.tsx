'use client';

import { Suspense, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useAuthActions } from '@convex-dev/auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Mail, KeyRound, CheckCircle2 } from 'lucide-react';

type Step = 'email' | 'code' | 'success';

function ForgotPasswordFormInner() {
  const { signIn } = useAuthActions();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await signIn('password', {
        email,
        flow: 'reset',
      });
      setStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      await signIn('password', {
        email,
        code,
        newPassword,
        flow: 'reset-verification',
      });
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="w-full max-w-md">
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>
            <CardTitle className="text-2xl text-zinc-100">Password Reset</CardTitle>
            <CardDescription className="text-zinc-400">
              Your password has been successfully reset
            </CardDescription>
          </CardHeader>

          <CardFooter className="justify-center">
            <Link to="/login">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                Sign in with new password
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (step === 'code') {
    return (
      <div className="w-full max-w-md">
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/10">
              <KeyRound className="h-6 w-6 text-purple-500" />
            </div>
            <CardTitle className="text-2xl text-zinc-100">Enter Code</CardTitle>
            <CardDescription className="text-zinc-400">
              We sent a verification code to <span className="text-zinc-200">{email}</span>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-400 bg-red-950/50 border border-red-900 rounded-md">
                {error}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-zinc-300">Verification Code</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="Enter 8-digit code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  autoComplete="one-time-code"
                  className="border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-500 text-center text-lg tracking-widest"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-zinc-300">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-zinc-300">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-500"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                disabled={isLoading}
              >
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setStep('email')}
                className="text-sm text-zinc-400 hover:text-zinc-300"
              >
                Didn't receive the code? Try again
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/10">
            <Mail className="h-6 w-6 text-purple-500" />
          </div>
          <CardTitle className="text-2xl text-zinc-100">Forgot Password?</CardTitle>
          <CardDescription className="text-zinc-400">
            Enter your email and we'll send you a code to reset your password
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-400 bg-red-950/50 border border-red-900 rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleRequestCode} className="space-y-4">
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

            <Button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? 'Sending...' : 'Send Reset Code'}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center">
          <Link to="/login" className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-300">
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="text-zinc-400">Loading...</div>}>
      <ForgotPasswordFormInner />
    </Suspense>
  );
}
