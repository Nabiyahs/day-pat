import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EntryRouter } from '@/components/entry/entry-router'

/**
 * Root page routing logic:
 * 1. If user has valid session → redirect to /app (Daily view)
 * 2. If not authenticated → show EntryRouter (client component)
 *    - EntryRouter checks localStorage for onboarding_completed
 *    - If completed → redirect to /login
 *    - If not completed → redirect to /onboarding
 */
export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If user is authenticated, redirect directly to app
  if (user) {
    redirect('/app')
  }

  // For unauthenticated users, use client-side EntryRouter
  // to check onboarding status (stored in localStorage)
  return <EntryRouter />
}
