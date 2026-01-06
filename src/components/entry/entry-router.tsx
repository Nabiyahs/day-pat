'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { type Locale, appTitles } from '@/lib/i18n/config'

const ONBOARDING_KEY = 'onboarding_completed'

interface EntryRouterProps {
  locale: Locale
}

/**
 * Client-side router for unauthenticated users.
 * Checks if onboarding is completed and routes accordingly.
 */
export function EntryRouter({ locale }: EntryRouterProps) {
  const router = useRouter()

  useEffect(() => {
    // Check if onboarding has been completed
    const completed = localStorage.getItem(ONBOARDING_KEY)

    if (completed === 'true') {
      // Already completed onboarding, go to login
      router.replace(`/${locale}/login`)
    } else {
      // First time user, show onboarding
      router.replace(`/${locale}/onboarding`)
    }
  }, [router, locale])

  // Show loading while checking
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#F2B949] mx-auto mb-4" />
        <p className="text-gray-500 text-sm">{appTitles[locale]}</p>
      </div>
    </div>
  )
}
