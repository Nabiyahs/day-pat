'use client'

/**
 * AppShell - Desktop letterboxing wrapper
 *
 * Keeps mobile UI exactly as-is while centering it on larger screens.
 * - Mobile (<768px): Full width, no changes
 * - Desktop (≥768px): Centered 390px container with side letterboxing
 *
 * This does NOT change any existing page styles or components.
 */

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <div className="app-container">
        {children}
      </div>
    </div>
  )
}
