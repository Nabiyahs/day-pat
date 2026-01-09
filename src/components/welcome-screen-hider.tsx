'use client'

import { useEffect } from 'react'

// Extend Window interface for TypeScript
declare global {
  interface Window {
    __hideWelcomeScreen?: (minMs?: number) => void
    __WELCOME_MOUNTED_AT?: number
  }
}

/**
 * Client component that triggers welcome screen hide after React hydration.
 *
 * The actual hide timing is controlled by __hideWelcomeScreen which enforces
 * a minimum display time (900ms) to prevent the welcome from "flashing" away.
 *
 * This component simply signals "app is ready" - the inline script handles
 * ensuring welcome stays visible long enough for a good UX.
 */
export function WelcomeScreenHider() {
  useEffect(() => {
    // Signal to hide welcome screen after hydration
    // The __hideWelcomeScreen function enforces minimum display time internally
    // so we can call it immediately - it will wait if needed
    if (typeof window !== 'undefined' && window.__hideWelcomeScreen) {
      // Call with default minimum (900ms enforced by the function)
      window.__hideWelcomeScreen()
    }

    // Also register a window load handler as backup
    // (in case this effect runs before load event)
    const handleLoad = () => {
      if (window.__hideWelcomeScreen) {
        window.__hideWelcomeScreen()
      }
    }

    window.addEventListener('load', handleLoad)
    return () => window.removeEventListener('load', handleLoad)
  }, [])

  // This component doesn't render anything
  return null
}
