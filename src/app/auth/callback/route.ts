import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  const type = searchParams.get('type') // signup, recovery, etc.
  const next = searchParams.get('next') ?? '/app'

  // Handle auth errors
  if (error) {
    console.error('[Auth Callback] Auth error:', error, errorDescription)
    const errorUrl = new URL('/login', origin)
    errorUrl.searchParams.set('error', error)
    if (errorDescription) {
      errorUrl.searchParams.set('error_description', errorDescription)
    }
    return NextResponse.redirect(errorUrl)
  }

  // Exchange code for session
  if (code) {
    try {
      const supabase = await createClient()
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error('[Auth Callback] Code exchange error:', exchangeError)
        const errorUrl = new URL('/login', origin)
        errorUrl.searchParams.set('error', 'code_exchange_failed')
        errorUrl.searchParams.set('error_description', exchangeError.message)
        return NextResponse.redirect(errorUrl)
      }

      // Handle different auth types
      if (type === 'recovery') {
        // Password recovery - redirect to reset page
        console.log('[Auth Callback] Password recovery, redirecting to /auth/reset')
        return NextResponse.redirect(`${origin}/auth/reset`)
      }

      if (type === 'signup') {
        // Email confirmation after signup - redirect to login with success message
        console.log('[Auth Callback] Email confirmed, redirecting to login')
        const loginUrl = new URL('/login', origin)
        loginUrl.searchParams.set('message', 'Email confirmed! You can now sign in.')
        return NextResponse.redirect(loginUrl)
      }

      // Default: redirect to app
      console.log('[Auth Callback] Success, redirecting to:', next)
      return NextResponse.redirect(`${origin}${next}`)
    } catch (err) {
      console.error('[Auth Callback] Unexpected error:', err)
      const errorUrl = new URL('/login', origin)
      errorUrl.searchParams.set('error', 'unexpected_error')
      return NextResponse.redirect(errorUrl)
    }
  }

  // No code provided
  console.error('[Auth Callback] No code provided')
  const errorUrl = new URL('/login', origin)
  errorUrl.searchParams.set('error', 'no_code')
  return NextResponse.redirect(errorUrl)
}
