'use client'

import { useState, useMemo } from 'react'
import { format, isSameMonth, isToday, startOfMonth, addMonths, subMonths } from 'date-fns'
import { AppIcon } from '@/components/ui/app-icon'
import { useMonthData } from '@/hooks/use-month-data'
import { formatDateString } from '@/lib/utils'
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

  // Get calendar days starting from Monday (only include necessary weeks)
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

    // Only fill to complete the last week (not always 6 weeks)
    const remaining = (7 - (days.length % 7)) % 7
    for (let i = 1; i <= remaining; i++) {
      days.push(new Date(year, month + 1, i))
    }

    return days
  }, [year, month])

  // Calculate number of weeks for grid height
  const numWeeks = Math.ceil(calendarDays.length / 7)

  const goToPrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1))
  }

  return (
    <div>
      {/* Month Navigation */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={goToPrevMonth}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/60 transition-colors"
            aria-label="Previous month"
          >
            <AppIcon name="chevron-left" className="w-5 h-5 text-gray-600" />
          </button>

          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-800">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
          </div>

          <button
            onClick={goToNextMonth}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/60 transition-colors"
            aria-label="Next month"
          >
            <AppIcon name="chevron-right" className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Calendar Grid - matches reference design */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4">
        {/* Weekday Headers */}
        <div
          className="grid gap-0 mb-2"
          style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}
        >
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-semibold text-gray-500 py-2 min-w-0"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days - stable grid with no overlap
            Uses minmax(0, 1fr) to prevent subpixel overflow on mobile
            gap-px with bg as separator prevents double-border issues */}
        <div
          className="grid gap-px bg-gray-100 rounded-xl overflow-hidden"
          style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}
        >
          {calendarDays.map((date, index) => {
            const dateStr = formatDateString(date)
            const isCurrentMonth = isSameMonth(date, currentMonth)
            const dayData = monthData.get(dateStr)
            const isCurrentDay = isToday(date)
            const hasPhoto = dayData?.thumbUrl && isCurrentMonth

            // Cell height class based on number of weeks
            const cellHeight = numWeeks <= 4 ? 'h-16' : numWeeks <= 5 ? 'h-14' : 'h-12'

            // Empty placeholder for non-month days
            if (!isCurrentMonth) {
              return (
                <div
                  key={index}
                  className={cn('min-w-0 bg-gray-50', cellHeight)}
                />
              )
            }

            // Current month days
            return (
              <button
                key={index}
                onClick={() => onSelectDate(dateStr)}
                className={cn(
                  'min-w-0 p-0.5 relative overflow-hidden transition-all box-border',
                  cellHeight,
                  hasPhoto ? 'bg-white' : 'bg-gray-50',
                  !isCurrentDay && 'hover:ring-1 hover:ring-amber-200 hover:ring-inset'
                )}
                aria-label={format(date, 'MMMM d')}
              >
                {/* Today indicator - inset ring that doesn't overlap content */}
                {isCurrentDay && (
                  <div className="absolute inset-[1px] rounded-md border-[1.5px] border-orange-400 z-20 pointer-events-none" />
                )}

                {/* Date number */}
                <span
                  className={cn(
                    'absolute top-1 left-1 text-[10px] z-10',
                    hasPhoto
                      ? 'text-white font-bold drop-shadow'
                      : isCurrentDay
                      ? 'text-orange-600 font-bold'
                      : date < new Date() && !hasPhoto
                      ? 'text-gray-700 font-semibold'
                      : 'text-gray-400 font-semibold'
                  )}
                >
                  {date.getDate()}
                </span>

                {/* Photo thumbnail */}
                {hasPhoto && dayData?.thumbUrl && (
                  <img
                    src={dayData.thumbUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                )}

                {/* Note: Stickers do NOT render in month view - only in Day View */}

                {/* Loading shimmer */}
                {loading && (
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
