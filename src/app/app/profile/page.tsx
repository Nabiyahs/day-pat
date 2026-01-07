'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppIcon } from '@/components/ui/app-icon'
import { useSupabase, resetSupabaseClient } from '@/lib/supabase/client'
import { clearSessionTracking } from '@/lib/auth/session-persistence'
import type { User, Session } from '@supabase/supabase-js'
import { format } from 'date-fns'

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [initializing, setInitializing] = useState(true)
  const [totalEntries, setTotalEntries] = useState(0)
  const router = useRouter()
  const supabase = useSupabase()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      if (session?.user) {
        setUser(session.user)
        fetchTotalEntries()
      } else {
        router.replace('/login')
      }
      setInitializing(false)
    })
  }, [supabase, router])

  const fetchTotalEntries = async () => {
    const { count } = await supabase
      .from('entries')
      .select('*', { count: 'exact', head: true })
    setTotalEntries(count || 0)
  }

  const handleBack = () => {
    router.push('/app')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    resetSupabaseClient()
    clearSessionTracking()
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

  const memberSince = user?.created_at
    ? format(new Date(user.created_at), 'MMMM yyyy')
    : 'Unknown'

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
          <h1 className="text-lg font-bold text-gray-800">Profile</h1>
          <div className="w-11 h-11" />
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 pb-8 px-5">
        <div className="space-y-6">
          {/* Profile Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-amber-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <AppIcon name="user" className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-1">
              {user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'}
            </h2>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>

          {/* Stats */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-[#F2B949]">{totalEntries}</p>
                <p className="text-xs text-gray-500 mt-1">Total Entries</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">{memberSince}</p>
                <p className="text-xs text-gray-500 mt-1">Member Since</p>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden">
            <button
              onClick={() => router.push('/app/favorites')}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <AppIcon name="heart" className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-700">My Favorites</span>
              </div>
              <AppIcon name="chevron-right" className="w-4 h-4 text-gray-400" />
            </button>
            <div className="border-t border-gray-100" />
            <button
              onClick={() => router.push('/app/settings')}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <AppIcon name="settings" className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-700">Settings</span>
              </div>
              <AppIcon name="chevron-right" className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Sign Out */}
          <button
            onClick={handleLogout}
            className="w-full bg-white/80 backdrop-blur-sm rounded-2xl px-5 py-4 flex items-center justify-center gap-3 text-red-600 hover:bg-red-50 transition-colors"
          >
            <AppIcon name="logout" className="w-5 h-5" />
            <span className="font-semibold">Sign Out</span>
          </button>
        </div>
      </main>
    </div>
  )
}
