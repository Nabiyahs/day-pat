'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppIcon } from '@/components/ui/app-icon'
import { useFavorites } from '@/hooks/use-favorites'
import { format, parseISO } from 'date-fns'
import { useSupabase } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'

export default function FavoritesPage() {
  const [user, setUser] = useState<User | null>(null)
  const [initializing, setInitializing] = useState(true)
  const router = useRouter()
  const supabase = useSupabase()
  const { data: favorites, loading, error, refetch } = useFavorites()

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

  const handleEntryClick = (date: string) => {
    router.push(`/app?date=${date}`)
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
          <h1 className="text-lg font-bold text-gray-800">Favorites</h1>
          <div className="w-11 h-11" /> {/* Spacer */}
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 pb-8 px-5">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <AppIcon name="spinner" className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <AppIcon name="alert-circle" className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">{error}</p>
            <button
              onClick={refetch}
              className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-20">
            <AppIcon name="heart" className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No Favorites Yet</h2>
            <p className="text-gray-500 text-sm">
              Tap the heart icon on your entries to add them to favorites
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {favorites.map((entry) => (
              <button
                key={entry.id}
                onClick={() => handleEntryClick(entry.entry_date)}
                className="bg-white rounded-2xl shadow-lg overflow-hidden text-left hover:shadow-xl transition-shadow"
              >
                {entry.thumbUrl ? (
                  <div className="aspect-square relative">
                    <img
                      src={entry.thumbUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute top-2 right-2">
                      <AppIcon name="heart" className="w-5 h-5 text-red-500 fill-current" />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                      <p className="text-white text-xs font-medium">
                        {format(parseISO(entry.entry_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-square bg-gray-100 flex items-center justify-center">
                    <AppIcon name="camera" className="w-10 h-10 text-gray-300" />
                  </div>
                )}
                {entry.praise && (
                  <div className="p-3">
                    <p className="text-sm text-gray-700 line-clamp-2">{entry.praise}</p>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
