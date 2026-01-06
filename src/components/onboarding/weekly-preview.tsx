'use client'

// Weekly view preview component - matches reference/weekly.html
export function WeeklyPreview() {
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
          <span className="px-3 py-1 rounded-full text-[10px] font-semibold bg-pink-500 text-white">Week</span>
          <span className="px-3 py-1 rounded-full text-[10px] font-semibold bg-white/60 text-gray-600">Month</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Week Navigation */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-gray-400 text-sm">&lt;</span>
          <div className="text-center">
            <p className="text-xs font-bold text-gray-800">Week 3</p>
            <p className="text-[10px] text-gray-500">Jan 13 - Jan 19, 2025</p>
          </div>
          <span className="text-gray-400 text-sm">&gt;</span>
        </div>

        {/* Week Cards - simplified */}
        <div className="space-y-2">
          {/* Monday */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="flex items-stretch">
              <div className="w-12 bg-gradient-to-br from-pink-100 to-purple-100 flex flex-col items-center justify-center p-1 border-r border-pink-200">
                <p className="text-[8px] font-bold text-pink-600">MON</p>
                <p className="text-sm font-bold text-gray-800">13</p>
              </div>
              <div className="flex-1 p-2 flex gap-2">
                <div className="w-16 h-12 rounded-lg overflow-hidden flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://storage.googleapis.com/uxpilot-auth.appspot.com/df82fafb81-e691c7ae868ff48609ca.png"
                    alt="Yoga"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] text-gray-700 line-clamp-2">Morning yoga session 🧘‍♀️✨</p>
                </div>
              </div>
            </div>
          </div>

          {/* Today - Wednesday */}
          <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-lg shadow-sm overflow-hidden border border-pink-300">
            <div className="flex items-stretch">
              <div className="w-12 bg-gradient-to-br from-pink-200 to-pink-300 flex flex-col items-center justify-center p-1 border-r border-pink-400">
                <p className="text-[8px] font-bold text-pink-700">WED</p>
                <p className="text-sm font-bold text-pink-700">15</p>
                <div className="w-1 h-1 bg-pink-600 rounded-full mt-0.5" />
              </div>
              <div className="flex-1 p-2 bg-white/60 flex gap-2">
                <div className="w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://storage.googleapis.com/uxpilot-auth.appspot.com/085a115998-cbb43d62b37ed7285cf1.png"
                    alt="Coffee"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-0.5 left-0.5 bg-pink-600 text-white text-[6px] font-bold px-1 rounded-full">Today</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] text-gray-700 line-clamp-2">Morning coffee ☕✨</p>
                </div>
              </div>
            </div>
          </div>

          {/* Thursday - Empty */}
          <div className="bg-white/60 rounded-lg border border-dashed border-gray-300 p-2">
            <div className="flex items-center gap-2">
              <div className="text-center w-8">
                <p className="text-[8px] text-gray-400">THU</p>
                <p className="text-sm font-bold text-gray-400">16</p>
              </div>
              <div className="flex-1 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <span className="text-gray-300 text-lg">+</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
