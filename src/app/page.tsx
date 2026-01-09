'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { IntroModal } from '@/components/modals/intro-modal'
import { AppIcon } from '@/components/ui/app-icon'

/**
 * Root page - Onboarding for logged-out users
 *
 * - Logged out: Shows IntroModal (onboarding) automatically
 * - Logged in: Redirects to /app
 * - After onboarding: Redirects to /login
 */
export default function OnboardingPage() {
  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient()
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error) {
          // Auth error - treat as logged out, show onboarding
          console.warn('[OnboardingPage] Auth check error:', error.message)
          setShowOnboarding(true)
          setLoading(false)
          return
        }

        if (user) {
          // Logged in - redirect to main app
          router.replace('/app')
        } else {
          // Logged out - show onboarding
          setShowOnboarding(true)
          setLoading(false)
        }
      } catch (err) {
        // Unexpected error - fail gracefully, show onboarding
        console.error('[OnboardingPage] Unexpected error during auth check:', err)
        setShowOnboarding(true)
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  const handleOnboardingClose = () => {
    // After viewing onboarding, go to login
    try {
      router.push('/login')
    } catch (err) {
      // Fallback to window.location if router fails
      console.error('[OnboardingPage] Router navigation failed:', err)
      try {
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
      } catch (windowErr) {
        console.error('[OnboardingPage] Window navigation also failed:', windowErr)
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <AppIcon name="spinner" className="w-8 h-8 animate-spin text-[#F27430] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[#F27430]" style={{ fontFamily: 'Caveat, cursive' }}>
            DayPat
          </h1>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50">
      {/* IntroModal shows automatically for onboarding */}
      <IntroModal isOpen={showOnboarding} onClose={handleOnboardingClose} />
    </div>
  )
}
