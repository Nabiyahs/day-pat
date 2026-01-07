'use client'

import { useRouter, usePathname } from 'next/navigation'
import { AppIcon, type IconName } from '@/components/ui/app-icon'
import { cn } from '@/lib/utils'

interface BottomNavProps {
  onAddClick?: () => void
}

interface NavItem {
  id: string
  icon: IconName
  href: string
  label: string
}

// Matches reference: Calendar, Favorites, [Plus], Insights, Profile
// Insights uses chart-line icon (fa-chart-line in reference)
const NAV_ITEMS: NavItem[] = [
  { id: 'calendar', icon: 'calendar', href: '/en/app', label: 'Calendar' },
  { id: 'favorites', icon: 'heart', href: '/en/app/favorites', label: 'Favorites' },
  { id: 'insights', icon: 'trending-up', href: '/en/app/insights', label: 'Insights' },
  { id: 'profile', icon: 'user', href: '/en/app/profile', label: 'Profile' },
]

export function BottomNav({ onAddClick }: BottomNavProps) {
  const router = useRouter()
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/en/app') {
      return pathname === '/en/app'
    }
    return pathname.startsWith(href)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
      <div className="flex items-center justify-around px-5 py-3">
        {/* First two items: Calendar, Favorites */}
        {NAV_ITEMS.slice(0, 2).map((item) => {
          const active = isActive(item.href)
          return (
            <button
              key={item.id}
              onClick={() => router.push(item.href)}
              className={cn(
                'flex flex-col items-center gap-1',
                active ? 'text-[#F27430]' : 'text-gray-400'
              )}
              data-testid={`nav-bottom-${item.id}`}
            >
              <AppIcon name={item.icon} className="w-5 h-5" />
              <span className={cn('text-xs', active && 'font-semibold')}>{item.label}</span>
            </button>
          )
        })}

        {/* Center FAB - matches reference: from-[#F2B949] to-[#F27430] */}
        <button
          onClick={onAddClick}
          className="w-14 h-14 -mt-8 bg-gradient-to-br from-[#F2B949] to-[#F27430] rounded-full flex items-center justify-center shadow-lg"
          aria-label="Add today's entry"
          data-testid="nav-bottom-plus"
        >
          <AppIcon name="plus" className="w-6 h-6 text-white" />
        </button>

        {/* Last two items: Insights, Profile */}
        {NAV_ITEMS.slice(2).map((item) => {
          const active = isActive(item.href)
          return (
            <button
              key={item.id}
              onClick={() => router.push(item.href)}
              className={cn(
                'flex flex-col items-center gap-1',
                active ? 'text-[#F27430]' : 'text-gray-400'
              )}
              data-testid={`nav-bottom-${item.id}`}
            >
              <AppIcon name={item.icon} className="w-5 h-5" />
              <span className="text-xs">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
