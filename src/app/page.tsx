import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If user is logged in, redirect to app
  // Otherwise, redirect to login
  if (user) {
    redirect('/app')
  } else {
    redirect('/login')
  }
}
