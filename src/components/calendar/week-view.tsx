'use client'

import { useState, useMemo } from 'react'
import { format, isToday, startOfWeek, addWeeks, subWeeks, getWeek } from 'date-fns'
import { AppIcon } from '@/components/ui/app-icon'
import { useWeekData } from '@/hooks/use-week-data'
import { getWeekDays, formatDateString } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface WeekViewProps {
  onSelectDate: (date: string) => void
  currentWeekStart?: Date // Controlled mode: anchor date from parent
  onWeekChange?: (weekStart: Date) => void // Callback when week changes
}

const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

export function WeekView({ onSelectDate, currentWeekStart: controlledWeekStart, onWeekChange }: WeekViewProps) {
  const [internalWeekStart, setInternalWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )

  // Use controlled or internal state
  const currentWeekStart = controlledWeekStart ?? internalWeekStart

  const { data: weekData, loading } = useWeekData(currentWeekStart)
  const weekDays = useMemo(() => getWeekDays(currentWeekStart), [currentWeekStart])
  const weekNumber = getWeek(currentWeekStart, { weekStartsOn: 1 })

  const goToPrevWeek = () => {
    const newWeek = subWeeks(currentWeekStart, 1)
    if (onWeekChange) {
      onWeekChange(newWeek)
    } else {
      setInternalWeekStart(newWeek)
    }
  }

  const goToNextWeek = () => {
    const newWeek = addWeeks(currentWeekStart, 1)
    if (onWeekChange) {
      onWeekChange(newWeek)
    } else {
      setInternalWeekStart(newWeek)
    }
  }

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
            <h2 className="text-xl font-bold text-gray-800">Week {weekNumber}</h2>
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

      {/* Week Grid - matches reference design */}
      <div className="space-y-4">
        {weekDays.map((date, index) => {
          const dateStr = formatDateString(date)
          const dayData = weekData.get(dateStr)
          const isCurrentDay = isToday(date)
          const hasEntry = dayData && (dayData.thumbUrl || dayData.caption)

          // Today with entry
          if (isCurrentDay && hasEntry) {
            return (
              <button
                key={dateStr}
                onClick={() => onSelectDate(dateStr)}
                className="w-full bg-white rounded-2xl p-4 shadow-md border-2 border-orange-400 text-left"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-center min-w-[40px]">
                    <p className="text-xs text-orange-600 font-bold">{WEEKDAYS[index]}</p>
                    <p className="text-2xl font-bold text-orange-600">{date.getDate()}</p>
                  </div>
                  <div className="flex-1 h-[100px] rounded-xl overflow-hidden">
                    {dayData?.thumbUrl ? (
                      <img
                        src={dayData.thumbUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <AppIcon name="plus" className="w-8 h-8 text-gray-300" />
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {dayData?.caption || 'Add a reflection...'}
                </p>
              </button>
            )
          }

          // Regular day with entry
          if (hasEntry) {
            return (
              <button
                key={dateStr}
                onClick={() => onSelectDate(dateStr)}
                className="w-full bg-white rounded-2xl p-4 shadow-md text-left"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-center min-w-[40px]">
                    <p className="text-xs text-gray-500 font-medium">{WEEKDAYS[index]}</p>
                    <p className="text-2xl font-bold text-gray-800">{date.getDate()}</p>
                  </div>
                  <div className="flex-1 h-[100px] rounded-xl overflow-hidden">
                    {dayData?.thumbUrl ? (
                      <img
                        src={dayData.thumbUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <AppIcon name="plus" className="w-8 h-8 text-gray-300" />
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {dayData?.caption || 'Add a reflection...'}
                </p>
              </button>
            )
          }

          // Empty day (no entry) - today gets orange border
          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className={cn(
                'w-full bg-white/60 rounded-2xl p-4 border-2 border-dashed border-gray-300 text-left',
                isCurrentDay && 'border-orange-400 border-solid'
              )}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="text-center min-w-[40px]">
                  <p className={cn(
                    'text-xs font-medium',
                    isCurrentDay ? 'text-orange-600 font-bold' : 'text-gray-400'
                  )}>
                    {WEEKDAYS[index]}
                  </p>
                  <p className={cn(
                    'text-2xl font-bold',
                    isCurrentDay ? 'text-orange-600' : 'text-gray-400'
                  )}>
                    {date.getDate()}
                  </p>
                </div>
                <div className="flex-1 h-[100px] rounded-xl bg-gray-100 flex items-center justify-center">
                  <AppIcon name="plus" className="w-8 h-8 text-gray-300" />
                </div>
              </div>
              <p className="text-sm text-gray-400">No entry yet</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
