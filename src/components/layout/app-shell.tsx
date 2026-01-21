'use client';

import { useRouterState } from '@tanstack/react-router';
import { DashboardShell } from '@/components/layout/dashboard-shell';

type AppShellProps = {
  children: React.ReactNode;
};

const isStandaloneRoute = (pathname: string) => {
  return (
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/editor') ||
    pathname.startsWith('/demo')
  );
};

export function AppShell({ children }: AppShellProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const standalone = isStandaloneRoute(pathname);

  if (standalone) {
    return <>{children}</>;
  }

  return <DashboardShell>{children}</DashboardShell>;
}
