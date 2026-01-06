'use client'

import { AppIcon } from '@/components/ui/app-icon'

/**
 * Slide 2: Streak Display
 * Design inspired by reference-intro-2.jpg
 * Visual: Yellow circle with flame icon + "7" badge, compact week view below
 * Removed: "7일 연속" text per requirements
 * Optimized for mobile: fits on 6.3-inch screen without scrolling
 */
export function SlideStreak() {
  // Day colors - gradient from orange to yellow/green
  const dayColors = [
    'bg-[#F27430]', // 월 - orange
    'bg-[#F28D49]', // 화 - light orange
    'bg-[#F2A649]', // 수 - amber
    'bg-[#F2B949]', // 목 - gold
    'bg-[#EDD377]', // 금 - light gold
    'bg-[#D4D977]', // 토 - yellow-green
    'bg-[#B8D977]', // 일 - light green (highlighted/last)
  ]

  const days = ['월', '화', '수', '목', '금', '토', '일']

  return (
    <div className="flex flex-col items-center justify-center w-full">
      {/* Upper visual: Yellow circle with flame and "7" badge */}
      <div className="relative mb-6">
        {/* Main yellow circle */}
        <div className="w-32 h-32 rounded-full bg-[#F2D949] flex items-center justify-center shadow-lg">
          {/* Fire icon */}
          <span className="text-5xl" style={{ marginTop: '-4px' }}>🔥</span>
        </div>

        {/* "7" badge at bottom of circle */}
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
          <div className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center">
            <span className="text-xl font-bold text-gray-800">7</span>
          </div>
        </div>
      </div>

      {/* Compact week view - styled like reference image */}
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-3 w-full max-w-[280px] shadow-lg">
        <div className="flex justify-between gap-1.5">
          {days.map((day, index) => (
            <div key={index} className="flex flex-col items-center gap-1">
              {/* Day label */}
              <span className="text-[10px] font-semibold text-gray-500">
                {day}
              </span>
              {/* Colored square with checkmark */}
              <div
                className={`w-8 h-8 rounded-lg ${dayColors[index]} flex items-center justify-center ${
                  index === days.length - 1 ? 'ring-2 ring-white ring-offset-1' : ''
                }`}
              >
                <AppIcon name="check" className="w-3 h-3 text-white" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
