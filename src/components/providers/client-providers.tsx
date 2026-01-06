'use client'

import { DebugPanel } from '@/components/debug'

interface ClientProvidersProps {
  children: React.ReactNode
}

/**
 * Client-side providers wrapper
 * Includes debug panel and any future client-side providers
 */
export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <>
      {children}
      <DebugPanel />
    </>
  )
}
