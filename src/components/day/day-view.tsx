'use client'

import { useRef, useState, useCallback } from 'react'
import { format } from 'date-fns'
import { AppIcon } from '@/components/ui/app-icon'
import { Toast, useToast } from '@/components/ui/toast'
import { useDayCard } from '@/hooks/use-day-card'
import { useSwipeNav } from '@/hooks/use-swipe-nav'
import { formatDateString, parseDateString } from '@/lib/utils'
import { sharePolaroid, type ExportOptions } from '@/lib/export-polaroid'
import { PolaroidCard, type PolaroidCardRef } from './polaroid-card'

interface DayViewProps {
  selectedDate: string
  onDateChange: (date: string) => void
  onClose?: () => void
}

export function DayView({ selectedDate, onDateChange }: DayViewProps) {
  const date = parseDateString(selectedDate)
  const dateStr = formatDateString(date)
  const polaroidRef = useRef<PolaroidCardRef>(null)
  const [sharing, setSharing] = useState(false)
  const { toast, showToast, hideToast } = useToast()

  const { dayCard, photoSignedUrl, loading, saving: cardSaving, error, upsertDayCard, toggleLike, setEditingState } = useDayCard(dateStr)

  // Share handler for action bar (with toast feedback)
  const handleShareFromActionBar = async () => {
    // Must have a saved photo to share
    if (!dayCard?.photo_path) return

    setSharing(true)
    try {
      // Prepare export options with all data needed for rendering
      // Use photo_path (storage path) instead of signed URL to bypass CORS
      const exportOptions: ExportOptions = {
        photoPath: dayCard.photo_path || null,
        stickers: dayCard.sticker_state || [],
        praise: dayCard.praise || null,
        showStamp: Boolean(dayCard.photo_path),
        createdAt: dayCard.created_at || null,
        date: dateStr,
      }

      const result = await sharePolaroid(exportOptions)
      if (result.success) {
        if (result.method === 'shared') {
          showToast('Successfully done!', 'success')
        } else if (result.method === 'downloaded') {
          showToast('Successfully done!', 'success')
        }
      } else if (result.method === 'failed') {
        showToast(result.error || 'Failed to create image', 'error')
      }
      // Don't show toast for 'cancelled' - user intentionally cancelled
    } catch {
      showToast('Something went wrong', 'error')
    } finally {
      setSharing(false)
    }
  }

  const goToPrevDay = useCallback(() => {
    const prev = new Date(date)
    prev.setDate(prev.getDate() - 1)
    onDateChange(formatDateString(prev))
  }, [date, onDateChange])

  const goToNextDay = useCallback(() => {
    const next = new Date(date)
    next.setDate(next.getDate() + 1)
    onDateChange(formatDateString(next))
  }, [date, onDateChange])

  // Swipe navigation: right = prev day, left = next day
  const { getSwipeHandlers } = useSwipeNav({
    onSwipeRight: goToPrevDay,
    onSwipeLeft: goToNextDay,
  })

  const handleSave = async (updates: {
    photo_url?: string | null
    caption?: string | null
    sticker_state?: import('@/types/database').StickerState[]
  }): Promise<{ success: boolean; error?: string; refreshError?: string }> => {
    return await upsertDayCard(updates)
  }

  return (
    <div
      className="pb-6"
      style={{ touchAction: 'pan-y' }}
      {...getSwipeHandlers()}
    >
      {/* Date Navigation - compact header */}
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <button
            onClick={goToPrevDay}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/60 transition-colors"
          >
            <AppIcon name="chevron-left" className="w-5 h-5 text-gray-600" />
          </button>

          <div className="text-center">
            <h2 className="text-lg font-bold text-gray-800">
              {format(date, 'MMMM d')}
            </h2>
            <p className="text-xs text-gray-500">
              {format(date, 'EEEE, yyyy')}
            </p>
          </div>

          <button
            onClick={goToNextDay}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/60 transition-colors"
          >
            <AppIcon name="chevron-right" className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Polaroid Card - constrained width with side margins */}
      <div className="px-4">
        <PolaroidCard
          ref={polaroidRef}
          dayCard={dayCard}
          photoSignedUrl={photoSignedUrl}
          date={dateStr}
          loading={loading}
          onSave={handleSave}
          onToggleLike={toggleLike}
          onShare={handleShareFromActionBar}
          saving={cardSaving}
          sharing={sharing}
          saveError={error}
          onEditingChange={setEditingState}
        />
      </div>

      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </div>
  )
}
