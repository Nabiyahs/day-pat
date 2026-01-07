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

const NAV_ITEMS: NavItem[] = [
  { id: 'calendar', icon: 'calendar', href: '/en/app', label: 'Calendar' },
  { id: 'favorites', icon: 'heart', href: '/en/app/favorites', label: 'Favorites' },
  { id: 'insights', icon: 'flame', href: '/en/app/insights', label: 'Insights' },
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
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around px-5 py-3">
        {NAV_ITEMS.slice(0, 2).map((item) => {
          const active = isActive(item.href)
          return (
            <button
              key={item.id}
              onClick={() => router.push(item.href)}
              className={cn(
                'flex items-center justify-center transition-colors min-w-[48px] min-h-[48px]',
                active
                  ? 'text-orange-600'
                  : 'text-gray-400 hover:text-gray-600'
              )}
              aria-label={item.label}
              data-testid={`nav-bottom-${item.id}`}
            >
              <AppIcon name={item.icon} className="w-5 h-5" />
            </button>
          )
        })}

        {/* Center FAB - gradient from orange-500 to amber-500 */}
        <button
          onClick={onAddClick}
          className="w-14 h-14 -mt-8 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow active:scale-95"
          aria-label="Add today's entry"
          data-testid="nav-bottom-plus"
        >
          <AppIcon name="plus" className="w-6 h-6 text-white" />
        </button>

        {NAV_ITEMS.slice(2).map((item) => {
          const active = isActive(item.href)
          return (
            <button
              key={item.id}
              onClick={() => router.push(item.href)}
              className={cn(
                'flex items-center justify-center transition-colors min-w-[48px] min-h-[48px]',
                active
                  ? 'text-orange-600'
                  : 'text-gray-400 hover:text-gray-600'
              )}
              aria-label={item.label}
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
