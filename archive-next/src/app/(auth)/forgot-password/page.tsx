'use client';

import dynamic from 'next/dynamic';

const ForgotPasswordForm = dynamic(() => import('./forgot-password-form'), {
  ssr: false,
  loading: () => (
    <div className="border border-zinc-800 bg-zinc-900/50 rounded-lg p-6">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-semibold text-zinc-100">Reset password</h1>
        <p className="text-zinc-400 mt-2">Enter your email to receive a reset link</p>
      </div>
      <div className="space-y-4">
        <div className="h-10 bg-zinc-800 rounded-md animate-pulse" />
        <div className="h-10 bg-zinc-800 rounded-md animate-pulse" />
      </div>
    </div>
  ),
});

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
