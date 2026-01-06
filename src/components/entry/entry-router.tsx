'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { type Locale, appTitles } from '@/lib/i18n/config'
import { shouldSignOutOnNewSession, clearSessionTracking } from '@/lib/auth/session-persistence'
import { createClient } from '@/lib/supabase/client'
import { addDebugLog, isDebugMode } from '@/lib/debug'

const ONBOARDING_KEY = 'onboarding_completed'
const NAVIGATION_TIMEOUT_MS = 5000 // 5 second timeout for navigation

interface EntryRouterProps {
  locale: Locale
  isAuthenticated: boolean
}

/**
 * Client-side router for entry point.
 * Routes based on onboarding completion status and auth state.
 *
 * Flow:
 * - First time users: Always show onboarding
 * - Returning users who completed onboarding:
 *   - If logged in → go to app
 *   - If not logged in → go to login
 *
 * Query params:
 * - ?reset_onboarding=1 - Clears onboarding completion to test intro flow
 * - ?debug=1 - Shows debug info
 *
 * Also handles "Keep me logged in" session management.
 * Includes timeout fallback for mobile browsers where router.replace may fail silently.
 */
export function EntryRouter({ locale, isAuthenticated }: EntryRouterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [hasError, setHasError] = useState(false)
  const [targetPath, setTargetPath] = useState<string | null>(null)
  const [showFallback, setShowFallback] = useState(false)
  const [onboardingStatus, setOnboardingStatus] = useState<string>('checking...')

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null

    const handleRouting = async () => {
      try {
        addDebugLog('nav', 'EntryRouter: Starting routing', {
          locale,
          isAuthenticated,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'SSR',
        })

        // Check for reset_onboarding query param (for testing)
        const resetOnboarding = searchParams.get('reset_onboarding') === '1'
        if (resetOnboarding) {
          try {
            localStorage.removeItem(ONBOARDING_KEY)
            addDebugLog('info', 'EntryRouter: Onboarding reset via query param')
          } catch (e) {
            addDebugLog('warn', 'EntryRouter: Failed to reset onboarding', { error: String(e) })
          }
        }

        // Safely check localStorage
        let completed = false
        let rawValue: string | null = null
        try {
          rawValue = localStorage.getItem(ONBOARDING_KEY)
          completed = rawValue === 'true'
          setOnboardingStatus(`localStorage: "${rawValue}" → completed: ${completed}`)
          addDebugLog('info', 'EntryRouter: localStorage check', {
            rawValue,
            onboardingCompleted: completed
          })
        } catch (e) {
          setOnboardingStatus(`localStorage error: ${String(e)}`)
          addDebugLog('warn', 'EntryRouter: localStorage not available', { error: String(e) })
          completed = false
        }

        // Check if we should sign out due to "remember me" being off
        if (isAuthenticated) {
          try {
            if (shouldSignOutOnNewSession()) {
              addDebugLog('info', 'EntryRouter: Signing out due to session policy')
              const supabase = createClient()
              await supabase.auth.signOut()
              clearSessionTracking()
              // After sign out, proceed as unauthenticated
              const path = completed ? `/${locale}/login` : `/${locale}/onboarding`
              setTargetPath(path)
              addDebugLog('nav', 'EntryRouter: Navigating after sign out', { path })
              router.replace(path)
              return
            }
          } catch (e) {
            addDebugLog('warn', 'EntryRouter: Session check failed', { error: String(e) })
          }
        }

        // Determine target path based on onboarding completion and auth status
        let path: string
        if (!completed) {
          // New user or reset - show onboarding
          path = `/${locale}/onboarding`
          addDebugLog('nav', 'EntryRouter: New user, going to onboarding')
        } else if (isAuthenticated) {
          // Completed onboarding and logged in - go to app
          path = `/${locale}/app`
          addDebugLog('nav', 'EntryRouter: Authenticated user, going to app')
        } else {
          // Completed onboarding but not logged in - go to login
          path = `/${locale}/login`
          addDebugLog('nav', 'EntryRouter: Returning user, going to login')
        }

        setTargetPath(path)

        // Set a timeout to detect if navigation fails silently
        timeoutId = setTimeout(() => {
          addDebugLog('error', 'EntryRouter: Navigation timeout - router.replace may have failed', {
            targetPath: path,
            showingFallback: true,
          })
          setShowFallback(true)
        }, NAVIGATION_TIMEOUT_MS)

        // Attempt navigation
        router.replace(path)
        addDebugLog('nav', 'EntryRouter: router.replace called', { path })

      } catch (error) {
        addDebugLog('error', 'EntryRouter: Routing error', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        })
        console.error('[EntryRouter] Routing error:', error)
        setHasError(true)

        // Fallback: go to onboarding on any error
        const fallbackPath = `/${locale}/onboarding`
        setTargetPath(fallbackPath)
        setShowFallback(true)
        router.replace(fallbackPath)
      }
    }

    handleRouting()

    // Cleanup timeout on unmount (successful navigation)
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [router, locale, isAuthenticated, searchParams])

  // Show loading with fallback link if navigation times out
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 flex items-center justify-center">
      <div className="text-center px-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#F2B949] mx-auto mb-4" />
        <p className="text-gray-500 text-sm mb-4">
          {hasError ? 'Redirecting...' : appTitles[locale]}
        </p>

        {/* Fallback link if navigation times out */}
        {showFallback && targetPath && (
          <div className="mt-4 space-y-2">
            <p className="text-gray-400 text-xs">
              {locale === 'ko' ? '로딩이 느린가요?' : 'Taking too long?'}
            </p>
            <a
              href={targetPath}
              className="inline-block px-4 py-2 bg-[#F2B949] text-white rounded-lg text-sm font-medium hover:bg-[#e5a93c] transition-colors"
            >
              {locale === 'ko' ? '여기를 탭하세요' : 'Tap here to continue'}
            </a>
          </div>
        )}

        {/* Debug info in debug mode */}
        {isDebugMode() && (
          <div className="mt-6 p-3 bg-black/5 rounded-lg text-left text-xs space-y-1">
            <p className="text-gray-600 font-mono font-bold">Debug: EntryRouter</p>
            <p className="text-gray-500 font-mono">Target: {targetPath || 'calculating...'}</p>
            <p className="text-gray-500 font-mono">Auth: {isAuthenticated ? 'yes' : 'no'}</p>
            <p className="text-gray-500 font-mono">Onboarding: {onboardingStatus}</p>
            <p className="text-gray-500 font-mono">Fallback: {showFallback ? 'yes' : 'no'}</p>
            <p className="text-gray-400 font-mono text-[10px] mt-2">
              Tip: Add ?reset_onboarding=1 to URL to reset intro
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
