'use client'

import { X, CalendarDays, Heart, TrendingUp, Settings, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getDictionarySync, type Locale } from '@/lib/i18n'

interface SideDrawerProps {
  locale: Locale
  isOpen: boolean
  onClose: () => void
  onLogout?: () => void
}

export function SideDrawer({ locale, isOpen, onClose, onLogout }: SideDrawerProps) {
  const dict = getDictionarySync(locale)

  const MENU_ITEMS = [
    { id: 'calendar', label: dict.nav.calendar, icon: CalendarDays, active: true },
    { id: 'favorites', label: dict.nav.favorites, icon: Heart, active: false },
    { id: 'insights', label: dict.nav.insights, icon: TrendingUp, active: false },
    { id: 'settings', label: dict.nav.settings, icon: Settings, active: false },
  ]

  return (
    <div
      className={cn(
        'fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity duration-300',
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
      onClick={onClose}
    >
      <div
        className={cn(
          'absolute left-0 top-0 bottom-0 w-[280px] bg-white shadow-2xl transform transition-transform duration-300',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-gray-800">{dict.nav.menu}</h2>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <nav className="space-y-2">
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  className={cn(
                    'w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-colors',
                    item.active
                      ? 'bg-amber-50 text-[#F27430]'
                      : 'hover:bg-gray-50 text-gray-700'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-semibold">{item.label}</span>
                </button>
              )
            })}
          </nav>

          {onLogout && (
            <div className="mt-8 pt-8 border-t border-gray-100">
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-red-50 text-red-600 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-semibold">{dict.nav.signOut}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
