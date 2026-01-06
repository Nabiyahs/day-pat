'use client'

/**
 * Debug utilities for mobile troubleshooting
 * Activated by adding ?debug=1 to URL
 */

export interface DebugLog {
  timestamp: number
  type: 'info' | 'error' | 'warn' | 'nav'
  message: string
  data?: unknown
}

// Global debug state
let debugLogs: DebugLog[] = []
let debugListeners: Set<() => void> = new Set()

export function isDebugMode(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return new URLSearchParams(window.location.search).get('debug') === '1'
  } catch {
    return false
  }
}

export function addDebugLog(type: DebugLog['type'], message: string, data?: unknown): void {
  const log: DebugLog = {
    timestamp: Date.now(),
    type,
    message,
    data,
  }

  debugLogs.push(log)

  // Keep only last 50 logs
  if (debugLogs.length > 50) {
    debugLogs = debugLogs.slice(-50)
  }

  // Notify listeners
  debugListeners.forEach(listener => listener())

  // Also log to console in debug mode
  if (isDebugMode()) {
    const prefix = `[Debug ${type.toUpperCase()}]`
    if (type === 'error') {
      console.error(prefix, message, data)
    } else if (type === 'warn') {
      console.warn(prefix, message, data)
    } else {
      console.log(prefix, message, data)
    }
  }
}

export function getDebugLogs(): DebugLog[] {
  return [...debugLogs]
}

export function clearDebugLogs(): void {
  debugLogs = []
  debugListeners.forEach(listener => listener())
}

export function subscribeToDebugLogs(listener: () => void): () => void {
  debugListeners.add(listener)
  return () => debugListeners.delete(listener)
}

/**
 * Setup global error capture
 * Call this once in a client component
 */
export function setupGlobalErrorCapture(): void {
  if (typeof window === 'undefined') return

  // Capture unhandled errors
  window.onerror = (message, source, lineno, colno, error) => {
    addDebugLog('error', `Unhandled error: ${message}`, {
      source,
      lineno,
      colno,
      stack: error?.stack,
    })
    return false // Let browser also handle it
  }

  // Capture unhandled promise rejections
  window.onunhandledrejection = (event) => {
    addDebugLog('error', `Unhandled promise rejection: ${event.reason}`, {
      reason: event.reason,
      stack: event.reason?.stack,
    })
  }

  addDebugLog('info', 'Global error capture initialized')
}

/**
 * Get device/browser info for debugging
 */
export function getDeviceInfo(): Record<string, string> {
  if (typeof window === 'undefined') {
    return { environment: 'server' }
  }

  const ua = navigator.userAgent

  // Detect browser
  let browser = 'Unknown'
  if (ua.includes('Safari') && !ua.includes('Chrome')) {
    browser = 'Safari'
  } else if (ua.includes('Chrome')) {
    browser = 'Chrome'
  } else if (ua.includes('Firefox')) {
    browser = 'Firefox'
  }

  // Detect OS
  let os = 'Unknown'
  if (ua.includes('iPhone') || ua.includes('iPad')) {
    os = 'iOS'
  } else if (ua.includes('Android')) {
    os = 'Android'
  } else if (ua.includes('Mac')) {
    os = 'macOS'
  } else if (ua.includes('Windows')) {
    os = 'Windows'
  }

  // Check if it's in-app browser
  const isInAppBrowser =
    ua.includes('FBAN') || // Facebook
    ua.includes('FBAV') ||
    ua.includes('Instagram') ||
    ua.includes('Line') ||
    ua.includes('KAKAOTALK')

  return {
    browser,
    os,
    isInAppBrowser: isInAppBrowser ? 'Yes' : 'No',
    isMobile: /iPhone|iPad|Android/i.test(ua) ? 'Yes' : 'No',
    userAgent: ua.slice(0, 100) + '...',
    screenWidth: String(window.screen?.width || 0),
    screenHeight: String(window.screen?.height || 0),
    cookiesEnabled: navigator.cookieEnabled ? 'Yes' : 'No',
  }
}

/**
 * Check storage availability
 */
export function checkStorageAvailability(): Record<string, string> {
  const result: Record<string, string> = {}

  // Check localStorage
  try {
    localStorage.setItem('__test__', '1')
    localStorage.removeItem('__test__')
    result.localStorage = 'Available'
  } catch (e) {
    result.localStorage = `Blocked: ${e}`
  }

  // Check sessionStorage
  try {
    sessionStorage.setItem('__test__', '1')
    sessionStorage.removeItem('__test__')
    result.sessionStorage = 'Available'
  } catch (e) {
    result.sessionStorage = `Blocked: ${e}`
  }

  // Check cookies
  try {
    document.cookie = '__test__=1; path=/; max-age=1'
    const hasCookie = document.cookie.includes('__test__')
    result.cookies = hasCookie ? 'Available' : 'Blocked'
  } catch (e) {
    result.cookies = `Error: ${e}`
  }

  return result
}

/**
 * Get app-specific localStorage values for debugging
 */
export function getAppLocalStorage(): Record<string, string> {
  if (typeof window === 'undefined') {
    return { status: 'SSR' }
  }

  const result: Record<string, string> = {}
  const appKeys = [
    'onboarding_completed',
    'remember_me',
    'session_id',
    'locale',
  ]

  for (const key of appKeys) {
    try {
      const value = localStorage.getItem(key)
      result[key] = value === null ? '(not set)' : `"${value}"`
    } catch (e) {
      result[key] = `Error: ${e}`
    }
  }

  return result
}

/**
 * Reset onboarding state (for testing)
 */
export function resetOnboarding(): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem('onboarding_completed')
    addDebugLog('info', 'Onboarding state reset')
  } catch (e) {
    addDebugLog('error', 'Failed to reset onboarding', { error: String(e) })
  }
}
