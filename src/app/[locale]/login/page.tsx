'use client'

import { useState, useEffect, Suspense, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams, useRouter } from 'next/navigation'
import { AppIcon } from '@/components/ui/app-icon'
import { getDictionarySync, type Locale, appTitles, isValidLocale, i18n } from '@/lib/i18n'
import { getRememberMe, setRememberMe } from '@/lib/auth/session-persistence'

type AuthMode = 'login' | 'signup' | 'forgot'

type Props = {
  params: Promise<{ locale: string }>
}

const ONBOARDING_KEY = 'onboarding_completed'

function LoginFormContent({ locale }: { locale: Locale }) {
  const dict = getDictionarySync(locale)
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [showDebug, setShowDebug] = useState(false)
  const [rememberMe, setRememberMeState] = useState(true)
  const [checkingOnboarding, setCheckingOnboarding] = useState(true)

  const searchParams = useSearchParams()
  const router = useRouter()

  // Check if onboarding is completed this session - if not, redirect to onboarding
  // Uses sessionStorage so intro always shows on fresh visits (new browser session)
  useEffect(() => {
    try {
      const completed = sessionStorage.getItem(ONBOARDING_KEY) === 'true'
      if (!completed) {
        console.log('[Login] Onboarding not completed this session, redirecting to onboarding')
        router.replace(`/${locale}/onboarding`)
        return
      }
    } catch (e) {
      // sessionStorage not available, redirect to onboarding to be safe
      console.log('[Login] sessionStorage error, redirecting to onboarding')
      router.replace(`/${locale}/onboarding`)
      return
    }
    setCheckingOnboarding(false)
  }, [locale, router])

  // Load saved "remember me" preference on mount
  useEffect(() => {
    setRememberMeState(getRememberMe())
  }, [])

  // Check for error/success params from auth callback
  useEffect(() => {
    const errorParam = searchParams.get('error')
    const errorDesc = searchParams.get('error_description')

    if (errorParam) {
      let errorMessage = errorDesc || `Authentication error: ${errorParam}`

      if (errorParam === 'access_denied') {
        errorMessage = dict.login.errors.accessDenied
      } else if (errorParam === 'code_exchange_failed') {
        errorMessage = dict.login.errors.codeExchangeFailed
      } else if (errorParam === 'no_code') {
        errorMessage = dict.login.errors.invalidLink
      }

      setError(errorMessage)
    }

    const successParam = searchParams.get('message')
    if (successParam) {
      setMessage(decodeURIComponent(successParam))
    }
  }, [searchParams, dict])

  const resetForm = () => {
    setError(null)
    setMessage(null)
    setPassword('')
    setConfirmPassword('')
  }

  const handleRememberMeChange = (checked: boolean) => {
    setRememberMeState(checked)
    setRememberMe(checked)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    // Save the remember me preference before login
    setRememberMe(rememberMe)

    const supabase = createClient()

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // Provide user-friendly error messages
        if (error.message.includes('Invalid login credentials')) {
          throw new Error(dict.login.errors.invalidCredentials)
        }
        if (error.message.includes('Email not confirmed')) {
          throw new Error(dict.login.errors.emailNotConfirmed)
        }
        throw error
      }

      // Success - redirect to app
      router.push(`/${locale}/app`)
    } catch (err) {
      console.error('[Auth] Login error:', err)
      setError(err instanceof Error ? err.message : dict.login.errors.genericError)
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

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

    const supabase = createClient()
    const emailRedirectTo = `${window.location.origin}/${locale}/auth/callback`

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo,
        },
      })

      if (error) {
        // Provide user-friendly error messages
        if (error.message.includes('User already registered')) {
          throw new Error(dict.login.errors.userExists)
        }
        if (error.message.includes('Password should be')) {
          throw new Error(dict.login.errors.weakPassword)
        }
        throw error
      }

      // Success - show confirmation message
      setMessage(dict.login.success.checkEmail)
      setEmail('')
      setPassword('')
      setConfirmPassword('')
    } catch (err) {
      console.error('[Auth] Signup error:', err)
      setError(err instanceof Error ? err.message : dict.login.errors.genericError)
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    const supabase = createClient()
    const redirectTo = `${window.location.origin}/${locale}/auth/reset`

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      })

      if (error) throw error

      setMessage(dict.login.success.resetLinkSent)
      setEmail('')
    } catch (err) {
      console.error('[Auth] Reset password error:', err)
      setError(err instanceof Error ? err.message : dict.login.errors.genericError)
    } finally {
      setLoading(false)
    }
  }

  const isDev = process.env.NODE_ENV === 'development'

  // Show loading while checking onboarding status
  if (checkingOnboarding) {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              {appTitles[locale]}
            </h1>
            <p className="text-gray-500 text-sm">
              {dict.login.subtitle}
            </p>
          </div>

          {/* Tabs (only show for login/signup) */}
          {mode !== 'forgot' && (
            <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => { setMode('login'); resetForm(); }}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  mode === 'login'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {dict.login.signIn}
              </button>
              <button
                onClick={() => { setMode('signup'); resetForm(); }}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  mode === 'signup'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {dict.login.signUp}
              </button>
            </div>
          )}

          {/* Forgot Password Header */}
          {mode === 'forgot' && (
            <div className="mb-6">
              <button
                onClick={() => { setMode('login'); resetForm(); }}
                className="text-sm text-[#F27430] hover:text-[#F2B949] mb-4"
              >
                {dict.login.backToLogin}
              </button>
              <h2 className="text-lg font-semibold text-gray-800">{dict.login.resetPassword}</h2>
              <p className="text-gray-500 text-sm mt-1">
                {dict.login.resetPasswordDesc}
              </p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AppIcon name="alert-circle" className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <span className="text-red-600 text-sm">{error}</span>
            </div>
          )}

          {/* Success Message */}
          {message && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
              <AppIcon name="check-circle" className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-green-600 text-sm">{message}</span>
            </div>
          )}

          {/* Login Form */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {dict.login.email}
                </label>
                <div className="relative">
                  <AppIcon name="mail" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={dict.login.emailPlaceholder}
                    required
                    disabled={loading}
                    autoComplete="email"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none transition-all disabled:bg-gray-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {dict.login.password}
                </label>
                <div className="relative">
                  <AppIcon name="lock" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={dict.login.passwordPlaceholder}
                    required
                    disabled={loading}
                    autoComplete="current-password"
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
              </div>

              {/* Keep me logged in + Forgot password row */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => handleRememberMeChange(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-[#F27430] focus:ring-amber-400 cursor-pointer"
                  />
                  <span className="text-sm text-gray-600">{dict.login.keepLoggedIn}</span>
                </label>
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); resetForm(); }}
                  className="text-sm text-[#F27430] hover:text-[#F2B949]"
                >
                  {dict.login.forgotPassword}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full bg-gradient-to-r from-[#F2B949] to-[#F27430] hover:from-[#EDD377] hover:to-[#F2B949] disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <AppIcon name="spinner" className="w-5 h-5 animate-spin" />
                    {dict.login.signingIn}
                  </>
                ) : (
                  dict.login.signIn
                )}
              </button>
            </form>
          )}

          {/* Signup Form */}
          {mode === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {dict.login.email}
                </label>
                <div className="relative">
                  <AppIcon name="mail" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={dict.login.emailPlaceholder}
                    required
                    disabled={loading}
                    autoComplete="email"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none transition-all disabled:bg-gray-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {dict.login.password}
                </label>
                <div className="relative">
                  <AppIcon name="lock" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={dict.login.passwordHint}
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
                <p className="text-xs text-gray-500 mt-1">{dict.login.passwordHint}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {dict.login.confirmPassword}
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
                disabled={loading || !email || !password || !confirmPassword}
                className="w-full bg-gradient-to-r from-[#F2B949] to-[#F27430] hover:from-[#EDD377] hover:to-[#F2B949] disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <AppIcon name="spinner" className="w-5 h-5 animate-spin" />
                    {dict.login.creatingAccount}
                  </>
                ) : (
                  dict.login.createAccount
                )}
              </button>

              <p className="text-center text-gray-500 text-xs">
                {dict.login.termsAgreement}
              </p>
            </form>
          )}

          {/* Forgot Password Form */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {dict.login.email}
                </label>
                <div className="relative">
                  <AppIcon name="mail" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={dict.login.emailPlaceholder}
                    required
                    disabled={loading}
                    autoComplete="email"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none transition-all disabled:bg-gray-50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full bg-gradient-to-r from-[#F2B949] to-[#F27430] hover:from-[#EDD377] hover:to-[#F2B949] disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <AppIcon name="spinner" className="w-5 h-5 animate-spin" />
                    {dict.login.sending}
                  </>
                ) : (
                  dict.login.sendResetLink
                )}
              </button>
            </form>
          )}

          {/* Debug Panel (Development only) */}
          {isDev && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600"
              >
                <AppIcon name="bug" className="w-4 h-4" />
                {showDebug ? 'Hide' : 'Show'} Debug Info
              </button>

              {showDebug && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg text-xs font-mono space-y-1">
                  <p>
                    <span className="text-gray-500">Origin:</span>{' '}
                    {typeof window !== 'undefined' ? window.location.origin : 'N/A'}
                  </p>
                  <p>
                    <span className="text-gray-500">Callback:</span>{' '}
                    {typeof window !== 'undefined'
                      ? `${window.location.origin}/${locale}/auth/callback`
                      : 'N/A'}
                  </p>
                  <p>
                    <span className="text-gray-500">Reset URL:</span>{' '}
                    {typeof window !== 'undefined'
                      ? `${window.location.origin}/${locale}/auth/reset`
                      : 'N/A'}
                  </p>
                  <p>
                    <span className="text-gray-500">Supabase URL:</span>{' '}
                    {process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET'}
                  </p>
                  <p>
                    <span className="text-gray-500">Remember Me:</span>{' '}
                    {rememberMe ? 'ON' : 'OFF'}
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

function LoginFallback({ locale }: { locale: Locale }) {
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

export default function LoginPage({ params }: Props) {
  const { locale: localeParam } = use(params)
  const locale: Locale = isValidLocale(localeParam) ? localeParam : i18n.defaultLocale

  return (
    <Suspense fallback={<LoginFallback locale={locale} />}>
      <LoginFormContent locale={locale} />
    </Suspense>
  )
}
