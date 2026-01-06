'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase, resetSupabaseClient } from '@/lib/supabase/client'
import { AppIcon } from '@/components/ui/app-icon'
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js'
import { Header, ViewTabs, SideDrawer, BottomNav, type ViewType } from '@/components/shell'
import { MonthView } from '@/components/calendar/month-view'
import { WeekView } from '@/components/calendar/week-view'
import { DayView } from '@/components/day/day-view'
import { formatDateString } from '@/lib/utils'
import { getDictionarySync, type Locale, appTitles, isValidLocale, i18n } from '@/lib/i18n'
import { clearSessionTracking } from '@/lib/auth/session-persistence'

type Props = {
  params: Promise<{ locale: string }>
}

export default function AppPage({ params }: Props) {
  const { locale: localeParam } = use(params)
  const locale: Locale = isValidLocale(localeParam) ? localeParam : i18n.defaultLocale
  const dict = getDictionarySync(locale)

  // Trust middleware for initial auth - don't do redundant getUser() on mount
  // Middleware already redirects unauthenticated users to /login
  const [user, setUser] = useState<User | null>(null)
  const [initializing, setInitializing] = useState(true)
  const [activeView, setActiveView] = useState<ViewType>('day') // Day is the main/default view
  const [selectedDate, setSelectedDate] = useState(formatDateString(new Date()))
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [showDebug, setShowDebug] = useState(false)
  const router = useRouter()
  const supabase = useSupabase()
  const isDev = process.env.NODE_ENV === 'development'

  useEffect(() => {
    // Get initial session from existing cookies (no network call if session exists)
    // This is much faster than getUser() which always makes a network call
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      if (session?.user) {
        setUser(session.user)
      }
      // If no session, middleware should have redirected, but handle edge case
      setInitializing(false)
    })

    // Subscribe to auth state changes for real-time updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        console.log('[App] Auth state changed:', event)

        if (event === 'SIGNED_OUT') {
          setUser(null)
          router.replace(`/${locale}/login`)
        } else if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          setUser(session.user)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase, router, locale])

  const handleSelectDate = (date: string) => {
    setSelectedDate(date)
    // Switch to day view when selecting a date from month/week
    if (activeView !== 'day') {
      setActiveView('day')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    resetSupabaseClient()
    clearSessionTracking()
    router.replace(`/${locale}/login`)
  }

  // Show brief loading only during initialization
  if (initializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <AppIcon name="spinner" className="w-8 h-8 animate-spin text-[#F2B949] mx-auto mb-4" />
          <p className="text-gray-500 text-sm">{dict.app.loading}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50">
      {/* Fixed Header with View Tabs - matches reference HTML structure */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-b border-amber-100 z-50">
        <Header
          locale={locale}
          onMenuClick={() => setDrawerOpen(true)}
          onAddClick={() => {
            setSelectedDate(formatDateString(new Date()))
            setActiveView('day')
          }}
        />
        <ViewTabs
          locale={locale}
          activeView={activeView}
          onViewChange={setActiveView}
        />
      </header>

      {/* Side Drawer */}
      <SideDrawer
        locale={locale}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onLogout={handleLogout}
      />

      {/* Main Content - Day view loads first, others lazy load on tab switch */}
      <main className="pt-[140px] pb-24 px-5">
        {activeView === 'day' && (
          <DayView
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />
        )}
        {activeView === 'week' && (
          <WeekView locale={locale} onSelectDate={handleSelectDate} />
        )}
        {activeView === 'month' && (
          <MonthView locale={locale} onSelectDate={handleSelectDate} />
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav
        locale={locale}
        onAddClick={() => {
          setSelectedDate(formatDateString(new Date()))
          setActiveView('day')
        }}
      />

      {/* Debug Panel (Development only) */}
      {isDev && (
        <div className="fixed bottom-20 right-4 z-50">
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="w-10 h-10 bg-gray-800 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-700"
          >
            <AppIcon name="bug" className="w-5 h-5" />
          </button>
          {showDebug && (
            <div className="absolute bottom-12 right-0 w-72 bg-white rounded-lg shadow-xl border border-gray-200 p-4 text-xs font-mono">
              <h4 className="font-bold text-gray-800 mb-2">Session Debug</h4>
              <div className="space-y-1 text-gray-600">
                <p><span className="text-gray-400">Status:</span> {user ? '✅ Authenticated' : '❌ Not authenticated'}</p>
                <p><span className="text-gray-400">Email:</span> {user?.email || 'N/A'}</p>
                <p><span className="text-gray-400">User ID:</span> {user?.id?.slice(0, 8) || 'N/A'}...</p>
                <p><span className="text-gray-400">Provider:</span> {user?.app_metadata?.provider || 'N/A'}</p>
                <p><span className="text-gray-400">Created:</span> {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</p>
              </div>
              <button
                onClick={handleLogout}
                className="mt-3 w-full bg-red-500 text-white py-2 rounded text-xs hover:bg-red-600"
              >
                {dict.nav.signOut}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
