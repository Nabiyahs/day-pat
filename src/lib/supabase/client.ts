'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useMemo } from 'react'

/**
 * Create a Supabase browser client using cookie-based storage.
 * This is the proper way to use Supabase with Next.js App Router SSR.
 *
 * The @supabase/ssr package automatically handles cookie storage,
 * which ensures PKCE verifiers and session tokens are properly synced
 * between client and server.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * Singleton client instance for consistent state across the app
 */
let browserClient: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseClient() {
  if (typeof window === 'undefined') {
    // Server-side: create new instance (though this shouldn't be used on server)
    return createClient()
  }

  if (!browserClient) {
    browserClient = createClient()
  }

  return browserClient
}

/**
 * Reset the client (useful for testing or after logout)
 */
export function resetSupabaseClient() {
  browserClient = null
}

/**
 * React hook for Supabase client
 */
export function useSupabase() {
  return useMemo(() => getSupabaseClient(), [])
}
