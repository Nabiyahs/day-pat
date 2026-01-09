import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ClientProviders } from '@/components/providers/client-providers'
import { AppShell } from '@/components/shell'

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  title: {
    default: 'DayPat',
    template: '%s | DayPat',
  },
  description: 'Your daily praise journal with polaroid memories',
  keywords: ['praise', 'journal', 'diary', 'polaroid', 'self-care', 'gratitude', 'streak'],
  authors: [{ name: 'DayPat' }],
  // PWA manifest
  manifest: '/manifest.json',
  // iOS PWA settings (Add to Home Screen)
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'DayPat',
  },
  openGraph: {
    title: 'DayPat',
    description: 'Your daily praise journal with polaroid memories',
    type: 'website',
  },
  // App icons
  icons: {
    icon: [
      { url: '/icons/daypat-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/daypat-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=Inter:wght@300;400;500;600;700&family=Noto+Sans:wght@400;500;600;700&family=Open+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased font-sans" style={{ fontFamily: "'Noto Sans', 'Inter', sans-serif" }}>
        <ClientProviders>
          <AppShell>{children}</AppShell>
        </ClientProviders>
      </body>
    </html>
  );
}
