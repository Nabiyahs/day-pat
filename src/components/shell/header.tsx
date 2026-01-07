'use client'

import { AppIcon } from '@/components/ui/app-icon'

interface HeaderProps {
  onMenuClick?: () => void
  onPlusClick?: () => void
}

export function Header({ onMenuClick, onPlusClick }: HeaderProps) {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      {/* Menu Button - matches reference: w-11 h-11 rounded-xl */}
      <button
        onClick={onMenuClick}
        className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-amber-50 transition-colors"
        aria-label="Open menu"
        data-testid="btn-menu"
      >
        <AppIcon name="bars" className="w-5 h-5 text-[#F27430]" />
      </button>

      {/* Title - matches reference: text-lg font-bold */}
      <h1 className="text-lg font-bold text-gray-800">Praise Journal</h1>

      {/* Plus Button - matches reference: w-11 h-11 rounded-xl */}
      <button
        onClick={onPlusClick}
        className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-amber-50 transition-colors"
        aria-label="Add entry"
        data-testid="btn-plus"
      >
        <AppIcon name="plus" className="w-5 h-5 text-[#F27430]" />
      </button>
    </div>
  )
}
