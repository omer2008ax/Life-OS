import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";
import { CoachWidget } from "@/components/coach-widget";
import { NotificationBanner } from "@/components/notification-banner";
import { SettingsProvider } from "@/lib/settings-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Life OS",
  description: "Personal life management system",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Life OS",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#f8f8f8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SettingsProvider>
          <div className="min-h-dvh flex flex-col">
            <NotificationBanner />
            <main className="flex-1 container mx-auto px-4 py-6 max-w-2xl">
              {children}
            </main>
            <Nav />
            <CoachWidget />
          </div>
        </SettingsProvider>
      </body>
    </html>
  );
}
