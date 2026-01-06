'use client'

import { useState, useMemo } from 'react'
import { format, isToday, startOfWeek, addWeeks, subWeeks, getWeek } from 'date-fns'
import { ko, enUS } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, Heart, Share2 } from 'lucide-react'
import { useWeekData } from '@/hooks/use-week-data'
import { getWeekDays, formatDateString } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { getDictionarySync, type Locale } from '@/lib/i18n'

interface WeekViewProps {
  locale: Locale
  onSelectDate: (date: string) => void
}

const WEEKDAYS_KO = ['월', '화', '수', '목', '금', '토', '일']
const WEEKDAYS_EN = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

// Gradient pairs for each day - amber/orange theme
const DAY_GRADIENTS = [
  { from: 'from-[#F2B949]', to: 'to-[#EDD377]', border: 'border-[#F2B949]', text: 'text-[#F27430]' },
  { from: 'from-[#EDD377]', to: 'to-[#F2E829]', border: 'border-[#EDD377]', text: 'text-[#F27430]' },
  { from: 'from-amber-100', to: 'to-yellow-100', border: 'border-amber-200', text: 'text-amber-600' },
  { from: 'from-yellow-100', to: 'to-orange-100', border: 'border-yellow-200', text: 'text-yellow-600' },
  { from: 'from-orange-100', to: 'to-amber-100', border: 'border-orange-200', text: 'text-orange-600' },
  { from: 'from-amber-200', to: 'to-yellow-200', border: 'border-amber-300', text: 'text-amber-700' },
  { from: 'from-yellow-200', to: 'to-orange-200', border: 'border-yellow-300', text: 'text-yellow-700' },
]

export function WeekView({ locale, onSelectDate }: WeekViewProps) {
  const dict = getDictionarySync(locale)
  const dateLocale = locale === 'ko' ? ko : enUS
  const WEEKDAYS = locale === 'ko' ? WEEKDAYS_KO : WEEKDAYS_EN

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

  const weekTitle = locale === 'ko' ? `${weekNumber}주차` : `Week ${weekNumber}`

  return (
    <div>
      {/* Week Navigation - matches reference: prev/next + "Week N" title + date range */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={goToPrevWeek}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/60 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>

          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-800">{weekTitle}</h2>
            <p className="text-sm text-gray-500">
              {format(weekDays[0], 'MMM d', { locale: dateLocale })} - {format(weekDays[6], 'MMM d, yyyy', { locale: dateLocale })}
            </p>
          </div>

          <button
            onClick={goToNextWeek}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/60 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Week Cards - matches reference design with elaborate styling */}
      <div className="space-y-3">
        {weekDays.map((date, index) => {
          const dateStr = formatDateString(date)
          const dayData = weekData.get(dateStr)
          const isCurrentDay = isToday(date)
          const hasEntry = dayData && (dayData.photoUrl || dayData.praiseCount > 0)
          const gradient = DAY_GRADIENTS[index]

          // Current day (today) - special highlighted styling
          if (isCurrentDay && hasEntry) {
            return (
              <button
                key={dateStr}
                onClick={() => onSelectDate(dateStr)}
                className="w-full bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl shadow-lg overflow-hidden border-2 border-[#F2B949]"
              >
                <div className="flex items-stretch">
                  <div className="w-20 bg-gradient-to-br from-[#F2B949] to-[#F27430] flex flex-col items-center justify-center p-3 border-r-2 border-[#F27430]">
                    <p className="text-xs font-bold text-white mb-1">{WEEKDAYS[index]}</p>
                    <p className="text-3xl font-bold text-white">{date.getDate()}</p>
                    <div className="mt-1 w-2 h-2 bg-white rounded-full" />
                  </div>
                  <div className="flex-1 p-4 bg-white/60">
                    <div className="h-[160px] rounded-xl overflow-hidden mb-3 relative">
                      {dayData?.photoUrl ? (
                        <>
                          <img
                            src={dayData.photoUrl}
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
                            {dict.calendar.today}
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                          <Plus className="w-8 h-8 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 font-medium leading-relaxed mb-2 line-clamp-2">
                      {dayData?.caption || dict.calendar.addReflection}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#F27430] font-semibold">
                        {dayData?.time || dict.calendar.justNow}
                      </span>
                      <div className="flex gap-2">
                        <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-100 hover:bg-amber-200 transition-colors">
                          <Heart className="w-4 h-4 text-[#F27430]" />
                        </div>
                        <div className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-amber-50 transition-colors">
                          <Share2 className="w-4 h-4 text-[#F27430]" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            )
          }

          // Regular day with entry
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
                    'w-20 bg-gradient-to-br flex flex-col items-center justify-center p-3 border-r-2',
                    gradient.from, gradient.to, gradient.border
                  )}>
                    <p className={cn('text-xs font-bold mb-1', gradient.text)}>{WEEKDAYS[index]}</p>
                    <p className="text-3xl font-bold text-gray-800">{date.getDate()}</p>
                  </div>
                  <div className="flex-1 p-4">
                    <div className="h-[160px] rounded-xl overflow-hidden mb-3 relative">
                      {dayData?.photoUrl ? (
                        <>
                          <img
                            src={dayData.photoUrl}
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
                          <Plus className="w-8 h-8 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 font-medium leading-relaxed mb-2 line-clamp-2">
                      {dayData?.caption || dict.calendar.addReflection}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">
                        {dayData?.time || ''}
                      </span>
                      <div className="flex gap-2">
                        <div className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-amber-50 transition-colors">
                          <Heart className="w-4 h-4 text-[#F27430]" />
                        </div>
                        <div className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-amber-50 transition-colors">
                          <Share2 className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            )
          }

          // Empty day - matches reference: dashed border, muted colors
          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className={cn(
                'w-full bg-white/60 rounded-2xl p-4 border-2 border-dashed border-gray-300',
                isCurrentDay && 'ring-2 ring-[#F2B949]'
              )}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="text-center">
                  <p className="text-xs text-gray-400 font-medium">{WEEKDAYS[index]}</p>
                  <p className="text-2xl font-bold text-gray-400">{date.getDate()}</p>
                </div>
                <div className="flex-1 h-[100px] rounded-xl bg-gray-100 flex items-center justify-center">
                  <Plus className="w-8 h-8 text-gray-300" />
                </div>
              </div>
              <p className="text-sm text-gray-400">{dict.calendar.noEntry}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
