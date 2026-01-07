'use client'

import { AppIcon } from '@/components/ui/app-icon'
import { useDayCard } from '@/hooks/use-day-card'
import { formatDateString, parseDateString } from '@/lib/utils'
import { formatDateDisplay, formatWeekdayYear, type Locale } from '@/lib/i18n'
import { PolaroidCard } from './polaroid-card'

interface DayViewProps {
  selectedDate: string
  onDateChange: (date: string) => void
  locale: Locale
  onClose?: () => void
}

export function DayView({ selectedDate, onDateChange, locale }: DayViewProps) {
  const date = parseDateString(selectedDate)
  const dateStr = formatDateString(date)

  const { dayCard, photoSignedUrl, saving: cardSaving, error, upsertDayCard, setEditingState } = useDayCard(dateStr)

  const goToPrevDay = () => {
    const prev = new Date(date)
    prev.setDate(prev.getDate() - 1)
    onDateChange(formatDateString(prev))
  }

  const goToNextDay = () => {
    const next = new Date(date)
    next.setDate(next.getDate() + 1)
    onDateChange(formatDateString(next))
  }

  const handleSave = async (updates: {
    photo_url?: string | null
    caption?: string | null
  }): Promise<{ success: boolean; error?: string }> => {
    return await upsertDayCard(updates)
  }

  return (
    <div className="pb-8">
      {/* Date Navigation - matches reference: prev/next chevrons + centered date block */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={goToPrevDay}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/60 transition-colors"
          >
            <AppIcon name="chevron-left" className="w-5 h-5 text-gray-600" />
          </button>

          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-800">
              {formatDateDisplay(date, locale)}
            </h2>
            <p className="text-sm text-gray-500">
              {formatWeekdayYear(date, locale)}
            </p>
          </div>

          <button
            onClick={goToNextDay}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/60 transition-colors"
          >
            <AppIcon name="chevron-right" className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Polaroid Card - matches reference design */}
      <PolaroidCard
        dayCard={dayCard}
        photoSignedUrl={photoSignedUrl}
        date={dateStr}
        locale={locale}
        onSave={handleSave}
        onStickersChange={async (stickers) => {
          await upsertDayCard({ sticker_state: stickers })
        }}
        saving={cardSaving}
        saveError={error}
        onEditingChange={setEditingState}
      />
    </div>
  )
}
