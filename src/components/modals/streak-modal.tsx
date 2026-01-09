'use client'

import { useEffect } from 'react'
import { AppIcon } from '@/components/ui/app-icon'
import { cn } from '@/lib/utils'

interface StreakModalProps {
  isOpen: boolean
  onClose: () => void
  currentStreak?: number
  longestStreak?: number
  totalEntries?: number
}

// Matches main.html streakModal exactly
export function StreakModal({
  isOpen,
  onClose,
  currentStreak = 0,
  longestStreak = 0,
  totalEntries = 0,
}: StreakModalProps) {
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
        'fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity duration-300 flex items-center justify-center p-5',
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
      onClick={onClose}
    >
      <div
        className={cn(
          'bg-white rounded-3xl shadow-2xl w-full max-w-sm transform transition-transform duration-300 p-8',
          isOpen ? 'scale-100' : 'scale-95'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Your Streak</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100"
          >
            <AppIcon name="x" className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="flex flex-col items-center justify-center py-6">
          {/* Large flame icon with overlapping streak count */}
          <div className="relative flex items-center justify-center mb-2">
            {/* Enlarged flame icon */}
            <AppIcon name="flame" className="w-28 h-28 text-orange-500" />
            {/* Streak count positioned to partially overlap bottom of flame */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/4 whitespace-nowrap">
              <span className={cn(
                "font-bold text-gray-800 leading-none",
                currentStreak >= 100 ? "text-3xl" : "text-4xl"
              )}>
                {currentStreak}
              </span>
              <span className="text-lg font-semibold text-gray-600 ml-1">Days</span>
            </div>
          </div>

          <p className="text-gray-600 text-center mb-8 leading-relaxed max-w-[280px]" style={{ textWrap: 'balance', wordBreak: 'keep-all' }}>
            {currentStreak > 0
              ? <>You&apos;re on fire!<br />Keep the momentum going.</>
              : 'Start your streak today!'}
          </p>

          <div className="w-full space-y-4">
            {/* Current Streak */}
            <div className="bg-amber-50 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                  <AppIcon name="flame" className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Current Streak</p>
                  <p className="text-sm text-gray-600">{currentStreak} days</p>
                </div>
              </div>
            </div>

            {/* Longest Streak */}
            <div className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                  <AppIcon name="star" className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Longest Streak</p>
                  <p className="text-sm text-gray-600">{longestStreak} days</p>
                </div>
              </div>
            </div>

            {/* Total Entries */}
            <div className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                  <AppIcon name="calendar" className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Total Entries</p>
                  <p className="text-sm text-gray-600">{totalEntries} days</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
