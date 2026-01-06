'use client'

import { useState, useEffect, Suspense, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { AppIcon } from '@/components/ui/app-icon'
import { getDictionarySync, type Locale, appTitles, isValidLocale, i18n } from '@/lib/i18n'

type Props = {
  params: Promise<{ locale: string }>
}

function ResetPasswordFormContent({ locale }: { locale: Locale }) {
  const dict = getDictionarySync(locale)
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
      setError(dict.login.errors.passwordMismatch)
      setLoading(false)
      return
    }

    // Validate password strength
    if (password.length < 6) {
      setError(dict.login.errors.passwordTooShort)
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) {
        if (error.message.includes('should be different')) {
          throw new Error(locale === 'ko' ? '새 비밀번호는 현재 비밀번호와 달라야 합니다.' : 'New password must be different from your current password.')
        }
        throw error
      }

      // Success
      setSuccess(true)

      // Redirect to app after a short delay
      setTimeout(() => {
        router.push(`/${locale}/app`)
      }, 2000)
    } catch (err) {
      console.error('[Auth] Password reset error:', err)
      setError(err instanceof Error ? err.message : dict.login.errors.genericError)
    } finally {
      setLoading(false)
    }
  }

  const labels = {
    verifying: locale === 'ko' ? '재설정 링크 확인 중...' : 'Verifying reset link...',
    invalidTitle: locale === 'ko' ? '유효하지 않거나 만료된 링크' : 'Invalid or Expired Link',
    invalidDesc: locale === 'ko' ? '이 비밀번호 재설정 링크가 유효하지 않거나 만료되었습니다. 새 링크를 요청해주세요.' : 'This password reset link is invalid or has expired. Please request a new one.',
    backToLogin: locale === 'ko' ? '로그인으로 돌아가기' : 'Back to Login',
    successTitle: locale === 'ko' ? '비밀번호가 변경되었습니다!' : 'Password Updated!',
    successDesc: locale === 'ko' ? '비밀번호가 성공적으로 변경되었습니다.' : 'Your password has been successfully changed.',
    redirecting: locale === 'ko' ? '일기장으로 이동 중...' : 'Redirecting to your journal...',
    setNewPassword: locale === 'ko' ? '새 비밀번호 설정' : 'Set New Password',
    setNewPasswordDesc: locale === 'ko' ? '아래에 새 비밀번호를 입력하세요' : 'Enter your new password below',
    newPassword: locale === 'ko' ? '새 비밀번호' : 'New Password',
    confirmNewPassword: locale === 'ko' ? '새 비밀번호 확인' : 'Confirm New Password',
    minChars: locale === 'ko' ? '최소 6자 이상' : 'Minimum 6 characters',
    updating: locale === 'ko' ? '비밀번호 변경 중...' : 'Updating password...',
    updatePassword: locale === 'ko' ? '비밀번호 변경' : 'Update Password',
    cancelReturn: locale === 'ko' ? '취소하고 로그인으로 돌아가기' : 'Cancel and return to login',
  }

  // Show loading while checking session
  if (isValidSession === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center">
              <AppIcon name="spinner" className="w-8 h-8 animate-spin text-[#F27430] mx-auto mb-4" />
              <p className="text-gray-500">{labels.verifying}</p>
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
                {labels.invalidTitle}
              </h1>
              <p className="text-gray-500 text-sm mb-6">
                {labels.invalidDesc}
              </p>
              <button
                onClick={() => router.push(`/${locale}/login`)}
                className="bg-gradient-to-r from-[#F2B949] to-[#F27430] hover:from-[#EDD377] hover:to-[#F2B949] text-white font-semibold py-3 px-6 rounded-lg transition-all"
              >
                {labels.backToLogin}
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
                {labels.successTitle}
              </h1>
              <p className="text-gray-500 text-sm mb-4">
                {labels.successDesc}
              </p>
              <p className="text-gray-400 text-xs">
                {labels.redirecting}
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
              {labels.setNewPassword}
            </h1>
            <p className="text-gray-500 text-sm">
              {labels.setNewPasswordDesc}
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
                {labels.newPassword}
              </label>
              <div className="relative">
                <AppIcon name="lock" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={labels.minChars}
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
              <p className="text-xs text-gray-500 mt-1">{labels.minChars}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {labels.confirmNewPassword}
              </label>
              <div className="relative">
                <AppIcon name="lock" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={dict.login.confirmPasswordPlaceholder}
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
                  {labels.updating}
                </>
              ) : (
                labels.updatePassword
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => router.push(`/${locale}/login`)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              {labels.cancelReturn}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ResetFallback({ locale }: { locale: Locale }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            <AppIcon name="spinner" className="w-8 h-8 animate-spin text-[#F27430] mx-auto mb-4" />
            <p className="text-gray-500">{appTitles[locale]}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage({ params }: Props) {
  const { locale: localeParam } = use(params)
  const locale: Locale = isValidLocale(localeParam) ? localeParam : i18n.defaultLocale

  return (
    <Suspense fallback={<ResetFallback locale={locale} />}>
      <ResetPasswordFormContent locale={locale} />
    </Suspense>
  )
}
