import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppProviders } from "@/providers/app-providers";
import { ThemeProvider } from "@/providers/theme-provider";
import { AppShell } from "@/components/layout/app-shell";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CCPL 2026 Scoring Pro | Cisco Champions Premier League",
  description:
    "Enterprise-grade cricket tournament management and live scoring for CCPL 2026. Live scores, stats, leaderboards, and mobile scoring.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CCPL Scoring Pro",
  },
  openGraph: {
    title: "CCPL 2026 Scoring Pro",
    description: "Live cricket scoring for Cisco Champions Premier League 2026",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0066cc",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full antialiased">
        <ThemeProvider>
          <AppProviders>
            <ServiceWorkerRegister />
            <AppShell>{children}</AppShell>
          </AppProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
