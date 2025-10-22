import "./globals.css";
import { ReactNode } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/lib/contexts/auth-context";
import { SWRProvider } from "@/lib/providers/swr-provider";
import { ErrorBoundary } from "@/components/error-boundary";

export const metadata = {
  title: "Pawkit",
  description: "Your personal bookmark manager - save, organize, and discover",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/favicon.svg?v=3", type: "image/svg+xml" },
      { url: "/icons/favicon-96x96.png?v=3", sizes: "96x96", type: "image/png" }
    ],
    apple: "/icons/apple-touch-icon.png?v=3"
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <ErrorBoundary>
          <AuthProvider>
            <SWRProvider>
              <ThemeProvider>{children}</ThemeProvider>
            </SWRProvider>
          </AuthProvider>
        </ErrorBoundary>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Listen for CSP violations
              document.addEventListener('securitypolicyviolation', (e) => {
                console.error('[CSP Violation]', {
                  blockedURI: e.blockedURI,
                  violatedDirective: e.violatedDirective,
                  originalPolicy: e.originalPolicy,
                  disposition: e.disposition
                });
              });

              // Catch unhandled errors and log browser info
              window.addEventListener('error', (e) => {
                console.error('[Global Error]', {
                  message: e.message,
                  filename: e.filename,
                  lineno: e.lineno,
                  colno: e.colno,
                  userAgent: navigator.userAgent
                });
              });
            `,
          }}
        />
      </body>
    </html>
  );
}
