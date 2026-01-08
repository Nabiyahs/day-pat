'use client'

// Header matches main.html: Only centered "DayPat" title, no buttons
// Compact vertical padding for better screen real estate on mobile
export function Header() {
  return (
    <div className="flex items-center justify-center px-5 py-2">
      <h1
        className="text-[23px] font-bold text-gray-800"
        style={{ fontFamily: "'Caveat', cursive" }}
      >
        DayPat
      </h1>
    </div>
  )
}
