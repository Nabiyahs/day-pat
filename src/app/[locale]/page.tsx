import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EntryRouter } from '@/components/entry/entry-router'
import { isValidLocale, i18n, type Locale } from '@/lib/i18n/config'

type Props = {
  params: Promise<{ locale: string }>
}

/**
 * Root page routing logic:
 * 1. If user has valid session → redirect to /[locale]/app (Daily view)
 * 2. If not authenticated → show EntryRouter (client component)
 *    - EntryRouter checks localStorage for onboarding_completed
 *    - If completed → redirect to /[locale]/login
 *    - If not completed → redirect to /[locale]/onboarding
 */
export default async function RootPage({ params }: Props) {
  const { locale: localeParam } = await params
  const locale: Locale = isValidLocale(localeParam) ? localeParam : i18n.defaultLocale
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If user is authenticated, redirect directly to app
  if (user) {
    redirect(`/${locale}/app`)
  }

  // For unauthenticated users, use client-side EntryRouter
  // to check onboarding status (stored in localStorage)
  return <EntryRouter locale={locale} />
}
