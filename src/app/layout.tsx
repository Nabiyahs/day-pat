import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ClientProviders } from '@/components/providers/client-providers'
import { AppShell } from '@/components/shell'
import { WelcomeScreenHider } from '@/components/welcome-screen-hider'

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#fffbeb",
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

// Inline styles for Welcome Screen - must match login page exactly
// This is rendered server-side so it appears immediately before JS loads
// CRITICAL: These styles MUST NOT depend on Tailwind or external CSS
const welcomeScreenStyles = `
  /* Set body/html background immediately to prevent blank flash */
  html, body {
    background: linear-gradient(to bottom right, #fffbeb, #fefce8, #fff7ed) !important;
    min-height: 100%;
  }
  #welcome-screen {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 99999;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(to bottom right, #fffbeb, #fefce8, #fff7ed);
    opacity: 1;
    visibility: visible;
    transition: opacity 350ms ease-out, visibility 0ms linear 350ms;
  }
  #welcome-screen.hide {
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
  }
  #welcome-screen .welcome-content {
    text-align: center;
  }
  #welcome-screen .welcome-title {
    /* Match login: text-5xl font-bold with Caveat */
    font-family: 'Caveat', 'Comic Sans MS', cursive;
    font-size: 3rem;
    font-weight: 700;
    color: #F27430;
    margin: 0 0 0.75rem 0;
    line-height: 1;
  }
  #welcome-screen .welcome-subtitle {
    /* Match login: text-sm */
    font-family: 'Noto Sans', 'Inter', system-ui, -apple-system, sans-serif;
    font-size: 0.875rem;
    font-weight: 400;
    color: #F27430;
    letter-spacing: 0.025em;
    margin: 0;
  }
`

// Inline script to provide hide function with MINIMUM DISPLAY TIME
// This script runs before React hydration to ensure functions are available
// CRITICAL: Welcome must stay visible for at least MIN_DISPLAY_MS to avoid "flash"
const welcomeScreenScript = `
  // Track when welcome screen was mounted (immediately on script execution)
  window.__WELCOME_MOUNTED_AT = Date.now();

  // Minimum time welcome must be visible (prevents "flash" feeling)
  // 3 seconds ensures a proper branded experience
  var MIN_DISPLAY_MS = 3000;

  // Hide function with minimum display time enforcement
  window.__hideWelcomeScreen = function(minMs) {
    // Use provided minMs or default to MIN_DISPLAY_MS
    var requiredMs = typeof minMs === 'number' ? minMs : MIN_DISPLAY_MS;
    var el = document.getElementById('welcome-screen');
    if (!el || el.classList.contains('hide')) return;

    var elapsed = Date.now() - window.__WELCOME_MOUNTED_AT;
    var remaining = Math.max(0, requiredMs - elapsed);

    // If we haven't shown welcome long enough, wait
    if (remaining > 0) {
      setTimeout(function() {
        if (el && !el.classList.contains('hide')) {
          el.classList.add('hide');
          setTimeout(function() {
            if (el && el.parentNode) el.parentNode.removeChild(el);
          }, 400);
        }
      }, remaining);
    } else {
      // Already shown long enough, hide immediately
      el.classList.add('hide');
      setTimeout(function() {
        if (el && el.parentNode) el.parentNode.removeChild(el);
      }, 400);
    }
  };

  // Safety fallback: auto-hide after 6 seconds no matter what
  setTimeout(function() {
    var el = document.getElementById('welcome-screen');
    if (el && !el.classList.contains('hide')) {
      el.classList.add('hide');
      setTimeout(function() {
        if (el && el.parentNode) el.parentNode.removeChild(el);
      }, 400);
    }
  }, 6000);
`

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
        {/* Inline styles for welcome screen - ensures immediate display */}
        <style dangerouslySetInnerHTML={{ __html: welcomeScreenStyles }} />
      </head>
      <body
          className="antialiased font-sans"
          style={{
            fontFamily: "'Noto Sans', 'Inter', system-ui, -apple-system, sans-serif",
            background: 'linear-gradient(to bottom right, #fffbeb, #fefce8, #fff7ed)',
            minHeight: '100%',
          }}
        >
        {/* Welcome Screen - rendered server-side, visible immediately on first paint */}
        <div id="welcome-screen">
          <div className="welcome-content">
            <h1 className="welcome-title">DayPat</h1>
            <p className="welcome-subtitle">EVERY DAY DESERVES A PAT.</p>
          </div>
        </div>
        {/* Inline script for hide function - runs before React hydration */}
        <script dangerouslySetInnerHTML={{ __html: welcomeScreenScript }} />

        <ClientProviders>
          <AppShell>{children}</AppShell>
        </ClientProviders>

        {/* Client component to hide welcome screen after hydration */}
        <WelcomeScreenHider />
      </body>
    </html>
  );
}
