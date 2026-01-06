import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { EntryRouter } from '@/components/entry/entry-router'
import { isValidLocale, i18n, type Locale, appTitles } from '@/lib/i18n/config'
import { AppIcon } from '@/components/ui/app-icon'

type Props = {
  params: Promise<{ locale: string }>
}

function LoadingFallback({ locale }: { locale: Locale }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 flex items-center justify-center">
      <div className="text-center">
        <AppIcon name="spinner" className="w-8 h-8 animate-spin text-[#F2B949] mx-auto mb-4" />
        <p className="text-gray-500 text-sm">{appTitles[locale]}</p>
      </div>
    </div>
  )
}

/**
 * Root page routing logic:
 *
 * The intro/onboarding flow should ALWAYS be shown first for new sessions.
 *
 * Flow:
 * 1. EntryRouter (client component) checks localStorage for onboarding_completed
 * 2. For new users (no localStorage value): → Show onboarding
 * 3. For returning users who completed onboarding:
 *    - If logged in → go to app
 *    - If not logged in → go to login
 *
 * Debug/Test params:
 * - ?reset_onboarding=1 - Reset intro state to test onboarding flow
 * - ?debug=1 - Show debug panel
 */
export default async function RootPage({ params }: Props) {
  const { locale: localeParam } = await params
  const locale: Locale = isValidLocale(localeParam) ? localeParam : i18n.defaultLocale
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // For authenticated users, we still use EntryRouter to check onboarding status
  // since onboarding_completed is in localStorage (client-side only)
  // EntryRouter will route to /app if onboarding is completed, or /onboarding if not
  return (
    <Suspense fallback={<LoadingFallback locale={locale} />}>
      <EntryRouter locale={locale} isAuthenticated={!!user} />
    </Suspense>
  )
}
