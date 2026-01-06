'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/lib/supabase/client'
import { Calendar, CalendarDays, Sun, Loader2 } from 'lucide-react'
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js'
import { Tabs } from '@/components/ui/tabs'
import { Modal } from '@/components/ui/modal'
import { UserMenu } from '@/components/auth/user-menu'
import { MonthView } from '@/components/calendar/month-view'
import { WeekView } from '@/components/calendar/week-view'
import { DayView } from '@/components/day/day-view'
import { formatDateString } from '@/lib/utils'

type ViewTab = 'month' | 'week' | 'day'

const TABS = [
  { id: 'month', label: 'Month', icon: <Calendar className="w-4 h-4" /> },
  { id: 'week', label: 'Week', icon: <CalendarDays className="w-4 h-4" /> },
  { id: 'day', label: 'Day', icon: <Sun className="w-4 h-4" /> },
]

export default function AppPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<ViewTab>('month')
  const [selectedDate, setSelectedDate] = useState(formatDateString(new Date()))
  const [showDayModal, setShowDayModal] = useState(false)
  const router = useRouter()
  const supabase = useSupabase()

  const checkUser = useCallback(async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error) {
        console.error('[App] Auth error:', error)
        router.replace('/login')
        return
      }

      if (!user) {
        console.log('[App] No user, redirecting to login')
        router.replace('/login')
        return
      }

      console.log('[App] User authenticated:', user.email)
      setUser(user)
    } catch (err) {
      console.error('[App] Unexpected error:', err)
      router.replace('/login')
    } finally {
      setLoading(false)
    }
  }, [supabase, router])

  useEffect(() => {
    checkUser()

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
  }, [checkUser, supabase, router])

  const handleSelectDate = (date: string) => {
    setSelectedDate(date)
    if (activeTab !== 'day') {
      setShowDayModal(true)
    }
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as ViewTab)
    if (tab === 'day') {
      setShowDayModal(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">
            Praise Calendar
          </h1>
          <UserMenu user={user} />
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="sticky top-[57px] z-10 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 px-4 py-3">
        <div className="max-w-lg mx-auto">
          <Tabs
            tabs={TABS}
            activeTab={activeTab}
            onChange={handleTabChange}
          />
        </div>
      </div>

      {/* Main Content */}
      <main className="px-4 py-6">
        {activeTab === 'month' && (
          <MonthView onSelectDate={handleSelectDate} />
        )}
        {activeTab === 'week' && (
          <WeekView onSelectDate={handleSelectDate} />
        )}
        {activeTab === 'day' && (
          <DayView
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />
        )}
      </main>

      {/* Day View Modal (for month/week views) */}
      <Modal
        isOpen={showDayModal}
        onClose={() => setShowDayModal(false)}
        title="Day View"
        className="md:max-w-lg"
      >
        <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 min-h-[60vh]">
          <DayView
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onClose={() => setShowDayModal(false)}
          />
        </div>
      </Modal>
    </div>
  )
}
