'use client'

import { useEffect } from 'react'
import { AppIcon } from '@/components/ui/app-icon'
import { cn } from '@/lib/utils'
import { getDictionarySync, type Locale } from '@/lib/i18n'

interface SideDrawerProps {
  locale: Locale
  isOpen: boolean
  onClose: () => void
  onLogout?: () => void
}

const ICON_MAP = {
  calendar: 'calendar' as const,
  favorites: 'heart' as const,
  insights: 'trending-up' as const,
  settings: 'settings' as const,
}

export function SideDrawer({ locale, isOpen, onClose, onLogout }: SideDrawerProps) {
  const dict = getDictionarySync(locale)

  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      // Prevent body scroll when drawer is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  const MENU_ITEMS = [
    { id: 'calendar', label: dict.nav.calendar, icon: ICON_MAP.calendar, active: true, available: true },
    { id: 'favorites', label: dict.nav.favorites, icon: ICON_MAP.favorites, active: false, available: false },
    { id: 'insights', label: dict.nav.insights, icon: ICON_MAP.insights, active: false, available: false },
    { id: 'settings', label: dict.nav.settings, icon: ICON_MAP.settings, active: false, available: false },
  ]

  const comingSoonText = locale === 'ko' ? '준비 중' : 'Coming soon'

  return (
    <div
      className={cn(
        'fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity duration-300',
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={dict.nav.menu}
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
              aria-label={locale === 'ko' ? '메뉴 닫기' : 'Close menu'}
            >
              <AppIcon name="x" className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <nav className="space-y-2">
            {MENU_ITEMS.map((item) => {
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.active) {
                      onClose()
                    }
                  }}
                  disabled={!item.available && !item.active}
                  title={!item.available && !item.active ? comingSoonText : undefined}
                  className={cn(
                    'w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-colors relative',
                    item.active
                      ? 'bg-amber-50 text-[#F27430]'
                      : item.available
                      ? 'hover:bg-gray-50 text-gray-700'
                      : 'text-gray-400 cursor-not-allowed'
                  )}
                >
                  <AppIcon name={item.icon} className="w-5 h-5" />
                  <span className="font-semibold">{item.label}</span>
                  {!item.available && !item.active && (
                    <span className="ml-auto flex items-center gap-1 text-xs text-gray-400">
                      <AppIcon name="construction" className="w-3 h-3" />
                      {comingSoonText}
                    </span>
                  )}
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
                <AppIcon name="logout" className="w-5 h-5" />
                <span className="font-semibold">{dict.nav.signOut}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
