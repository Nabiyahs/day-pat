'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams, useRouter } from 'next/navigation'
import { AppIcon } from '@/components/ui/app-icon'
import { getRememberMe, setRememberMe } from '@/lib/auth/session-persistence'

type AuthMode = 'login' | 'signup' | 'forgot'

// Dictionary for UI text (single language - English)
const dict = {
  subtitle: 'Record your daily moments of gratitude',
  signIn: 'Sign In',
  signUp: 'Sign Up',
  email: 'Email',
  emailPlaceholder: 'your@email.com',
  password: 'Password',
  passwordPlaceholder: '••••••••',
  passwordHint: 'At least 6 characters',
  confirmPassword: 'Confirm Password',
  confirmPasswordPlaceholder: '••••••••',
  keepLoggedIn: 'Keep me logged in',
  forgotPassword: 'Forgot password?',
  backToLogin: '← Back to login',
  resetPassword: 'Reset Password',
  resetPasswordDesc: "Enter your email and we'll send you a reset link",
  signingIn: 'Signing in...',
  creatingAccount: 'Creating account...',
  createAccount: 'Create Account',
  sending: 'Sending...',
  sendResetLink: 'Send Reset Link',
  termsAgreement: 'By signing up, you agree to our Terms of Service',
  errors: {
    accessDenied: 'Access denied. Please try again.',
    codeExchangeFailed: 'Login failed. Please try again.',
    invalidLink: 'Invalid or expired link. Please try again.',
    invalidCredentials: 'Invalid email or password',
    emailNotConfirmed: 'Please verify your email first',
    passwordMismatch: 'Passwords do not match',
    passwordTooShort: 'Password must be at least 6 characters',
    userExists: 'An account with this email already exists',
    weakPassword: 'Please use a stronger password',
    genericError: 'An error occurred. Please try again.',
  },
  success: {
    checkEmail: 'Check your email to confirm your account!',
    resetLinkSent: 'Reset link sent! Check your email.',
  },
}

