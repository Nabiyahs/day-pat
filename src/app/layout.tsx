import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ClientProviders } from '@/components/providers/client-providers'

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#F2B949",
};

export const metadata: Metadata = {
  title: {
    default: 'DayPat',
    template: '%s | DayPat',
  },
  description: 'Your daily praise journal with polaroid memories',
  keywords: ['praise', 'journal', 'diary', 'polaroid', 'self-care', 'gratitude', 'streak'],
  authors: [{ name: 'DayPat' }],
  openGraph: {
    title: 'DayPat',
    description: 'Your daily praise journal with polaroid memories',
    type: 'website',
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
          href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=Inter:wght@300;400;500;600;700&family=Noto+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased font-sans" style={{ fontFamily: "'Noto Sans', 'Inter', sans-serif" }}>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
