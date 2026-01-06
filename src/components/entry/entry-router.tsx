'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { type Locale, appTitles } from '@/lib/i18n/config'
import { shouldSignOutOnNewSession, clearSessionTracking } from '@/lib/auth/session-persistence'
import { createClient } from '@/lib/supabase/client'

const ONBOARDING_KEY = 'onboarding_completed'

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
 * Also handles "Keep me logged in" session management.
 */
export function EntryRouter({ locale, isAuthenticated }: EntryRouterProps) {
  const router = useRouter()
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const handleRouting = async () => {
      try {
        // Safely check localStorage
        let completed = false
        try {
          completed = localStorage.getItem(ONBOARDING_KEY) === 'true'
        } catch {
          // localStorage not available, treat as new user
          completed = false
        }

        // Check if we should sign out due to "remember me" being off
        if (isAuthenticated) {
          try {
            if (shouldSignOutOnNewSession()) {
              const supabase = createClient()
              await supabase.auth.signOut()
              clearSessionTracking()
              // After sign out, proceed as unauthenticated
              if (completed) {
                router.replace(`/${locale}/login`)
              } else {
                router.replace(`/${locale}/onboarding`)
              }
              return
            }
          } catch {
            // If session check fails, continue with normal flow
          }
        }

        if (!completed) {
          // First time user - show onboarding
          router.replace(`/${locale}/onboarding`)
        } else if (isAuthenticated) {
          // Completed onboarding and logged in - go to app
          router.replace(`/${locale}/app`)
        } else {
          // Completed onboarding but not logged in - go to login
          router.replace(`/${locale}/login`)
        }
      } catch (error) {
        console.error('[EntryRouter] Routing error:', error)
        setHasError(true)
        // Fallback: go to onboarding on any error
        router.replace(`/${locale}/onboarding`)
      }
    }

    handleRouting()
  }, [router, locale, isAuthenticated])

  // Show loading while checking
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#F2B949] mx-auto mb-4" />
        <p className="text-gray-500 text-sm">
          {hasError ? 'Redirecting...' : appTitles[locale]}
        </p>
      </div>
    </div>
  )
}
