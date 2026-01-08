'use client'

import { cn } from '@/lib/utils'

export type ViewType = 'day' | 'week' | 'month'

interface ViewTabsProps {
  activeView: ViewType
  onViewChange: (view: ViewType) => void
}

const TABS: { id: ViewType; label: string }[] = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
]

export function ViewTabs({ activeView, onViewChange }: ViewTabsProps) {
  return (
    <div className="flex items-center justify-center gap-2 px-5 pb-2">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onViewChange(tab.id)}
          className={cn(
            'px-6 py-2 rounded-full text-sm font-semibold transition-all',
            activeView === tab.id
              ? 'bg-orange-500 text-white'
              : 'bg-white/60 text-gray-600'
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
