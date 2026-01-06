'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

const ONBOARDING_KEY = 'onboarding_completed'

/**
 * Client-side router for unauthenticated users.
 * Checks if onboarding is completed and routes accordingly.
 */
export function EntryRouter() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Check if onboarding has been completed
    const completed = localStorage.getItem(ONBOARDING_KEY)

    if (completed === 'true') {
      // Already completed onboarding, go to login
      router.replace('/login')
    } else {
      // First time user, show onboarding
      router.replace('/onboarding')
    }
  }, [router])

  // Show loading while checking
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500 mx-auto mb-4" />
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    </div>
  )
}
