'use client'

import { AppIcon, type IconName } from '@/components/ui/app-icon'
import { cn } from '@/lib/utils'
import { getDictionarySync, type Locale } from '@/lib/i18n'

interface BottomNavProps {
  locale: Locale
  onAddClick?: () => void
}

export function BottomNav({ locale, onAddClick }: BottomNavProps) {
  const dict = getDictionarySync(locale)
  const comingSoonText = locale === 'ko' ? '준비 중' : 'Coming soon'

  const NAV_ITEMS: { id: string; label: string; icon: IconName; active: boolean; available: boolean }[] = [
    { id: 'calendar', label: dict.nav.calendar, icon: 'calendar', active: true, available: true },
    { id: 'favorites', label: dict.nav.favorites, icon: 'heart', active: false, available: false },
    { id: 'insights', label: dict.nav.insights, icon: 'trending-up', active: false, available: false },
    { id: 'profile', label: dict.nav.profile, icon: 'user', active: false, available: false },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around px-5 py-3">
        {NAV_ITEMS.slice(0, 2).map((item) => (
          <button
            key={item.id}
            disabled={!item.available && !item.active}
            title={!item.available ? comingSoonText : undefined}
            className={cn(
              'flex flex-col items-center gap-1 transition-colors min-w-[48px] min-h-[48px] justify-center',
              item.active
                ? 'text-[#F27430]'
                : item.available
                ? 'text-gray-400 hover:text-gray-600'
                : 'text-gray-300 cursor-not-allowed'
            )}
            aria-label={item.label}
          >
            <AppIcon name={item.icon} className="w-5 h-5" />
            <span className={cn('text-xs', item.active && 'font-semibold')}>
              {item.label}
            </span>
          </button>
        ))}

        {/* Center FAB */}
        <button
          onClick={onAddClick}
          className="w-14 h-14 -mt-8 bg-gradient-to-br from-[#F2B949] to-[#F27430] rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow active:scale-95"
          aria-label={locale === 'ko' ? '오늘 기록 추가' : 'Add today\'s entry'}
        >
          <AppIcon name="plus" className="w-6 h-6 text-white" />
        </button>

        {NAV_ITEMS.slice(2).map((item) => (
          <button
            key={item.id}
            disabled={!item.available && !item.active}
            title={!item.available ? comingSoonText : undefined}
            className={cn(
              'flex flex-col items-center gap-1 transition-colors min-w-[48px] min-h-[48px] justify-center',
              item.active
                ? 'text-[#F27430]'
                : item.available
                ? 'text-gray-400 hover:text-gray-600'
                : 'text-gray-300 cursor-not-allowed'
            )}
            aria-label={item.label}
          >
            <AppIcon name={item.icon} className="w-5 h-5" />
            <span className="text-xs">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
