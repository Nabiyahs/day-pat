'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { AppIcon } from '@/components/ui/app-icon'

// Dictionary for UI text (single language - English)
const dict = {
  verifying: 'Verifying reset link...',
  invalidTitle: 'Invalid or Expired Link',
  invalidDesc: 'This password reset link is invalid or has expired. Please request a new one.',
  backToLogin: 'Back to Login',
  successTitle: 'Password Updated!',
  successDesc: 'Your password has been successfully changed.',
  redirecting: 'Redirecting to your journal...',
  setNewPassword: 'Set New Password',
  setNewPasswordDesc: 'Enter your new password below',
  newPassword: 'New Password',
  confirmNewPassword: 'Confirm New Password',
  minChars: 'Minimum 6 characters',
  confirmPasswordPlaceholder: 'Confirm your password',
  updating: 'Updating password...',
  updatePassword: 'Update Password',
  cancelReturn: 'Cancel and return to login',
  errors: {
    passwordMismatch: 'Passwords do not match',
    passwordTooShort: 'Password must be at least 6 characters',
    differentPassword: 'New password must be different from your current password.',
    genericError: 'An error occurred. Please try again.',
  },
}

function ResetPasswordFormContent() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null)

  const router = useRouter()
  const supabase = createClient()

  // Check if user has a valid recovery session
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      // User should have a session from the recovery link
      if (session) {
        setIsValidSession(true)
      } else {
        setIsValidSession(false)
      }
    }

    // Listen for auth state changes (recovery link sets session)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setIsValidSession(true)
        } else if (event === 'SIGNED_IN' && session) {
          setIsValidSession(true)
        }
      }
    )

    checkSession()

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validate passwords match
    if (password !== confirmPassword) {
      setError(dict.errors.passwordMismatch)
      setLoading(false)
      return
    }

    // Validate password strength
    if (password.length < 6) {
      setError(dict.errors.passwordTooShort)
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) {
        if (error.message.includes('should be different')) {
          throw new Error(dict.errors.differentPassword)
        }
        throw error
      }

      // Success
      setSuccess(true)

      // Redirect to app after a short delay
      setTimeout(() => {
        router.push('/app')
      }, 2000)
    } catch (err) {
      console.error('[Auth] Password reset error:', err)
      setError(err instanceof Error ? err.message : dict.errors.genericError)
    } finally {
      setLoading(false)
    }
  }

  // Show loading while checking session
  if (isValidSession === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center">
              <AppIcon name="spinner" className="w-8 h-8 animate-spin text-[#F27430] mx-auto mb-4" />
              <p className="text-gray-500">{dict.verifying}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Invalid or expired link
  if (isValidSession === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center">
              <AppIcon name="alert-circle" className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-gray-800 mb-2">
                {dict.invalidTitle}
              </h1>
              <p className="text-gray-500 text-sm mb-6">
                {dict.invalidDesc}
              </p>
              <button
                onClick={() => router.push('/login')}
                className="bg-gradient-to-r from-[#F2B949] to-[#F27430] hover:from-[#EDD377] hover:to-[#F2B949] text-white font-semibold py-3 px-6 rounded-lg transition-all"
              >
                {dict.backToLogin}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center">
              <AppIcon name="check-circle" className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-gray-800 mb-2">
                {dict.successTitle}
              </h1>
              <p className="text-gray-500 text-sm mb-4">
                {dict.successDesc}
              </p>
              <p className="text-gray-400 text-xs">
                {dict.redirecting}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              {dict.setNewPassword}
            </h1>
            <p className="text-gray-500 text-sm">
              {dict.setNewPasswordDesc}
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AppIcon name="alert-circle" className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <span className="text-red-600 text-sm">{error}</span>
            </div>
          )}

          {/* Reset Password Form */}
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {dict.newPassword}
              </label>
              <div className="relative">
                <AppIcon name="lock" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={dict.minChars}
                  required
                  disabled={loading}
                  autoComplete="new-password"
                  className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none transition-all disabled:bg-gray-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <AppIcon name="eye-off" className="w-5 h-5" /> : <AppIcon name="eye" className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">{dict.minChars}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {dict.confirmNewPassword}
              </label>
              <div className="relative">
                <AppIcon name="lock" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={dict.confirmPasswordPlaceholder}
                  required
                  disabled={loading}
                  autoComplete="new-password"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none transition-all disabled:bg-gray-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !password || !confirmPassword}
              className="w-full bg-gradient-to-r from-[#F2B949] to-[#F27430] hover:from-[#EDD377] hover:to-[#F2B949] disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <AppIcon name="spinner" className="w-5 h-5 animate-spin" />
                  {dict.updating}
                </>
              ) : (
                dict.updatePassword
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/login')}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              {dict.cancelReturn}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ResetFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            <AppIcon name="spinner" className="w-8 h-8 animate-spin text-[#F27430] mx-auto mb-4" />
            <p className="text-gray-500">DayPat</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetFallback />}>
      <ResetPasswordFormContent />
    </Suspense>
  )
}
