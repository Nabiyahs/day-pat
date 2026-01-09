import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Middleware for authentication only.
 * NO locale handling - this is a single-language app.
 *
 * Routes:
 * - /app/* → Protected (requires auth)
 * - /login → Public (redirects to /app if authenticated)
 * - / → Redirects based on auth status
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // Files with extensions
  ) {
    return NextResponse.next()
  }

  // Create Supabase client for auth checks
  let response = NextResponse.next({ request })

  // Check for required environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If env vars are missing, allow request to proceed (app will show error)
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[Middleware] Missing Supabase environment variables')
    return response
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data?.user ?? null
  } catch (err) {
    // If auth check fails, allow request to proceed
    console.warn('[Middleware] Auth check failed:', err)
    return response
  }

  // Root path - onboarding page
  // Logged-in users: redirect to /app
  // Logged-out users: allow access to onboarding page
  if (pathname === '/') {
    if (user) {
      const url = request.nextUrl.clone()
      url.pathname = '/app'
      return NextResponse.redirect(url)
    }
    // Allow logged-out users to see onboarding
    return response
  }

  // Protected routes - redirect to login if not authenticated
  if (!user && pathname.startsWith('/app')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from login page
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/app'
    return NextResponse.redirect(url)
  }

  // Block old locale routes - redirect to non-locale version
  if (pathname.startsWith('/ko') || pathname.startsWith('/en')) {
    const url = request.nextUrl.clone()
    // Strip /ko or /en prefix
    const cleanPath = pathname.replace(/^\/(ko|en)/, '') || '/'
    url.pathname = cleanPath
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
