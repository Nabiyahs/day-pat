'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useMemo } from 'react'

const REMEMBER_ME_KEY = 'praise_calendar_remember_me'

/**
 * Get the "Remember Me" preference from localStorage
 */
export function getRememberMe(): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(REMEMBER_ME_KEY) !== 'false'
}

/**
 * Set the "Remember Me" preference
 * Must be called BEFORE signIn to take effect
 */
export function setRememberMe(remember: boolean): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(REMEMBER_ME_KEY, remember ? 'true' : 'false')
}

/**
 * Custom storage that uses localStorage or sessionStorage based on Remember Me setting
 */
function createCustomStorage(useLocalStorage: boolean) {
  const storage = useLocalStorage
    ? (typeof window !== 'undefined' ? window.localStorage : undefined)
    : (typeof window !== 'undefined' ? window.sessionStorage : undefined)

  return {
    getItem: (key: string): string | null => {
      return storage?.getItem(key) ?? null
    },
    setItem: (key: string, value: string): void => {
      storage?.setItem(key, value)
    },
    removeItem: (key: string): void => {
      storage?.removeItem(key)
    },
  }
}

/**
 * Create a Supabase browser client with session persistence based on Remember Me
 */
export function createClient() {
  const rememberMe = getRememberMe()

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        storage: createCustomStorage(rememberMe),
        storageKey: 'praise-calendar-auth',
        flowType: 'pkce',
      },
    }
  )
}

/**
 * Singleton client instance for consistent state across the app
 */
let browserClient: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseClient() {
  if (typeof window === 'undefined') {
    // Server-side: create new instance
    return createClient()
  }

  if (!browserClient) {
    browserClient = createClient()
  }

  return browserClient
}

/**
 * Reset the client (call when Remember Me changes)
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
