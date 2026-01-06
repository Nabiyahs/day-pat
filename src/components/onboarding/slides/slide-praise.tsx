'use client'

import Image from 'next/image'

/**
 * Slide 1: Daily Praise Polaroid
 * Design based on daily.html reference - warm amber/yellow theme
 * Visual: Polaroid card with intro-1.jpg photo and compliment-seal.jpg stamp
 */
export function SlidePraise() {
  return (
    <div className="flex flex-col items-center justify-center w-full">
      {/* Polaroid Card - matches daily.html #polaroidCard styling */}
      <div className="relative">
        {/* Main Polaroid Frame */}
        <div className="bg-white rounded-3xl shadow-2xl p-5 transform rotate-[-2deg] w-72">
          {/* Photo area - uses intro-1.jpg */}
          <div className="rounded-2xl overflow-hidden mb-4 relative h-64">
            <Image
              src="/intro-1.jpg"
              alt="오늘의 기록"
              fill
              className="object-cover"
              priority
            />

            {/* Stickers overlay - top right like in daily.html */}
            <div className="absolute top-3 right-3 flex gap-2 z-10">
              <span className="text-2xl drop-shadow-md">☕</span>
              <span className="text-2xl drop-shadow-md">✨</span>
            </div>
          </div>

          {/* Caption area */}
          <div className="px-2">
            <p className="text-gray-700 text-center font-medium leading-relaxed mb-3 text-sm">
              작은 성취를 기록하고
              <br />
              나를 칭찬해보세요
            </p>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>3:42 PM</span>
              <div className="flex gap-3">
                <span className="text-[#F27430]">♥</span>
              </div>
            </div>
          </div>
        </div>

        {/* "참 잘했어요" Stamp - Using compliment-seal.jpg */}
        <div className="absolute -top-6 -right-6 transform rotate-[12deg] z-20">
          <div className="w-24 h-24 rounded-full overflow-hidden shadow-xl">
            <Image
              src="/compliment-seal.jpg"
              alt="참 잘했어요"
              width={96}
              height={96}
              className="w-full h-full object-cover"
              priority
            />
          </div>
        </div>

        {/* Decorative sparkles */}
        <div className="absolute -left-8 top-1/3 text-3xl opacity-70 animate-pulse">✨</div>
        <div className="absolute -right-10 bottom-1/4 text-2xl opacity-60">⭐</div>
      </div>
    </div>
  )
}
