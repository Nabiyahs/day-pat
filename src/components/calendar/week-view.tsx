'use client'

import { useState, useMemo } from 'react'
import { format, isToday, startOfWeek, addWeeks, subWeeks, getWeek } from 'date-fns'
import { AppIcon } from '@/components/ui/app-icon'
import { useWeekData } from '@/hooks/use-week-data'
import { getWeekDays, formatDateString } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface WeekViewProps {
  onSelectDate: (date: string) => void
}

const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

/**
 * Weekly solid color mapping: Mon (light) → Sun (deep red)
 * Formula: Each day index (0-6) maps to progressively deeper red tones
 * Mon=0 (nearly white) ... Sun=6 (deep red)
 */
const WEEKDAY_COLORS = [
  // Monday (index 0) - Near white / very light pink
  { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-500' },
  // Tuesday (index 1) - Very light red
  { bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-400' },
  // Wednesday (index 2) - Light red
  { bg: 'bg-red-100', border: 'border-red-200', text: 'text-red-500' },
  // Thursday (index 3) - Medium light red
  { bg: 'bg-red-200', border: 'border-red-300', text: 'text-red-600' },
  // Friday (index 4) - Medium red
  { bg: 'bg-red-300', border: 'border-red-400', text: 'text-red-600' },
  // Saturday (index 5) - Medium deep red
  { bg: 'bg-red-400', border: 'border-red-500', text: 'text-white' },
  // Sunday (index 6) - Deep red
  { bg: 'bg-red-500', border: 'border-red-600', text: 'text-white' },
]

export function WeekView({ onSelectDate }: WeekViewProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )

  const { data: weekData, loading } = useWeekData(currentWeekStart)
  const weekDays = useMemo(() => getWeekDays(currentWeekStart), [currentWeekStart])
  const weekNumber = getWeek(currentWeekStart, { weekStartsOn: 1 })

  const goToPrevWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1))
  }

  const goToNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1))
  }

  const weekTitle = `Week ${weekNumber}`

  return (
    <div>
      {/* Week Navigation */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={goToPrevWeek}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/60 transition-colors"
          >
            <AppIcon name="chevron-left" className="w-5 h-5 text-gray-600" />
          </button>

          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-800">{weekTitle}</h2>
            <p className="text-sm text-gray-500">
              {format(weekDays[0], 'MMM d')} - {format(weekDays[6], 'MMM d, yyyy')}
            </p>
          </div>

          <button
            onClick={goToNextWeek}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/60 transition-colors"
          >
            <AppIcon name="chevron-right" className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Week Cards with Mon→Sun colors (light to deep red) */}
      <div className="space-y-3">
        {weekDays.map((date, index) => {
          const dateStr = formatDateString(date)
          const dayData = weekData.get(dateStr)
          const isCurrentDay = isToday(date)
          const hasEntry = dayData && (dayData.thumbUrl || dayData.praiseCount > 0)
          const colors = WEEKDAY_COLORS[index]
          // Text color for date: use white for darker backgrounds (Sat, Sun)
          const dateTextColor = index >= 5 ? 'text-white' : 'text-gray-800'
          const weekdayTextColor = index >= 5 ? 'text-white/90' : colors.text

          // Current day (today) - special highlighted styling
          if (isCurrentDay && hasEntry) {
            return (
              <button
                key={dateStr}
                onClick={() => onSelectDate(dateStr)}
                className="w-full bg-amber-50 rounded-2xl shadow-lg overflow-hidden border-2 border-[#F2B949]"
              >
                <div className="flex items-stretch">
                  <div className="w-20 bg-[#F2B949] flex flex-col items-center justify-center p-3 border-r-2 border-[#F27430] rounded-l-xl">
                    <p className="text-3xl font-bold text-white">{date.getDate()}</p>
                    <p className="text-xs font-bold text-white mt-1">{WEEKDAYS[index]}</p>
                    <div className="mt-1 w-2 h-2 bg-white rounded-full" />
                  </div>
                  <div className="flex-1 p-4 bg-white/60">
                    <div className="h-[160px] rounded-xl overflow-hidden mb-3 relative">
                      {dayData?.thumbUrl ? (
                        <>
                          <img
                            src={dayData.thumbUrl}
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          {dayData.stickers && dayData.stickers.length > 0 && (
                            <div className="absolute top-2 right-2 flex gap-1">
                              {dayData.stickers.slice(0, 2).map((emoji, i) => (
                                <span key={i} className="text-2xl drop-shadow">{emoji}</span>
                              ))}
                            </div>
                          )}
                          <div className="absolute top-2 left-2 bg-[#F27430] text-white text-xs font-bold px-2 py-1 rounded-full">
                            Today
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                          <AppIcon name="plus" className="w-8 h-8 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 font-medium leading-relaxed mb-2 line-clamp-2">
                      {dayData?.caption || 'Add a reflection...'}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#F27430] font-semibold">
                        {dayData?.time || 'Just now'}
                      </span>
                      <div className="flex gap-2">
                        <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-100 hover:bg-amber-200 transition-colors">
                          <AppIcon name="heart" className="w-4 h-4 text-[#F27430]" />
                        </div>
                        <div className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-amber-50 transition-colors">
                          <AppIcon name="share" className="w-4 h-4 text-[#F27430]" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            )
          }

          // Regular day with entry - using solid color based on weekday
          if (hasEntry) {
            return (
              <button
                key={dateStr}
                onClick={() => onSelectDate(dateStr)}
                className={cn(
                  'w-full bg-white rounded-2xl shadow-lg overflow-hidden',
                  isCurrentDay && 'ring-2 ring-[#F2B949]'
                )}
              >
                <div className="flex items-stretch">
                  <div className={cn(
                    'w-20 flex flex-col items-center justify-center p-3 border-r-2 rounded-l-xl',
                    colors.bg, colors.border
                  )}>
                    <p className={cn('text-3xl font-bold', dateTextColor)}>{date.getDate()}</p>
                    <p className={cn('text-xs font-bold mt-1', weekdayTextColor)}>{WEEKDAYS[index]}</p>
                  </div>
                  <div className="flex-1 p-4">
                    <div className="h-[160px] rounded-xl overflow-hidden mb-3 relative">
                      {dayData?.thumbUrl ? (
                        <>
                          <img
                            src={dayData.thumbUrl}
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          {dayData.stickers && dayData.stickers.length > 0 && (
                            <div className="absolute top-2 right-2 flex gap-1">
                              {dayData.stickers.slice(0, 2).map((emoji, i) => (
                                <span key={i} className="text-2xl drop-shadow">{emoji}</span>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                          <AppIcon name="plus" className="w-8 h-8 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 font-medium leading-relaxed mb-2 line-clamp-2">
                      {dayData?.caption || 'Add a reflection...'}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">
                        {dayData?.time || ''}
                      </span>
                      <div className="flex gap-2">
                        <div className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-amber-50 transition-colors">
                          <AppIcon name="heart" className="w-4 h-4 text-[#F27430]" />
                        </div>
                        <div className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-amber-50 transition-colors">
                          <AppIcon name="share" className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            )
          }

          // Empty day - with solid background hint
          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className={cn(
                'w-full bg-white/60 rounded-2xl p-4 border-2 border-dashed border-gray-300',
                isCurrentDay && 'ring-2 ring-[#F2B949]'
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn('text-center p-2 rounded-xl', colors.bg)}>
                  <p className={cn('text-2xl font-bold', dateTextColor)}>{date.getDate()}</p>
                  <p className={cn('text-xs font-medium', weekdayTextColor)}>{WEEKDAYS[index]}</p>
                </div>
                <div className="flex-1 h-[100px] rounded-xl bg-gray-100 flex items-center justify-center">
                  <AppIcon name="plus" className="w-8 h-8 text-gray-300" />
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