function LoginFormContent() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [showDebug, setShowDebug] = useState(false)
  const [rememberMe, setRememberMeState] = useState(true)

  const searchParams = useSearchParams()
  const router = useRouter()

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
        errorMessage = dict.errors.accessDenied
      } else if (errorParam === 'code_exchange_failed') {
        errorMessage = dict.errors.codeExchangeFailed
      } else if (errorParam === 'no_code') {
        errorMessage = dict.errors.invalidLink
      }

      setError(errorMessage)
    }

    const successParam = searchParams.get('message')
    if (successParam) {
      setMessage(decodeURIComponent(successParam))
    }
  }, [searchParams])

  const resetForm = () => {
    setError(null)
    setMessage(null)
    setDisplayName('')
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
          throw new Error(dict.errors.invalidCredentials)
        }
        if (error.message.includes('Email not confirmed')) {
          throw new Error(dict.errors.emailNotConfirmed)
        }
        throw error
      }

      // Success - redirect to app
      router.push('/app')
    } catch (err) {
      console.error('[Auth] Login error:', err)
      setError(err instanceof Error ? err.message : dict.errors.genericError)
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

    const supabase = createClient()
    const emailRedirectTo = `${window.location.origin}/auth/callback`

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo,
          data: {
            display_name: displayName.trim() || null,
          },
        },
      })

      if (error) {
        // Provide user-friendly error messages
        if (error.message.includes('User already registered')) {
          throw new Error(dict.errors.userExists)
        }
        if (error.message.includes('Password should be')) {
          throw new Error(dict.errors.weakPassword)
        }
        throw error
      }

      // Success - show confirmation message
      setMessage(dict.success.checkEmail)
      setDisplayName('')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
    } catch (err) {
      console.error('[Auth] Signup error:', err)
      setError(err instanceof Error ? err.message : dict.errors.genericError)
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
    const redirectTo = `${window.location.origin}/auth/reset`

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      })

      if (error) throw error

      setMessage(dict.success.resetLinkSent)
      setEmail('')
    } catch (err) {
      console.error('[Auth] Reset password error:', err)
      setError(err instanceof Error ? err.message : dict.errors.genericError)
    } finally {
      setLoading(false)
    }
  }

  // Kakao OAuth login
  const handleKakaoLogin = async () => {
    setLoading(true)
    setError(null)
    setMessage(null)

    const supabase = createClient()
    const redirectTo = `${window.location.origin}/auth/callback`

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo,
        },
      })

      if (error) throw error
      // Redirect happens automatically
    } catch (err) {
      console.error('[Auth] Kakao login error:', err)
      setError(err instanceof Error ? err.message : dict.errors.genericError)
      setLoading(false)
    }
  }

  // Google OAuth login
  const handleGoogleLogin = async () => {
    setLoading(true)
    setError(null)
    setMessage(null)

    const supabase = createClient()
    const redirectTo = `${window.location.origin}/auth/callback`

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) throw error
      // Redirect happens automatically
    } catch (err) {
      console.error('[Auth] Google login error:', err)
      setError(err instanceof Error ? err.message : dict.errors.genericError)
      setLoading(false)
    }
  }

  const isDev = process.env.NODE_ENV === 'development'

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 flex flex-col items-center justify-center px-5 py-8">
      <div className="w-full max-w-sm">
        {/* Header - outside card */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-3" style={{ fontFamily: 'Caveat, cursive' }}>DayPat</h1>
          <p className="text-gray-600 text-sm">EVERYDAY DESERVES A PAT.</p>
        </div>

        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-8">

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
                {dict.signIn}
              </button>
              <button
                onClick={() => { setMode('signup'); resetForm(); }}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  mode === 'signup'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {dict.signUp}
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
                {dict.backToLogin}
              </button>
              <h2 className="text-lg font-semibold text-gray-800">{dict.resetPassword}</h2>
              <p className="text-gray-500 text-sm mt-1">{dict.resetPasswordDesc}</p>
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
                  {dict.email}
                </label>
                <div className="relative">
                  <AppIcon name="mail" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={dict.emailPlaceholder}
                    required
                    disabled={loading}
                    autoComplete="email"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none transition-all disabled:bg-gray-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {dict.password}
                </label>
                <div className="relative">
                  <AppIcon name="lock" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={dict.passwordPlaceholder}
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
                  <span className="text-sm text-gray-600">{dict.keepLoggedIn}</span>
                </label>
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); resetForm(); }}
                  className="text-sm text-[#F27430] hover:text-[#F2B949]"
                >
                  {dict.forgotPassword}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <AppIcon name="spinner" className="w-5 h-5 animate-spin" />
                    {dict.signingIn}
                  </>
                ) : (
                  dict.signIn
                )}
              </button>

              {/* Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white/80 text-gray-500">or</span>
                </div>
              </div>

              {/* Social Login Buttons - Horizontal */}
              <div className="flex gap-3">
                {/* Kakao Login Button */}
                <button
                  type="button"
                  onClick={handleKakaoLogin}
                  disabled={loading}
                  aria-label="Continue with Kakao"
                  className="flex-1 bg-[#FEE500] hover:bg-[#FDD800] disabled:opacity-50 text-[#000000]/85 font-medium py-2.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 text-sm"
                >
                  <svg width="16" height="16" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
                    <path d="M128 36C70.562 36 24 72.713 24 118c0 29.279 19.466 54.97 48.748 69.477-1.593 5.494-10.237 35.344-10.581 37.689 0 0-.207 1.762.934 2.434s2.483.15 2.483.15c3.272-.457 37.943-24.811 43.944-29.03 5.995.849 12.168 1.28 18.472 1.28 57.438 0 104-36.712 104-82 0-45.287-46.562-82-104-82z" fill="#000000" fillOpacity="0.9"/>
                  </svg>
                  Kakao
                </button>

                {/* Google Login Button */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  aria-label="Continue with Google"
                  className="flex-1 bg-white hover:bg-gray-50 disabled:opacity-50 text-gray-700 font-medium py-2.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 text-sm border border-gray-300"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Google
                </button>
              </div>
            </form>
          )}

          {/* Signup Form */}
          {mode === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Name
                </label>
                <div className="relative">
                  <AppIcon name="user" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your name"
                    disabled={loading}
                    autoComplete="name"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none transition-all disabled:bg-gray-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {dict.email}
                </label>
                <div className="relative">
                  <AppIcon name="mail" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={dict.emailPlaceholder}
                    required
                    disabled={loading}
                    autoComplete="email"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none transition-all disabled:bg-gray-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {dict.password}
                </label>
                <div className="relative">
                  <AppIcon name="lock" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={dict.passwordHint}
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
                <p className="text-xs text-gray-500 mt-1">{dict.passwordHint}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {dict.confirmPassword}
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
                disabled={loading || !email || !password || !confirmPassword}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <AppIcon name="spinner" className="w-5 h-5 animate-spin" />
                    {dict.creatingAccount}
                  </>
                ) : (
                  dict.createAccount
                )}
              </button>

              <p className="text-center text-gray-500 text-xs">{dict.termsAgreement}</p>
            </form>
          )}

          {/* Forgot Password Form */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {dict.email}
                </label>
                <div className="relative">
                  <AppIcon name="mail" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={dict.emailPlaceholder}
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
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <AppIcon name="spinner" className="w-5 h-5 animate-spin" />
                    {dict.sending}
                  </>
                ) : (
                  dict.sendResetLink
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
                      ? `${window.location.origin}/auth/callback`
                      : 'N/A'}
                  </p>
                  <p>
                    <span className="text-gray-500">Reset URL:</span>{' '}
                    {typeof window !== 'undefined'
                      ? `${window.location.origin}/auth/reset`
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

function LoginFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 flex flex-col items-center justify-center px-5 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-3" style={{ fontFamily: 'Caveat, cursive' }}>DayPat</h1>
          <p className="text-gray-600 text-sm">EVERYDAY DESERVES A PAT.</p>
        </div>
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-8">
          <div className="text-center">
            <AppIcon name="spinner" className="w-8 h-8 animate-spin text-orange-500 mx-auto" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginFormContent />
    </Suspense>
  )
}
