import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { i18n, isValidLocale, type Locale } from '@/lib/i18n/config'

const LOCALE_COOKIE = 'locale'

function getLocaleFromRequest(request: NextRequest): Locale {
  // 1. Check cookie first
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value
  if (cookieLocale && isValidLocale(cookieLocale)) {
    return cookieLocale
  }

  // 2. Check Accept-Language header
  const acceptLanguage = request.headers.get('Accept-Language')
  if (acceptLanguage) {
    const preferredLanguages = acceptLanguage.split(',').map((lang) => {
      const [code] = lang.trim().split(';')
      return code.split('-')[0].toLowerCase()
    })

    for (const lang of preferredLanguages) {
      if (isValidLocale(lang)) {
        return lang
      }
    }
  }

  // 3. Default to Korean
  return i18n.defaultLocale
}

function getPathnameLocale(pathname: string): Locale | null {
  const segments = pathname.split('/')
  const potentialLocale = segments[1]

  if (potentialLocale && isValidLocale(potentialLocale)) {
    return potentialLocale
  }
  return null
}

function stripLocaleFromPathname(pathname: string, locale: Locale): string {
  const prefix = `/${locale}`
  if (pathname.startsWith(prefix)) {
    const stripped = pathname.slice(prefix.length)
    return stripped || '/'
  }
  return pathname
}

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

  // Get locale from URL or detect it
  let pathnameLocale = getPathnameLocale(pathname)
  const detectedLocale = getLocaleFromRequest(request)

  // If no locale in URL, redirect to detected locale
  if (!pathnameLocale) {
    const url = request.nextUrl.clone()
    url.pathname = `/${detectedLocale}${pathname === '/' ? '' : pathname}`

    const response = NextResponse.redirect(url)
    // Set locale cookie for 1 year
    response.cookies.set(LOCALE_COOKIE, detectedLocale, {
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    })
    return response
  }

  // At this point we have a locale in the URL
  const locale = pathnameLocale
  const pathnameWithoutLocale = stripLocaleFromPathname(pathname, locale)

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

  // Protected routes - redirect to login if not authenticated
  if (!user && pathnameWithoutLocale.startsWith('/app')) {
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}/login`
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from login page
  if (user && pathnameWithoutLocale === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}/app`
    return NextResponse.redirect(url)
  }

  // Update locale cookie if it's different
  const currentCookieLocale = request.cookies.get(LOCALE_COOKIE)?.value
  if (currentCookieLocale !== locale) {
    response.cookies.set(LOCALE_COOKIE, locale, {
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    })
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
