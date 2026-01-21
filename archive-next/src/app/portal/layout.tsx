import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/providers/theme-provider';
import '../globals.css';
import './portal.css';

export const metadata: Metadata = {
  title: 'Pawkit Portal',
  description: 'Quick access to your pawkits',
};

/**
 * Portal Layout
 *
 * Minimal layout for the portal window - no main navigation,
 * just a frameless window shell with drag region and controls.
 *
 * Note: No auth check here - the portal shares the same origin as the
 * main app, so cookies/auth are shared. If user isn't logged in,
 * they won't have data to display anyway.
 */
export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="portal-html" suppressHydrationWarning>
      <body className="portal-window" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
