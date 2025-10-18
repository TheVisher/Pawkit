import "./globals.css";
import { ReactNode } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/lib/contexts/auth-context";
import { SWRProvider } from "@/lib/providers/swr-provider";

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
        <AuthProvider>
          <SWRProvider>
            <ThemeProvider>{children}</ThemeProvider>
          </SWRProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
