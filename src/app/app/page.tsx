'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase, resetSupabaseClient } from '@/lib/supabase/client'
import { AppIcon } from '@/components/ui/app-icon'
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js'
import { Header, ViewTabs, BottomNav, type ViewType } from '@/components/shell'
import { IntroModal, FavoritesModal, StreakModal, ProfileModal, ExportModal, GuideModal, DayViewModal } from '@/components/modals'
import { MonthView } from '@/components/calendar/month-view'
import { WeekView } from '@/components/calendar/week-view'
import { DayView } from '@/components/day/day-view'
import { formatDateString } from '@/lib/utils'
import { computeStreakFromEntries } from '@/lib/streak'
import { clearSessionTracking } from '@/lib/auth/session-persistence'
import { clearSignedUrlCache } from '@/lib/image-upload'
import { startOfWeek } from 'date-fns'

export default function AppPage() {
  const [user, setUser] = useState<User | null>(null)
  const [initializing, setInitializing] = useState(true)
  const [activeView, setActiveView] = useState<ViewType>('day')
  const [selectedDate, setSelectedDate] = useState(() => formatDateString(new Date()))

  // Week and Month navigation state (for export)
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [currentMonth, setCurrentMonth] = useState(() => new Date())

  // Modal states (matches main.html modal structure)
  const [introOpen, setIntroOpen] = useState(false)  // Onboarding intro modal
  const [guideOpen, setGuideOpen] = useState(false)  // Guide modal (from bottom nav compass icon)
  const [favoritesOpen, setFavoritesOpen] = useState(false)
  const [streakOpen, setStreakOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [dayViewModalOpen, setDayViewModalOpen] = useState(false)  // Day View modal from Week/Month
  const [dayViewModalDate, setDayViewModalDate] = useState<string>('')  // Selected date for modal

  // Stats for ProfileModal
  const [totalEntries, setTotalEntries] = useState(0)
  const [currentStreak, setCurrentStreak] = useState(0)
  const [totalFavorites, setTotalFavorites] = useState(0)

  // Favorites data for FavoritesModal
  const [favorites, setFavorites] = useState<Array<{
    id: string
    date: string
    caption: string
    photoUrl: string
  }>>([])

  const [showDebug, setShowDebug] = useState(false)
  const router = useRouter()
  const supabase = useSupabase()
  const isDev = process.env.NODE_ENV === 'development'

  // Fetch favorites for FavoritesModal
  const fetchFavorites = async () => {
    const { data: entries } = await supabase
      .from('entries')
      .select('id, entry_date, praise, photo_path')
      .eq('is_liked', true)
      .order('entry_date', { ascending: false })

    if (entries && entries.length > 0) {
      // Get signed URLs for all photos
      const favoritesWithUrls = await Promise.all(
        entries.map(async (entry: { id: string; entry_date: string; praise: string | null; photo_path: string | null }) => {
          let photoUrl = ''
          if (entry.photo_path) {
            const { data } = await supabase.storage
              .from('entry-photos')
              .createSignedUrl(entry.photo_path, 3600)
            photoUrl = data?.signedUrl || ''
          }
          return {
            id: entry.id,
            date: new Date(entry.entry_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }),
            caption: entry.praise || '',
            photoUrl,
          }
        })
      )
      setFavorites(favoritesWithUrls)
    } else {
      setFavorites([])
    }
  }

  // Fetch user stats for ProfileModal
  const fetchUserStats = async () => {
    // Total entries
    const { count: entriesCount } = await supabase
      .from('entries')
      .select('*', { count: 'exact', head: true })
    setTotalEntries(entriesCount || 0)

    // Total favorites
    const { count: favoritesCount } = await supabase
      .from('entries')
      .select('*', { count: 'exact', head: true })
      .eq('is_liked', true)
    setTotalFavorites(favoritesCount || 0)

    // Calculate current streak using pure function
    // Uses string-based date comparison (YYYY-MM-DD) to avoid timezone issues
    const { data: entries } = await supabase
      .from('entries')
      .select('entry_date')

    if (entries && entries.length > 0) {
      const streak = computeStreakFromEntries(entries)
      setCurrentStreak(streak)
    } else {
      setCurrentStreak(0)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      if (session?.user) {
        setUser(session.user)
        fetchUserStats()
      }
      setInitializing(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        console.log('[App] Auth state changed:', event)

        if (event === 'SIGNED_OUT') {
          setUser(null)
          router.replace('/login')
        } else if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          setUser(session.user)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase, router])

  // Called when a day is clicked in Week/Month views - opens modal instead of switching views
  const handleSelectDate = (date: string) => {
    setDayViewModalDate(date)
    setDayViewModalOpen(true)
  }

  // Called when navigating within the Day View modal
  const handleModalDateChange = (date: string) => {
    setDayViewModalDate(date)
  }

  // Called when closing the Day View modal
  const handleDayViewModalClose = () => {
    setDayViewModalOpen(false)
  }

  const handleLogout = async () => {
    setProfileOpen(false)
    await supabase.auth.signOut()
    resetSupabaseClient()
    clearSessionTracking()
    clearSignedUrlCache() // Clear cached signed URLs on logout
    router.replace('/login')
  }

  if (initializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <AppIcon name="spinner" className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50">
      {/* Fixed Header with View Tabs - matches main.html exactly */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-b border-amber-100 z-50">
        <Header />
        <ViewTabs activeView={activeView} onViewChange={setActiveView} />
      </header>

      {/* Main Content - adjusted padding for compact header and taller bottom nav */}
      <main className="pt-[110px] pb-28 px-5">
        {activeView === 'day' && (
          <DayView
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />
        )}
        {activeView === 'week' && (
          <WeekView
            onSelectDate={handleSelectDate}
            currentWeekStart={currentWeekStart}
            onWeekChange={setCurrentWeekStart}
          />
        )}
        {activeView === 'month' && (
          <MonthView
            onSelectDate={handleSelectDate}
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
          />
        )}
      </main>

      {/* Bottom Navigation - opens modals, not pages */}
      <BottomNav
        onGuideClick={() => setGuideOpen(true)}  // Opens GuideModal (separate from IntroModal)
        onFavoritesClick={() => {
          fetchFavorites()
          setFavoritesOpen(true)
        }}
        onAddClick={() => {
          setSelectedDate(formatDateString(new Date()))
          setActiveView('day')
        }}
        onStreakClick={() => setStreakOpen(true)}
        onProfileClick={() => setProfileOpen(true)}
      />

      {/* Modals - match main.html modal structure */}
      {/* IntroModal is for onboarding (shown to new users) */}
      <IntroModal
        isOpen={introOpen}
        onClose={() => setIntroOpen(false)}
      />
      {/* GuideModal is for the compass/info icon in bottom nav (fullscreen swipeable) */}
      <GuideModal
        isOpen={guideOpen}
        onClose={() => setGuideOpen(false)}
      />
      <FavoritesModal
        isOpen={favoritesOpen}
        onClose={() => setFavoritesOpen(false)}
        favorites={favorites}
      />
      <StreakModal
        isOpen={streakOpen}
        onClose={() => setStreakOpen(false)}
        currentStreak={currentStreak}
        longestStreak={currentStreak}
        totalEntries={totalEntries}
      />
      <ProfileModal
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        onLogout={handleLogout}
        onMyProfile={() => {
          setProfileOpen(false)
          router.push('/app/profile')
        }}
        onExportPdf={() => {
          setProfileOpen(false)
          setExportOpen(true)
        }}
        userName={user?.user_metadata?.display_name}
        userEmail={user?.email}
        totalEntries={totalEntries}
        currentStreak={currentStreak}
        totalFavorites={totalFavorites}
      />
      <ExportModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        activeView={activeView}
        selectedDate={selectedDate}
      />
      <DayViewModal
        isOpen={dayViewModalOpen}
        onClose={handleDayViewModalClose}
        selectedDate={dayViewModalDate}
        onDateChange={handleModalDateChange}
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
                <p><span className="text-gray-400">Status:</span> {user ? 'Authenticated' : 'Not authenticated'}</p>
                <p><span className="text-gray-400">Email:</span> {user?.email || 'N/A'}</p>
                <p><span className="text-gray-400">User ID:</span> {user?.id?.slice(0, 8) || 'N/A'}...</p>
                <p><span className="text-gray-400">Provider:</span> {user?.app_metadata?.provider || 'N/A'}</p>
              </div>
              <button
                onClick={handleLogout}
                className="mt-3 w-full bg-red-500 text-white py-2 rounded text-xs hover:bg-red-600"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
