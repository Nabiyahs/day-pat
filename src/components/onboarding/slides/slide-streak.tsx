'use client'

/**
 * Slide 2: Streak & Weekly Calendar
 * Design based on daily.html reference - week view cards
 * Visual: Week view showing streak progress
 */
export function SlideStreak() {
  const days = [
    { day: '월', date: 13, hasEntry: true, emoji: '🧘‍♀️' },
    { day: '화', date: 14, hasEntry: true, emoji: '🥗' },
    { day: '수', date: 15, hasEntry: true, emoji: '☕', isToday: true },
    { day: '목', date: 16, hasEntry: true, emoji: '📚' },
    { day: '금', date: 17, hasEntry: true, emoji: '🎨' },
    { day: '토', date: 18, hasEntry: true, emoji: '🌿' },
    { day: '일', date: 19, hasEntry: true, emoji: '💫' },
  ]

  return (
    <div className="flex flex-col items-center justify-center w-full">
      {/* Streak counter */}
      <div className="relative mb-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-5xl">🔥</span>
            <span className="text-6xl font-black text-white drop-shadow-lg">7</span>
          </div>
          <p className="text-white/90 text-xl font-bold">일 연속</p>
        </div>
      </div>

      {/* Mini week view - matches daily.html week view design */}
      <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 w-full max-w-xs">
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => (
            <div
              key={index}
              className={`flex flex-col items-center p-2 rounded-xl transition-all ${
                day.isToday
                  ? 'bg-white shadow-lg scale-105'
                  : day.hasEntry
                  ? 'bg-white/40'
                  : 'bg-white/20'
              }`}
            >
              <span className={`text-[10px] font-bold mb-1 ${
                day.isToday ? 'text-[#F27430]' : 'text-white/80'
              }`}>
                {day.day}
              </span>
              <span className={`text-sm font-bold ${
                day.isToday ? 'text-gray-800' : 'text-white'
              }`}>
                {day.date}
              </span>
              {day.hasEntry && (
                <span className="text-lg mt-1">{day.emoji}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Check marks indicating streak */}
      <div className="flex gap-2 mt-6">
        {[...Array(7)].map((_, i) => (
          <div
            key={i}
            className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center"
          >
            <span className="text-white text-sm">✓</span>
          </div>
        ))}
      </div>
    </div>
  )
}
