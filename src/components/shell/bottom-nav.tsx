'use client'

import { AppIcon, type IconName } from '@/components/ui/app-icon'

// Bottom nav matches main.html exactly:
// compass (guide) | heart (favorites) | plus (FAB) | fire (streak) | user (profile)
// All buttons open MODALS, not pages
//
// NOTE: onGuideClick opens GuideModal (fullscreen swipeable guide)
//       This is SEPARATE from IntroModal (onboarding)

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
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
      <div className="flex items-center justify-around px-5 py-3">
        {/* Guide - compass icon (opens GuideModal, NOT IntroModal) */}
        <button
          onClick={onGuideClick}
          className="flex flex-col items-center gap-1 text-gray-400"
          data-testid="nav-bottom-guide"
        >
          <AppIcon name="compass" className="w-5 h-5" />
        </button>

        {/* Favorites - heart icon */}
        <button
          onClick={onFavoritesClick}
          className="flex flex-col items-center gap-1 text-gray-400"
          data-testid="nav-bottom-favorites"
        >
          <AppIcon name="heart" className="w-5 h-5" />
        </button>

        {/* Center FAB - Plus button */}
        <button
          onClick={onAddClick}
          className="w-14 h-14 -mt-8 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center shadow-lg"
          aria-label="Add today's entry"
          data-testid="nav-bottom-plus"
        >
          <AppIcon name="plus" className="w-6 h-6 text-white" />
        </button>

        {/* Streak - fire icon */}
        <button
          onClick={onStreakClick}
          className="flex flex-col items-center gap-1 text-gray-400"
          data-testid="nav-bottom-streak"
        >
          <AppIcon name="flame" className="w-5 h-5" />
        </button>

        {/* Profile - user icon */}
        <button
          onClick={onProfileClick}
          className="flex flex-col items-center gap-1 text-gray-400"
          data-testid="nav-bottom-profile"
        >
          <AppIcon name="user" className="w-5 h-5" />
        </button>
      </div>
    </nav>
  )
}
