'use client'

import { useEffect } from 'react'
import { AppIcon } from '@/components/ui/app-icon'

/**
 * Global Error Boundary for App Router
 *
 * This catches all unhandled errors in the app and displays
 * a user-friendly error page instead of "Application error: a client-side exception"
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error details to console for debugging
    console.error('[GlobalError] Caught error:', {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
    })
  }, [error])

  const handleReset = () => {
    try {
      reset()
    } catch {
      // If reset fails, navigate to home
      window.location.href = '/'
    }
  }

  const handleGoHome = () => {
    try {
      window.location.href = '/'
    } catch {
      // Fallback: reload the page
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
        </div>

        {/* Error Card */}
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-8">
          <div className="text-center">
            {/* Error Icon */}
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AppIcon name="alert-triangle" className="w-8 h-8 text-red-500" />
            </div>

            <h2 className="text-xl font-bold text-gray-800 mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-600 text-sm mb-6">
              We&apos;re sorry, an unexpected error occurred. Please try again.
            </p>

            {/* Error Details (for debugging) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-left">
                <p className="text-red-600 text-xs font-mono break-all">
                  {error.message}
                </p>
                {error.stack && (
                  <pre className="text-red-500 text-[10px] font-mono mt-2 overflow-x-auto max-h-32 overflow-y-auto">
                    {error.stack}
                  </pre>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleReset}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <AppIcon name="refresh-cw" className="w-5 h-5" />
                Try Again
              </button>
              <button
                onClick={handleGoHome}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <AppIcon name="home" className="w-5 h-5" />
                Go to Home
              </button>
            </div>
          </div>
        </div>

        {/* Footer hint */}
        <p className="text-center text-gray-500 text-xs mt-6">
          If this problem persists, please try clearing your browser cache.
        </p>
      </div>
    </div>
  )
}
