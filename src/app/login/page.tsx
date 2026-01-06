'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import { Mail, Loader2, AlertCircle, CheckCircle, Bug } from 'lucide-react'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [showDebug, setShowDebug] = useState(false)

  const searchParams = useSearchParams()

  // Check for error params from auth callback
  useEffect(() => {
    const errorParam = searchParams.get('error')
    const errorDesc = searchParams.get('error_description')

    if (errorParam) {
      let errorMessage = errorDesc || `Authentication error: ${errorParam}`

      // Provide more helpful messages for common errors
      if (errorParam === 'access_denied') {
        errorMessage = 'Access was denied. Please try again.'
      } else if (errorParam === 'code_exchange_failed') {
        errorMessage = 'Failed to complete sign in. The link may have expired. Please request a new one.'
      } else if (errorParam === 'no_code') {
        errorMessage = 'Invalid authentication link. Please request a new one.'
      }

      setError(errorMessage)
    }

    // Check for success message
    const successParam = searchParams.get('message')
    if (successParam) {
      setMessage(successParam)
    }
  }, [searchParams])

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    const supabase = createClient()
    const emailRedirectTo = `${window.location.origin}/auth/callback`

    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Auth] Sending magic link:', {
        email,
        emailRedirectTo,
        origin: window.location.origin,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      })
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo,
        },
      })

      if (error) {
        console.error('[Auth] OTP error:', error)
        throw error
      }

      // Success - show check email message
      setMessage('Check your email for the magic link to sign in!')
      setEmail('')
    } catch (err) {
      console.error('[Auth] Error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const isDev = process.env.NODE_ENV === 'development'

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Praise Journal
            </h1>
            <p className="text-gray-500 text-sm">
              Your daily praise journal with polaroid memories
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <span className="text-red-600 text-sm">{error}</span>
            </div>
          )}

          {/* Success Message */}
          {message && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-green-600 text-sm">{message}</span>
            </div>
          )}

          {/* Email Magic Link Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={loading}
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-400 focus:border-transparent outline-none transition-all disabled:bg-gray-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Magic Link'
              )}
            </button>
          </form>

          <p className="text-center text-gray-500 text-xs mt-6">
            We&apos;ll send you a magic link to sign in instantly.
            <br />
            No password needed!
          </p>

          {/* Debug Panel (Development only) */}
          {isDev && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600"
              >
                <Bug className="w-4 h-4" />
                {showDebug ? 'Hide' : 'Show'} Debug Info
              </button>

              {showDebug && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg text-xs font-mono space-y-1">
                  <p>
                    <span className="text-gray-500">Origin:</span>{' '}
                    {typeof window !== 'undefined' ? window.location.origin : 'N/A'}
                  </p>
                  <p>
                    <span className="text-gray-500">Redirect:</span>{' '}
                    {typeof window !== 'undefined'
                      ? `${window.location.origin}/auth/callback`
                      : 'N/A'}
                  </p>
                  <p>
                    <span className="text-gray-500">Supabase URL:</span>{' '}
                    {process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET'}
                  </p>
                  <p>
                    <span className="text-gray-500">Anon Key:</span>{' '}
                    {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '***SET***' : 'NOT SET'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function LoginFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-pink-500 mx-auto mb-4" />
            <p className="text-gray-500">Loading...</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  )
}
