'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppIcon } from '@/components/ui/app-icon'
import { useSupabase } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'
import { format, startOfMonth, endOfMonth } from 'date-fns'

interface MonthStats {
  entries: number
  streak: number
  favorites: number
}

export default function InsightsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [initializing, setInitializing] = useState(true)
  const [stats, setStats] = useState<MonthStats>({ entries: 0, streak: 0, favorites: 0 })
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = useSupabase()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      if (session?.user) {
        setUser(session.user)
        fetchStats()
      } else {
        router.replace('/login')
      }
      setInitializing(false)
    })
  }, [supabase, router])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const now = new Date()
      const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
      const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd')

      // Count entries this month
      const { count: entriesCount } = await supabase
        .from('entries')
        .select('*', { count: 'exact', head: true })
        .gte('entry_date', monthStart)
        .lte('entry_date', monthEnd)

      // Count favorites
      const { count: favoritesCount } = await supabase
        .from('entries')
        .select('*', { count: 'exact', head: true })
        .eq('is_liked', true)

      // Calculate streak (simplified - consecutive days from today going back)
      const { data: recentEntries } = await supabase
        .from('entries')
        .select('entry_date')
        .order('entry_date', { ascending: false })
        .limit(30)

      let streak = 0
      if (recentEntries && recentEntries.length > 0) {
        const dates = recentEntries.map((e: { entry_date: string }) => e.entry_date)
        const today = format(new Date(), 'yyyy-MM-dd')
        let checkDate = today

        for (let i = 0; i < 30; i++) {
          if (dates.includes(checkDate)) {
            streak++
            const d = new Date(checkDate)
            d.setDate(d.getDate() - 1)
            checkDate = format(d, 'yyyy-MM-dd')
          } else {
            break
          }
        }
      }

      setStats({
        entries: entriesCount || 0,
        streak,
        favorites: favoritesCount || 0,
      })
    } catch (err) {
      console.error('[Insights] Failed to fetch stats:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    router.push('/app')
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
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-b border-amber-100 z-50">
        <div className="flex items-center justify-between px-5 py-4">
          <button
            onClick={handleBack}
            className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-amber-50 transition-colors"
            aria-label="Back"
          >
            <AppIcon name="chevron-left" className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-bold text-gray-800">Insights</h1>
          <div className="w-11 h-11" />
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 pb-8 px-5">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <AppIcon name="spinner" className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Monthly Stats */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">
                {format(new Date(), 'MMMM')} Stats
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-[#F2B949]">{stats.entries}</p>
                  <p className="text-xs text-gray-500 mt-1">Entries</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-[#EDD377]">{stats.streak}</p>
                  <p className="text-xs text-gray-500 mt-1">Day Streak</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-[#F27430]">{stats.favorites}</p>
                  <p className="text-xs text-gray-500 mt-1">Favorites</p>
                </div>
              </div>
            </div>

            {/* Streak Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-amber-400 rounded-2xl flex items-center justify-center">
                  <AppIcon name="flame" className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{stats.streak} Day Streak</p>
                  <p className="text-sm text-gray-500">
                    {stats.streak > 0 ? 'Keep it going!' : 'Start your streak today!'}
                  </p>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Tips</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">📝</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Write about what made you grateful today
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">📸</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Capture moments that bring you joy
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">❤️</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Save your favorite entries for later
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
