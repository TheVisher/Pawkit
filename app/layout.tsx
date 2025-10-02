import "./globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "Visual Bookmark Manager",
  description: "Minimal bookmark manager for visual organization"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
