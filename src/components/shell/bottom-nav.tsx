'use client'

import { CalendarDays, Heart, Plus, TrendingUp, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getDictionarySync, type Locale } from '@/lib/i18n'

interface BottomNavProps {
  locale: Locale
  onAddClick?: () => void
}

export function BottomNav({ locale, onAddClick }: BottomNavProps) {
  const dict = getDictionarySync(locale)

  const NAV_ITEMS = [
    { id: 'calendar', label: dict.nav.calendar, icon: CalendarDays, active: true },
    { id: 'favorites', label: dict.nav.favorites, icon: Heart, active: false },
    { id: 'insights', label: dict.nav.insights, icon: TrendingUp, active: false },
    { id: 'profile', label: dict.nav.profile, icon: User, active: false },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-inset-bottom">
      <div className="flex items-center justify-around px-5 py-3">
        {NAV_ITEMS.slice(0, 2).map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              className={cn(
                'flex flex-col items-center gap-1 transition-colors',
                item.active ? 'text-[#F27430]' : 'text-gray-400'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className={cn('text-xs', item.active && 'font-semibold')}>
                {item.label}
              </span>
            </button>
          )
        })}

        {/* Center FAB */}
        <button
          onClick={onAddClick}
          className="w-14 h-14 -mt-8 bg-gradient-to-br from-[#F2B949] to-[#F27430] rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow"
        >
          <Plus className="w-6 h-6 text-white" />
        </button>

        {NAV_ITEMS.slice(2).map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              className={cn(
                'flex flex-col items-center gap-1 transition-colors',
                item.active ? 'text-[#F27430]' : 'text-gray-400'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
