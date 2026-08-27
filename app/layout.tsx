import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/components/auth/AuthProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Subh Enterprise | Portal",
  description: "Secure system authentication for Subh Enterprise distribution management.",
};

/**
 * Explicit viewport export — required for correct layout on real mobile devices
 * accessed via network IP (http://192.168.x.x:3000).
 *
 * - interactiveWidget: 'resizes-visual' ensures the virtual keyboard shrinks
 *   only the visual viewport, not the layout viewport, preventing layout jumps.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-visual",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-[#F4F7FB] text-slate-800">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
