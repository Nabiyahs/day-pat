'use client'

import { AppIcon } from '@/components/ui/app-icon'

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      {/* Menu Button */}
      <button
        onClick={onMenuClick}
        className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-amber-50 transition-colors"
        aria-label="Open menu"
        data-testid="btn-menu"
      >
        <AppIcon name="bars" className="w-5 h-5 text-orange-600" />
      </button>

      {/* Centered title - Caveat font */}
      <h1
        className="text-[23px] font-bold text-gray-800 absolute left-1/2 transform -translate-x-1/2"
        style={{ fontFamily: "'Caveat', cursive" }}
      >
        DayPat
      </h1>

      {/* Spacer for centering */}
      <div className="w-11" />
    </div>
  )
}
