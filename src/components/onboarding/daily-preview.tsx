'use client'

// Daily view preview component - matches reference-daily.html
export function DailyPreview() {
  return (
    <div className="w-full max-w-[320px] mx-auto bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 rounded-2xl overflow-hidden shadow-xl border border-white/50">
      {/* Mini Header */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-pink-100 px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-pink-50">
            <div className="w-3 h-0.5 bg-pink-600 rounded-full" />
          </div>
          <span className="text-xs font-bold text-gray-800">Praise Journal</span>
          <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-pink-50">
            <span className="text-pink-600 text-sm">+</span>
          </div>
        </div>
        {/* Mini Tabs */}
        <div className="flex items-center justify-center gap-1 mt-2 pb-1">
          <span className="px-3 py-1 rounded-full text-[10px] font-semibold bg-pink-500 text-white">Day</span>
          <span className="px-3 py-1 rounded-full text-[10px] font-semibold bg-white/60 text-gray-600">Week</span>
          <span className="px-3 py-1 rounded-full text-[10px] font-semibold bg-white/60 text-gray-600">Month</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Date Navigation */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-gray-400 text-sm">&lt;</span>
          <div className="text-center">
            <p className="text-sm font-bold text-gray-800">January 15</p>
            <p className="text-[10px] text-gray-500">Monday, 2025</p>
          </div>
          <span className="text-gray-400 text-sm">&gt;</span>
        </div>

        {/* Polaroid Card */}
        <div className="bg-white rounded-xl shadow-lg p-3 transform rotate-[-1deg]">
          <div className="bg-gray-100 rounded-lg overflow-hidden mb-2 relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://storage.googleapis.com/uxpilot-auth.appspot.com/9848b97d68-29d8f31e7e5b8dcb9f5d.png"
              alt="Morning coffee"
              className="w-full h-[140px] object-cover"
            />
            <div className="absolute top-1 right-1 flex gap-0.5">
              <span className="text-lg">☕</span>
              <span className="text-lg">✨</span>
            </div>
          </div>
          <p className="text-[10px] text-gray-700 text-center leading-relaxed mb-1">
            Started my day with gratitude. The simple joy of morning coffee...
          </p>
          <div className="flex items-center justify-between text-[8px] text-gray-400">
            <span>3:42 PM</span>
            <span className="text-pink-400">♡</span>
          </div>
        </div>
      </div>
    </div>
  )
}
