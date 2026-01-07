'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppIcon } from '@/components/ui/app-icon'
import { useSupabase, resetSupabaseClient } from '@/lib/supabase/client'
import { clearSessionTracking } from '@/lib/auth/session-persistence'
import type { User, Session } from '@supabase/supabase-js'

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [initializing, setInitializing] = useState(true)
  const router = useRouter()
  const supabase = useSupabase()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      if (session?.user) {
        setUser(session.user)
      } else {
        router.replace('/login')
      }
      setInitializing(false)
    })
  }, [supabase, router])

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
          <h1 className="text-lg font-bold text-gray-800">Settings</h1>
          <div className="w-11 h-11" />
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 pb-8 px-5">
        <div className="space-y-4">
          {/* Account Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="text-xs font-semibold text-gray-500 uppercase">Account</h3>
            </div>
            <div className="divide-y divide-gray-100">
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <AppIcon name="mail" className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-700">Email</span>
                </div>
                <span className="text-sm text-gray-500">{user?.email || 'Not set'}</span>
              </div>
            </div>
          </div>

          {/* Notifications Section (Placeholder) */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="text-xs font-semibold text-gray-500 uppercase">Notifications</h3>
            </div>
            <div className="divide-y divide-gray-100">
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <AppIcon name="bell" className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-700">Daily Reminder</span>
                </div>
                <div className="text-xs text-gray-400 flex items-center gap-1">
                  <AppIcon name="construction" className="w-3 h-3" />
                  Coming soon
                </div>
              </div>
            </div>
          </div>

          {/* About Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="text-xs font-semibold text-gray-500 uppercase">About</h3>
            </div>
            <div className="divide-y divide-gray-100">
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <AppIcon name="info" className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-700">Version</span>
                </div>
                <span className="text-sm text-gray-500">1.0.0</span>
              </div>
            </div>
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
