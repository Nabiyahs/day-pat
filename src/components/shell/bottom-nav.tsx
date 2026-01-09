'use client'

import { AppIcon } from '@/components/ui/app-icon'

// Bottom nav matches main.html exactly:
// compass (guide) | heart (favorites) | plus (FAB) | fire (streak) | user (profile)
// All buttons open MODALS, not pages
//
// NOTE: onGuideClick opens GuideModal (fullscreen swipeable guide)
//       This is SEPARATE from IntroModal (onboarding)
//
// Layout: Optimized height for tap targets on mobile (~6.3" screens)
// - pt-2 pb-4: reduced top padding, comfortable bottom padding
// - Icons at w-6 h-6 for visibility
// - w-11 h-11 button containers ensure 44px minimum touch target
// - Safe-area-inset-bottom for notched devices

interface BottomNavProps {
  onGuideClick?: () => void  // Opens GuideModal (NOT IntroModal for onboarding)
  onFavoritesClick?: () => void
  onAddClick?: () => void
  onStreakClick?: () => void
  onProfileClick?: () => void
}

export function BottomNav({
  onGuideClick,
  onFavoritesClick,
  onAddClick,
  onStreakClick,
  onProfileClick,
}: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around px-5 pt-2 pb-4">
        {/* Guide - compass icon (opens GuideModal, NOT IntroModal) */}
        <button
          onClick={onGuideClick}
          className="flex flex-col items-center justify-center w-11 h-11 text-gray-400 active:text-gray-600"
          data-testid="nav-bottom-guide"
        >
          <AppIcon name="compass" className="w-6 h-6" />
        </button>

        {/* Favorites - heart icon */}
        <button
          onClick={onFavoritesClick}
          className="flex flex-col items-center justify-center w-11 h-11 text-gray-400 active:text-gray-600"
          data-testid="nav-bottom-favorites"
        >
          <AppIcon name="heart" className="w-6 h-6" />
        </button>

        {/* Center FAB - Today button (navigates to today's day view) */}
        <button
          onClick={onAddClick}
          className="w-14 h-14 -mt-7 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          aria-label="Go to today"
          data-testid="nav-bottom-today"
        >
          <AppIcon name="calendar-simple" className="w-6 h-6 text-white" />
        </button>

        {/* Streak - fire icon */}
        <button
          onClick={onStreakClick}
          className="flex flex-col items-center justify-center w-11 h-11 text-gray-400 active:text-gray-600"
          data-testid="nav-bottom-streak"
        >
          <AppIcon name="flame" className="w-6 h-6" />
        </button>

        {/* Profile - user icon */}
        <button
          onClick={onProfileClick}
          className="flex flex-col items-center justify-center w-11 h-11 text-gray-400 active:text-gray-600"
          data-testid="nav-bottom-profile"
        >
          <AppIcon name="user" className="w-6 h-6" />
        </button>
      </div>
    </nav>
  )
}
