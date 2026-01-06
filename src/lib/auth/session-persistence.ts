'use client'

/**
 * Session persistence utilities for "Keep me logged in" feature.
 *
 * Strategy:
 * - Store the user's "remember me" preference in localStorage
 * - Use sessionStorage to track browser session identity
 * - On page load, if "remember me" is false and we detect a new browser session,
 *   we should sign out the user
 *
 * This works with Supabase's cookie-based auth without breaking SSR.
 */

const REMEMBER_ME_KEY = 'remember_me'
const SESSION_ID_KEY = 'browser_session_id'

/**
 * Generate a UUID that works across all browsers including mobile.
 * Falls back to a custom implementation if crypto.randomUUID is not available.
 */
function generateUUID(): string {
  // Try native crypto.randomUUID first (requires secure context)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID()
    } catch {
      // Fall through to fallback
    }
  }

  // Fallback: Use crypto.getRandomValues if available
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const array = new Uint8Array(16)
    crypto.getRandomValues(array)
    // Set version (4) and variant bits
    array[6] = (array[6] & 0x0f) | 0x40
    array[8] = (array[8] & 0x3f) | 0x80
    const hex = Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }

  // Final fallback: Math.random based UUID (less secure but works everywhere)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Get the "remember me" preference
 */
export function getRememberMe(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const value = localStorage.getItem(REMEMBER_ME_KEY)
    // Default to true if not set (better UX)
    return value === null ? true : value === 'true'
  } catch {
    return true
  }
}

/**
 * Set the "remember me" preference
 */
export function setRememberMe(value: boolean): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(REMEMBER_ME_KEY, String(value))

    if (value) {
      // If remembering, store session ID in localStorage too
      const sessionId = getOrCreateSessionId()
      localStorage.setItem(SESSION_ID_KEY, sessionId)
    } else {
      // If not remembering, remove from localStorage
      localStorage.removeItem(SESSION_ID_KEY)
    }
  } catch {
    // Silently fail if storage is not available
  }
}

/**
 * Get or create a unique session ID for this browser session.
 * This is stored in sessionStorage, so it's unique per tab/session.
 */
function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return ''

  try {
    let sessionId = sessionStorage.getItem(SESSION_ID_KEY)
    if (!sessionId) {
      sessionId = generateUUID()
      sessionStorage.setItem(SESSION_ID_KEY, sessionId)
    }
    return sessionId
  } catch {
    // Return a temporary ID if storage fails
    return generateUUID()
  }
}

/**
 * Check if this is a new browser session (user closed and reopened browser).
 * Returns true if the user should be signed out due to "remember me" being off.
 */
export function shouldSignOutOnNewSession(): boolean {
  if (typeof window === 'undefined') return false

  try {
    const rememberMe = getRememberMe()

    // If remember me is on, never sign out
    if (rememberMe) return false

    // Check if this is a new browser session
    const currentSessionId = getOrCreateSessionId()
    const storedSessionId = localStorage.getItem(SESSION_ID_KEY)

    // If no stored session ID, this is the first session - don't sign out
    if (!storedSessionId) {
      localStorage.setItem(SESSION_ID_KEY, currentSessionId)
      return false
    }

    // If session IDs don't match, this is a new session
    if (currentSessionId !== storedSessionId) {
      // Update stored session ID
      localStorage.setItem(SESSION_ID_KEY, currentSessionId)
      return true
    }

    return false
  } catch {
    // If any error occurs, don't sign out
    return false
  }
}

/**
 * Clear session tracking (call on logout)
 */
export function clearSessionTracking(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(SESSION_ID_KEY)
    sessionStorage.removeItem(SESSION_ID_KEY)
  } catch {
    // Silently fail
  }
}
