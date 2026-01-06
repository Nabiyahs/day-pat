'use client'

import { useState } from 'react'
import { useSupabase, resetSupabaseClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { AppIcon } from '@/components/ui/app-icon'
import { motion, AnimatePresence } from 'framer-motion'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface UserMenuProps {
  user: SupabaseUser
}

export function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const router = useRouter()
  const supabase = useSupabase()

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await supabase.auth.signOut()

      // Clear all storage to ensure clean logout
      if (typeof window !== 'undefined') {
        localStorage.removeItem('praise-calendar-auth')
        sessionStorage.removeItem('praise-calendar-auth')
      }

      // Reset the client
      resetSupabaseClient()

      // Redirect to login
      router.replace('/login')
      router.refresh()
    } catch (err) {
      console.error('[UserMenu] Logout error:', err)
      setLoggingOut(false)
    }
  }

  const initials = user.email?.charAt(0).toUpperCase() || 'U'

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loggingOut}
        className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center text-white font-medium shadow-md hover:shadow-lg transition-shadow disabled:opacity-50"
      >
        {initials}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden"
            >
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <AppIcon name="user" className="w-5 h-5 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-2">
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  <AppIcon name="logout" className="w-4 h-4" />
                  {loggingOut ? 'Signing out...' : 'Sign Out'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
