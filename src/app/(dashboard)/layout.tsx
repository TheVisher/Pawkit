import { DashboardShell } from './dashboard-shell';

/**
 * Dashboard Layout
 *
 * Authentication is handled by Convex. The DashboardShell component
 * renders the login screen if the user is not authenticated.
 *
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardShell>
      {children}
    </DashboardShell>
  );
}
