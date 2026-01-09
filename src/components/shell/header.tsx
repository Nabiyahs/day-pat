'use client'

interface HeaderProps {
  onLogoClick?: () => void
}

// Header matches main.html: Only centered "DayPat" title, no buttons
// Compact vertical padding for better screen real estate on mobile
// Logo is clickable to navigate to today's day view
export function Header({ onLogoClick }: HeaderProps) {
  return (
    <div className="flex items-center justify-center px-5 py-2">
      <button
        onClick={onLogoClick}
        className="text-[23px] font-bold text-[#F27430] hover:opacity-80 active:scale-95 transition-all"
        style={{ fontFamily: "'Caveat', cursive" }}
      >
        DayPat
      </button>
    </div>
  )
}
