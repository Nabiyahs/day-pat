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

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Root path - redirect based on auth status
  if (pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = user ? '/app' : '/login'
    return NextResponse.redirect(url)
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
