'use client'

import { Flame } from 'lucide-react'

/**
 * Slide 2: Habit & Streak
 * Background: #F27430 (energetic orange)
 * Visual: Bold flame icon with streak number
 */
export function SlideStreak() {
  return (
    <div className="flex flex-col items-center justify-center w-full">
      {/* Main flame container */}
      <div className="relative">
        {/* Glow effect behind flame */}
        <div className="absolute inset-0 blur-3xl bg-yellow-300/40 rounded-full scale-150" />

        {/* Flame icon */}
        <div className="relative">
          <Flame
            className="w-40 h-40 text-yellow-300 drop-shadow-lg"
            strokeWidth={1.5}
            fill="currentColor"
          />

          {/* Streak number inside flame */}
          <div className="absolute inset-0 flex items-center justify-center pt-4">
            <div className="text-center">
              <span className="text-5xl font-black text-white drop-shadow-lg">7</span>
            </div>
          </div>
        </div>

        {/* "일 연속" label below */}
        <div className="text-center mt-2">
          <span className="text-white/90 text-xl font-bold tracking-wide">
            일 연속
          </span>
        </div>

        {/* Small decorative flames */}
        <div className="absolute -left-8 top-1/3 opacity-60">
          <Flame className="w-8 h-8 text-yellow-200" fill="currentColor" />
        </div>
        <div className="absolute -right-6 top-1/2 opacity-50">
          <Flame className="w-6 h-6 text-orange-200" fill="currentColor" />
        </div>
      </div>
    </div>
  )
}
