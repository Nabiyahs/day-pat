'use client'

import { useState, useMemo } from 'react'
import { format, isSameMonth, isToday, startOfMonth, addMonths, subMonths } from 'date-fns'
import { AppIcon } from '@/components/ui/app-icon'
import { useMonthData } from '@/hooks/use-month-data'
import { getCalendarDays, formatDateString } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface MonthViewProps {
  onSelectDate: (date: string) => void
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function MonthView({ onSelectDate }: MonthViewProps) {

  const [currentMonth, setCurrentMonth] = useState(new Date())

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const { data: monthData, loading } = useMonthData(year, month)

  // Get calendar days starting from Monday
  const calendarDays = useMemo(() => {
    const firstDay = startOfMonth(new Date(year, month, 1))
    const days: Date[] = []

    // Get the day of week for the first day (0 = Sunday, 1 = Monday, etc.)
    let dayOfWeek = firstDay.getDay()
    // Convert to Monday-based (0 = Monday, 6 = Sunday)
    dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1

    // Add empty days for the beginning of the calendar
    for (let i = 0; i < dayOfWeek; i++) {
      days.push(new Date(year, month, -(dayOfWeek - i - 1)))
    }

    // Add days of the month
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }

    // Fill remaining days to complete the grid
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      days.push(new Date(year, month + 1, i))
    }

    return days
  }, [year, month])

  const goToPrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1))
  }

  return (
    <div>
      {/* Month Navigation - matches reference: prev/next + "Month Year" centered */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={goToPrevMonth}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/60 transition-colors"
            aria-label="Previous month"
            data-testid="btn-month-prev"
          >
            <AppIcon name="chevron-left" className="w-5 h-5 text-gray-600" />
          </button>

          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-800" data-testid="month-title">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
          </div>

          <button
            onClick={goToNextMonth}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/60 transition-colors"
            aria-label="Next month"
            data-testid="btn-month-next"
          >
            <AppIcon name="chevron-right" className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Calendar Grid - matches reference: Mon-Sun columns */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-lg">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-2 mb-3">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="text-center text-sm font-semibold text-gray-500 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((date, index) => {
            const dateStr = formatDateString(date)
            const isCurrentMonth = isSameMonth(date, currentMonth)
            const dayData = monthData.get(dateStr)
            const isCurrentDay = isToday(date)
            const hasPhoto = dayData?.thumbUrl && isCurrentMonth

            // Empty placeholder for non-month days at the beginning
            if (!isCurrentMonth && index < 7) {
              return (
                <div key={index} className="aspect-square bg-gray-50 rounded-lg" />
              )
            }

            // Non-month days at the end
            if (!isCurrentMonth) {
              return (
                <div key={index} className="aspect-square bg-gray-50 rounded-lg p-0.5 relative opacity-40">
                  <span className="absolute top-1 left-1 text-[10px] font-semibold text-gray-400 z-10">
                    {date.getDate()}
                  </span>
                </div>
              )
            }

            // Current month days
            return (
              <button
                key={index}
                onClick={() => onSelectDate(dateStr)}
                className={cn(
                  'aspect-square rounded-lg p-0.5 relative overflow-hidden transition-all',
                  hasPhoto ? '' : 'bg-gray-50',
                  isCurrentDay && hasPhoto && 'ring-2 ring-[#F2B949] ring-offset-2',
                  isCurrentDay && !hasPhoto && 'ring-2 ring-[#F2B949]',
                  !isCurrentDay && 'hover:ring-1 hover:ring-amber-200'
                )}
                data-testid={`cell-date-${dateStr}`}
                aria-label={format(date, 'MMMM d')}
              >
                {/* Date number */}
                <span
                  className={cn(
                    'absolute top-1 left-1 text-[10px] font-semibold z-10',
                    hasPhoto
                      ? 'text-white font-bold drop-shadow-lg'
                      : dayData?.praiseCount && dayData.praiseCount > 0
                      ? 'text-gray-700'
                      : 'text-gray-400'
                  )}
                >
                  {date.getDate()}
                </span>

                {/* Photo thumbnail (using thumb_url only - never load original in calendar) */}
                {hasPhoto && dayData?.thumbUrl && (
                  <img
                    src={dayData.thumbUrl}
                    alt=""
                    className="w-full h-full object-cover rounded-lg"
                    loading="lazy"
                  />
                )}

                {/* Sticker indicator on photo cells */}
                {hasPhoto && dayData.stickers && dayData.stickers.length > 0 && (
                  <div className="absolute bottom-1 right-1">
                    <span className="text-xs">{dayData.stickers[0]}</span>
                  </div>
                )}

                {/* Loading shimmer */}
                {loading && isCurrentMonth && (
                  <div className="absolute inset-0 bg-white/50 animate-pulse" />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
