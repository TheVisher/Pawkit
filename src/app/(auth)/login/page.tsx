'use client';

import dynamic from 'next/dynamic';

// Dynamically import with SSR disabled to prevent hydration issues
const LoginForm = dynamic(() => import('./login-form'), {
  ssr: false,
  loading: () => (
    <div className="border border-zinc-800 bg-zinc-900/50 rounded-lg p-6">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-semibold text-zinc-100">Welcome back</h1>
        <p className="text-zinc-400 mt-2">Sign in to your Pawkit account</p>
      </div>
      <div className="space-y-4">
        <div className="h-10 bg-zinc-800 rounded-md animate-pulse" />
        <div className="h-4" />
        <div className="space-y-4">
          <div className="h-10 bg-zinc-800 rounded-md animate-pulse" />
          <div className="h-10 bg-zinc-800 rounded-md animate-pulse" />
          <div className="h-10 bg-zinc-800 rounded-md animate-pulse" />
        </div>
      </div>
    </div>
  ),
});

export default function LoginPage() {
  return <LoginForm />;
}
