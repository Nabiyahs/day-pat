'use client'

import { cn } from '@/lib/utils'
import { getDictionarySync, type Locale } from '@/lib/i18n'

export type ViewType = 'day' | 'week' | 'month'

interface ViewTabsProps {
  locale: Locale
  activeView: ViewType
  onViewChange: (view: ViewType) => void
}

export function ViewTabs({ locale, activeView, onViewChange }: ViewTabsProps) {
  const dict = getDictionarySync(locale)

  const TABS: { id: ViewType; label: string }[] = [
    { id: 'day', label: dict.nav.day },
    { id: 'week', label: dict.nav.week },
    { id: 'month', label: dict.nav.month },
  ]

  return (
    <div className="flex items-center justify-center gap-2 px-5 pb-3">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onViewChange(tab.id)}
          className={cn(
            'px-6 py-2 rounded-full text-sm font-semibold transition-all',
            activeView === tab.id
              ? 'bg-[#F2B949] text-white'
              : 'bg-white/60 text-gray-600 hover:bg-white/80'
          )}
          data-testid={`tab-${tab.id}`}
          aria-pressed={activeView === tab.id}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
