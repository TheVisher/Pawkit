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
      { url: "/PawkitFavicon.png", sizes: "any" },
      { url: "/PawkitFavicon.png", sizes: "32x32", type: "image/png" },
      { url: "/PawkitFavicon.png", sizes: "16x16", type: "image/png" }
    ],
    apple: "/PawkitFavicon.png"
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
