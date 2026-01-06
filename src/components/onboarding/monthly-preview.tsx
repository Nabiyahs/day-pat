'use client'

// Monthly view preview component - matches reference/monthly.html
export function MonthlyPreview() {
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
          <span className="px-3 py-1 rounded-full text-[10px] font-semibold bg-white/60 text-gray-600">Day</span>
          <span className="px-3 py-1 rounded-full text-[10px] font-semibold bg-white/60 text-gray-600">Week</span>
          <span className="px-3 py-1 rounded-full text-[10px] font-semibold bg-pink-500 text-white">Month</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">&lt;</span>
          <p className="text-xs font-bold text-gray-800">January 2025</p>
          <span className="text-gray-400 text-sm">&gt;</span>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white/80 backdrop-blur-sm rounded-lg p-2">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
              <div key={i} className="text-center text-[8px] font-semibold text-gray-500 py-0.5">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days - simplified grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {/* Empty cells for alignment */}
            {[...Array(2)].map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square bg-gray-50 rounded" />
            ))}

            {/* Days 1-15 with some having images */}
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((day) => {
              const hasImage = [4, 6, 8, 10, 12, 13, 14, 15].includes(day)
              const isToday = day === 15

              const imageUrls: Record<number, string> = {
                4: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/06c4d59883-ce5ce94d6ad46c42ee8e.png',
                6: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/5ec6adb291-19a4f27becd9bf81891a.png',
                8: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/7d5f2711ea-308301cb34fc01259450.png',
                10: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/bbd9a37480-db910cb1c5c32661b40c.png',
                12: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/3fef0312cc-ac35f49b2c70e143e772.png',
                13: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/ea32fb5053-f4123dab51535d78b2ac.png',
                14: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/011a105c86-64ea07166049e1017e9a.png',
                15: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/13dfd0edd7-1248a08cd0625d7d2cb8.png',
              }

              return (
                <div
                  key={day}
                  className={`aspect-square rounded relative overflow-hidden ${
                    isToday ? 'ring-1 ring-pink-400 ring-offset-1' : ''
                  } ${hasImage ? '' : 'bg-gray-50'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 text-[6px] font-semibold z-10 ${
                    hasImage ? 'text-white drop-shadow' : 'text-gray-700'
                  }`}>
                    {day}
                  </span>
                  {hasImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrls[day]}
                      alt={`Day ${day}`}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              )
            })}

            {/* Remaining days - gray */}
            {[16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31].map((day) => (
              <div key={day} className="aspect-square bg-gray-50 rounded relative">
                <span className="absolute top-0.5 left-0.5 text-[6px] font-semibold text-gray-400">{day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats Card */}
        <div className="mt-2 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg p-2">
          <p className="text-[8px] font-bold text-white mb-1">January Highlights</p>
          <div className="grid grid-cols-3 gap-1">
            <div className="text-center bg-white/20 backdrop-blur-sm rounded p-1">
              <p className="text-sm font-bold text-white">12</p>
              <p className="text-[6px] text-white/90">Days</p>
            </div>
            <div className="text-center bg-white/20 backdrop-blur-sm rounded p-1">
              <p className="text-sm font-bold text-white">8</p>
              <p className="text-[6px] text-white/90">Streak</p>
            </div>
            <div className="text-center bg-white/20 backdrop-blur-sm rounded p-1">
              <p className="text-sm">😊</p>
              <p className="text-[6px] text-white/90">Mood</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
