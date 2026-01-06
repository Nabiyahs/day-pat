'use client'

/**
 * Slide 1: Praise & Stamp
 * Background: #EDD377 (warm yellow)
 * Visual: Polaroid with "참 잘했어요" stamp
 */
export function SlidePraise() {
  return (
    <div className="flex flex-col items-center justify-center w-full">
      {/* Polaroid Card */}
      <div className="relative">
        {/* Polaroid Frame */}
        <div className="bg-white rounded-lg shadow-2xl p-3 pb-12 transform rotate-[-2deg]">
          {/* Photo area */}
          <div className="w-56 h-56 bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100 rounded-sm flex items-center justify-center relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-6xl opacity-30">✨</div>
            </div>

            {/* Sample praise text on the photo */}
            <div className="relative z-10 text-center px-4">
              <p className="text-gray-600 text-sm leading-relaxed font-medium">
                오늘 아침에 일찍 일어나서
                <br />
                운동을 했다
              </p>
            </div>
          </div>

          {/* Caption area (typical polaroid style) */}
          <div className="mt-3 text-center">
            <p className="text-gray-400 text-xs">2025.01.06</p>
          </div>
        </div>

        {/* "참 잘했어요" Stamp - positioned on top right of polaroid */}
        <div className="absolute -top-4 -right-4 transform rotate-[15deg]">
          <div className="w-24 h-24 rounded-full border-4 border-red-500 flex items-center justify-center bg-white/90 shadow-lg">
            <div className="text-center">
              <p className="text-red-500 font-bold text-sm leading-tight">참</p>
              <p className="text-red-500 font-bold text-lg leading-tight">잘했어요</p>
            </div>
          </div>
        </div>

        {/* Subtle decorative sparkles */}
        <div className="absolute -left-6 top-1/4 text-2xl opacity-60">✨</div>
        <div className="absolute -right-8 bottom-1/3 text-xl opacity-50">⭐</div>
      </div>
    </div>
  )
}
