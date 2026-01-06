'use client'

import Image from 'next/image'

/**
 * Slide 1: Daily Praise Polaroid
 * Design based on daily.html reference - warm amber/yellow theme
 * Visual: Polaroid card with intro-1.jpg photo and compliment-seal.jpg stamp
 * Optimized for mobile: fits on 6.3-inch screen without scrolling
 */
export function SlidePraise() {
  return (
    <div className="flex flex-col items-center justify-center w-full">
      {/* Polaroid Card - compact version for mobile */}
      <div className="relative">
        {/* Main Polaroid Frame - reduced size for mobile fit */}
        <div className="bg-white rounded-2xl shadow-xl p-3 transform rotate-[-2deg] w-56">
          {/* Photo area - uses intro-1.jpg - reduced height */}
          <div className="rounded-xl overflow-hidden mb-2 relative h-44">
            <Image
              src="/intro-1.jpg"
              alt="오늘의 기록"
              fill
              className="object-cover"
              priority
            />

            {/* Stickers overlay - top right */}
            <div className="absolute top-2 right-2 flex gap-1 z-10">
              <span className="text-lg drop-shadow-md">☕</span>
              <span className="text-lg drop-shadow-md">✨</span>
            </div>
          </div>

          {/* Caption area - compact */}
          <div className="px-1">
            <p className="text-gray-700 text-center font-medium leading-snug mb-2 text-xs">
              오늘도 무사히
              <br />
              출근했어요
            </p>
            <div className="flex items-center justify-between text-[10px] text-gray-400">
              <span>3:42 PM</span>
              <span className="text-[#F27430]">♥</span>
            </div>
          </div>
        </div>

        {/* "참 잘했어요" Stamp - Using compliment-seal.jpg - smaller */}
        <div className="absolute -top-4 -right-4 transform rotate-[12deg] z-20">
          <div className="w-16 h-16 rounded-full overflow-hidden shadow-lg">
            <Image
              src="/compliment-seal.jpg"
              alt="참 잘했어요"
              width={64}
              height={64}
              className="w-full h-full object-cover"
              priority
            />
          </div>
        </div>

        {/* Decorative sparkles - smaller and repositioned */}
        <div className="absolute -left-5 top-1/4 text-xl opacity-70 animate-pulse">✨</div>
        <div className="absolute -right-6 bottom-1/4 text-lg opacity-60">⭐</div>
      </div>
    </div>
  )
}
