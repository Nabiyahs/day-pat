'use client'

import { AppIcon, type IconName } from '@/components/ui/app-icon'
import { cn } from '@/lib/utils'
import { type Locale } from '@/lib/i18n'

interface BottomNavProps {
  locale: Locale
  onAddClick?: () => void
}

export function BottomNav({ locale, onAddClick }: BottomNavProps) {
  const comingSoonText = locale === 'ko' ? '준비 중' : 'Coming soon'

  const NAV_ITEMS: { id: string; icon: IconName; active: boolean; available: boolean }[] = [
    { id: 'calendar', icon: 'calendar', active: true, available: true },
    { id: 'favorites', icon: 'heart', active: false, available: false },
    { id: 'insights', icon: 'flame', active: false, available: false },
    { id: 'profile', icon: 'user', active: false, available: false },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around px-5 py-3">
        {NAV_ITEMS.slice(0, 2).map((item) => {
          const isDisabled = !item.available && !item.active
          return (
            <button
              key={item.id}
              disabled={isDisabled}
              aria-disabled={isDisabled}
              title={!item.available ? comingSoonText : undefined}
              className={cn(
                'flex items-center justify-center transition-colors min-w-[48px] min-h-[48px]',
                item.active
                  ? 'text-[#F27430]'
                  : item.available
                  ? 'text-gray-400 hover:text-gray-600'
                  : 'text-gray-300 cursor-not-allowed'
              )}
              aria-label={item.id}
              data-testid={`nav-bottom-${item.id}`}
            >
              <AppIcon name={item.icon} className="w-5 h-5" />
            </button>
          )
        })}

        {/* Center FAB */}
        <button
          onClick={onAddClick}
          className="w-14 h-14 -mt-8 bg-gradient-to-br from-[#F2B949] to-[#F27430] rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow active:scale-95"
          aria-label={locale === 'ko' ? '오늘 기록 추가' : 'Add today\'s entry'}
          data-testid="nav-bottom-plus"
        >
          <AppIcon name="plus" className="w-6 h-6 text-white" />
        </button>

        {NAV_ITEMS.slice(2).map((item) => {
          const isDisabled = !item.available && !item.active
          return (
            <button
              key={item.id}
              disabled={isDisabled}
              aria-disabled={isDisabled}
              title={!item.available ? comingSoonText : undefined}
              className={cn(
                'flex items-center justify-center transition-colors min-w-[48px] min-h-[48px]',
                item.active
                  ? 'text-[#F27430]'
                  : item.available
                  ? 'text-gray-400 hover:text-gray-600'
                  : 'text-gray-300 cursor-not-allowed'
              )}
              aria-label={item.id}
              data-testid={`nav-bottom-${item.id}`}
            >
              <AppIcon name={item.icon} className="w-5 h-5" />
            </button>
          )
        })}
      </div>
    </nav>
  )
}
