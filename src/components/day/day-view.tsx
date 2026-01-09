'use client'

import { useRef, useState, useCallback } from 'react'
import { format } from 'date-fns'
import { AppIcon } from '@/components/ui/app-icon'
import { Toast, useToast } from '@/components/ui/toast'
import { useDayCard } from '@/hooks/use-day-card'
import { useSwipeNav } from '@/hooks/use-swipe-nav'
import { formatDateString, parseDateString } from '@/lib/utils'
import { sharePolaroid } from '@/lib/export-polaroid'
import { PolaroidCard } from './polaroid-card'

const DEBUG = process.env.NODE_ENV === 'development'

interface DayViewProps {
  selectedDate: string
  onDateChange: (date: string) => void
  onClose?: () => void
}

export function DayView({ selectedDate, onDateChange }: DayViewProps) {
  const date = parseDateString(selectedDate)
  const dateStr = formatDateString(date)
  const dayViewRef = useRef<HTMLDivElement>(null)
  const [sharing, setSharing] = useState(false)
  const { toast, showToast, hideToast } = useToast()

  const { dayCard, photoSignedUrl, loading, saving: cardSaving, error, upsertDayCard, toggleLike, setEditingState } = useDayCard(dateStr)

  /**
   * Share handler using canvas-based export (bypasses DOM capture CORS issues).
   *
   * Uses sharePolaroid from export-polaroid.ts which:
   * 1. Downloads images from Supabase Storage API (no CORS issues)
   * 2. Converts all images to data URLs
   * 3. Draws everything on a canvas programmatically
   * 4. Shares via Web Share API or downloads as fallback
   */
  const handleShareFromActionBar = async () => {
    // Prevent duplicate clicks while sharing is in progress
    if (sharing) {
      if (DEBUG) console.log('[DayView] Share blocked - already sharing')
      return
    }

    // Must have a saved photo to share
    if (!dayCard?.photo_path) {
      if (DEBUG) console.log('[DayView] Share blocked - no photo')
      return
    }

    if (DEBUG) console.log('[DayView] Starting share flow with canvas export')

    // Set loading state BEFORE any async operations
    setSharing(true)

    try {
      // Use canvas-based export which handles all image loading internally
      const result = await sharePolaroid({
        photoPath: dayCard.photo_path,
        stickers: dayCard.sticker_state || [],
        praise: dayCard.praise || null,
        showStamp: Boolean(dayCard.photo_path), // Show stamp if photo exists
        createdAt: dayCard.created_at || null,
        date: dateStr,
        exportTarget: 'instagram_post',
      })

      if (DEBUG) console.log('[DayView] Share result:', result)

      // Show appropriate toast based on result
      if (result.success) {
        if (result.method === 'shared') {
          showToast('Successfully done!', 'success')
        } else if (result.method === 'downloaded') {
          showToast('Successfully done!', 'success')
        }
        // Don't show toast for 'cancelled' - user intentionally cancelled
      } else if (result.method === 'cancelled') {
        // User cancelled - no toast needed
        if (DEBUG) console.log('[DayView] Share cancelled by user')
      } else {
        // Failed
        console.error('[DayView] Share failed:', result.error)
        showToast('Something went wrong', 'error')
      }
    } catch (err) {
      console.error('[DayView] Share failed:', err)
      showToast('Something went wrong', 'error')
    } finally {
      // ALWAYS reset loading state, regardless of success/failure/cancel
      if (DEBUG) console.log('[DayView] Share flow complete, resetting state')
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
      ref={dayViewRef}
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
