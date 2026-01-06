'use client'

import { useState, useMemo } from 'react'
import { format, isSameMonth, isToday, startOfMonth, addMonths, subMonths } from 'date-fns'
import { ko, enUS } from 'date-fns/locale'
import { AppIcon } from '@/components/ui/app-icon'
import { useMonthData } from '@/hooks/use-month-data'
import { getCalendarDays, formatDateString } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { getDictionarySync, type Locale } from '@/lib/i18n'

interface MonthViewProps {
  locale: Locale
  onSelectDate: (date: string) => void
}

const WEEKDAYS_KO = ['월', '화', '수', '목', '금', '토', '일']
const WEEKDAYS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function MonthView({ locale, onSelectDate }: MonthViewProps) {
  const dict = getDictionarySync(locale)
  const dateLocale = locale === 'ko' ? ko : enUS
  const WEEKDAYS = locale === 'ko' ? WEEKDAYS_KO : WEEKDAYS_EN

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

  // Calculate stats
  const stats = useMemo(() => {
    let totalEntries = 0
    let streak = 0
    let currentStreak = 0
    let topMood = '😊'

    monthData.forEach((data) => {
      if (data.praiseCount > 0 || data.thumbUrl) {
        totalEntries++
        currentStreak++
        if (currentStreak > streak) streak = currentStreak
      } else {
        currentStreak = 0
      }
    })

    return { totalEntries, streak, topMood }
  }, [monthData])

  // Get top moments (using thumbUrl for the list)
  const topMoments = useMemo(() => {
    const defaultCaption = locale === 'ko' ? '아름다운 순간' : 'Beautiful moment'
    const moments: { date: string; thumbUrl: string; caption: string }[] = []
    monthData.forEach((data, dateStr) => {
      if (data.thumbUrl) {
        moments.push({
          date: dateStr,
          thumbUrl: data.thumbUrl,
          caption: data.caption || defaultCaption,
        })
      }
    })
    return moments.slice(0, 3)
  }, [monthData, locale])

  const goToPrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1))
  }

  const monthName = format(currentMonth, 'MMMM', { locale: dateLocale })
  const highlightsTitle = locale === 'ko'
    ? `${format(currentMonth, 'M월', { locale: dateLocale })} 하이라이트`
    : `${monthName} Highlights`

  return (
    <div>
      {/* Month Navigation - matches reference: prev/next + "Month Year" centered */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={goToPrevMonth}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/60 transition-colors"
          >
            <AppIcon name="chevron-left" className="w-5 h-5 text-gray-600" />
          </button>

          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-800">
              {format(currentMonth, locale === 'ko' ? 'yyyy년 MMMM' : 'MMMM yyyy', { locale: dateLocale })}
            </h2>
          </div>

          <button
            onClick={goToNextMonth}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/60 transition-colors"
          >
            <AppIcon name="chevron-right" className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Calendar Grid - matches reference: Mon-Sun columns */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg mb-6">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-semibold text-gray-500 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
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
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Month Stats - matches reference: gradient bg with stats */}
      <div className="bg-gradient-to-br from-[#F2B949] to-[#F27430] rounded-2xl p-6 shadow-xl mb-6">
        <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
          <AppIcon name="bar-chart" className="w-5 h-5" />
          {highlightsTitle}
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center bg-white/20 backdrop-blur-sm rounded-xl p-4">
            <p className="text-4xl font-bold text-white mb-1">{stats.totalEntries}</p>
            <p className="text-xs text-white/90 font-medium">{dict.calendar.totalDays}</p>
          </div>
          <div className="text-center bg-white/20 backdrop-blur-sm rounded-xl p-4">
            <p className="text-4xl font-bold text-white mb-1">{stats.streak}</p>
            <p className="text-xs text-white/90 font-medium">{dict.calendar.dayStreak}</p>
          </div>
          <div className="text-center bg-white/20 backdrop-blur-sm rounded-xl p-4">
            <p className="text-4xl mb-1">{stats.topMood}</p>
            <p className="text-xs text-white/90 font-medium">{dict.calendar.topMood}</p>
          </div>
        </div>
      </div>

      {/* Top Moments - matches reference layout */}
      {topMoments.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-lg">
          <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <AppIcon name="star" className="w-4 h-4 text-yellow-500" />
            {dict.calendar.topMoments}
          </h3>
          <div className="space-y-3">
            {topMoments.map((moment, index) => {
              const momentDate = new Date(moment.date)
              return (
                <button
                  key={moment.date}
                  onClick={() => onSelectDate(moment.date)}
                  className={cn(
                    'w-full flex gap-3 items-center p-3 rounded-xl transition-colors',
                    index === 0 && 'bg-gradient-to-r from-amber-50 to-orange-50',
                    index === 1 && 'bg-gradient-to-r from-yellow-50 to-amber-50',
                    index === 2 && 'bg-gradient-to-r from-orange-50 to-yellow-50'
                  )}
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={moment.thumbUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-xs font-semibold text-gray-800 mb-0.5">
                      {format(momentDate, locale === 'ko' ? 'M월 d일' : 'MMM d', { locale: dateLocale })} - {moment.caption.split(' ').slice(0, 3).join(' ')}
                    </p>
                    <p className="text-xs text-gray-600 truncate">
                      {moment.caption}
                    </p>
                  </div>
                  <AppIcon name="heart" className="w-4 h-4 text-[#F27430] flex-shrink-0" />
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
