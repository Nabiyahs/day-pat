'use client'

import { useEffect } from 'react'
import { AppIcon } from '@/components/ui/app-icon'

/**
 * Login Page Error Boundary
 *
 * Catches errors specific to the login page and provides
 * a user-friendly error message with retry options.
 */
export default function LoginError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error details for debugging
    console.error('[LoginError] Caught error:', {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
    })
  }, [error])

  const handleRetry = () => {
    try {
      reset()
    } catch {
      // If reset fails, reload the page
      window.location.reload()
    }
  }

  const handleGoBack = () => {
    try {
      window.location.href = '/'
    } catch {
      window.location.reload()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 flex flex-col items-center justify-center px-5 py-8">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-[#F27430] mb-3" style={{ fontFamily: 'Caveat, cursive' }}>
            DayPat
          </h1>
          <p className="text-[#F27430] text-sm">EVERY DAY DESERVES A PAT.</p>
        </div>

        {/* Error Card */}
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-8">
          <div className="text-center">
            {/* Error Icon */}
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AppIcon name="alert-circle" className="w-8 h-8 text-amber-600" />
            </div>

            <h2 className="text-xl font-bold text-gray-800 mb-2">
              Login Error
            </h2>
            <p className="text-gray-600 text-sm mb-6">
              There was a problem loading the login page. Please try again.
            </p>

            {/* Error Details (dev only) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg text-left">
                <p className="text-amber-700 text-xs font-mono break-all">
                  {error.message}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleRetry}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <AppIcon name="refresh-cw" className="w-5 h-5" />
                Try Again
              </button>
              <button
                onClick={handleGoBack}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-xl transition-all"
              >
                Back to Start
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
