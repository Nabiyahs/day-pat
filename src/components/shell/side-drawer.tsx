'use client'

import { useEffect } from 'react'
import { AppIcon } from '@/components/ui/app-icon'
import { cn } from '@/lib/utils'

interface SideDrawerProps {
  isOpen: boolean
  onClose: () => void
  onLogout?: () => void
}

const MENU_ITEMS = [
  { id: 'calendar', label: 'Calendar', icon: 'calendar' as const, active: true, available: true },
  { id: 'favorites', label: 'Favorites', icon: 'heart' as const, active: false, available: false },
  { id: 'insights', label: 'Insights', icon: 'trending-up' as const, active: false, available: false },
  { id: 'settings', label: 'Settings', icon: 'settings' as const, active: false, available: false },
]

export function SideDrawer({ isOpen, onClose, onLogout }: SideDrawerProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  return (
    <div
      className={cn(
        'fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity duration-300',
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
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
            <h2 className="text-xl font-bold text-gray-800">Menu</h2>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Close menu"
              data-testid="drawer-close"
            >
              <AppIcon name="x" className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <nav className="space-y-2">
            {MENU_ITEMS.map((item) => {
              const isDisabled = !item.available && !item.active
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.active) {
                      onClose()
                    }
                  }}
                  disabled={isDisabled}
                  aria-disabled={isDisabled}
                  title={isDisabled ? 'Coming soon' : undefined}
                  className={cn(
                    'w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-colors relative',
                    item.active
                      ? 'bg-amber-50 text-orange-600'
                      : item.available
                      ? 'hover:bg-gray-50 text-gray-700'
                      : 'text-gray-400 cursor-not-allowed'
                  )}
                  data-testid={`drawer-item-${item.id}`}
                >
                  <AppIcon name={item.icon} className="w-5 h-5" />
                  <span className="font-semibold">{item.label}</span>
                  {isDisabled && (
                    <span className="ml-auto flex items-center gap-1 text-xs text-gray-400">
                      <AppIcon name="construction" className="w-3 h-3" />
                      Coming soon
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
                data-testid="drawer-logout"
              >
                <AppIcon name="logout" className="w-5 h-5" />
                <span className="font-semibold">Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
