'use client'

import { useRef, useState, useCallback } from 'react'
import { format } from 'date-fns'
import { toPng } from 'html-to-image'
import { AppIcon } from '@/components/ui/app-icon'
import { Toast, useToast } from '@/components/ui/toast'
import { useDayCard } from '@/hooks/use-day-card'
import { useSwipeNav } from '@/hooks/use-swipe-nav'
import { formatDateString, parseDateString } from '@/lib/utils'
import { PolaroidCard, type PolaroidCardRef } from './polaroid-card'

// Export target dimensions
const EXPORT_TARGETS = {
  instagram_post: { width: 1080, height: 1080 },
  instagram_story: { width: 1080, height: 1920 },
  instagram_reel: { width: 1080, height: 1920 },
} as const

type ExportTarget = keyof typeof EXPORT_TARGETS

// Background color for letterbox areas
const EXPORT_BG_COLOR = '#FFFDF8'

interface DayViewProps {
  selectedDate: string
  onDateChange: (date: string) => void
  onClose?: () => void
}

export function DayView({ selectedDate, onDateChange }: DayViewProps) {
  const date = parseDateString(selectedDate)
  const dateStr = formatDateString(date)
  const polaroidRef = useRef<PolaroidCardRef>(null)
  const dayViewRef = useRef<HTMLDivElement>(null)
  const [sharing, setSharing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const { toast, showToast, hideToast } = useToast()

  const { dayCard, photoSignedUrl, loading, saving: cardSaving, error, upsertDayCard, toggleLike, setEditingState } = useDayCard(dateStr)

  /**
   * Capture Day View as image and scale to target canvas with "contain" fit.
   * Returns a data URL of the final image.
   */
  const captureDayView = async (target: ExportTarget): Promise<string> => {
    const element = dayViewRef.current
    if (!element) throw new Error('Day View element not found')

    // Ensure fonts are loaded before capture
    await document.fonts.ready

    // Capture the Day View at high resolution (2x for quality)
    const pixelRatio = 2
    const dataUrl = await toPng(element, {
      pixelRatio,
      backgroundColor: EXPORT_BG_COLOR,
      cacheBust: true,
    })

    // Load the captured image
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = reject
      img.src = dataUrl
    })

    // Get target dimensions
    const targetDim = EXPORT_TARGETS[target]
    const canvas = document.createElement('canvas')
    canvas.width = targetDim.width
    canvas.height = targetDim.height
    const ctx = canvas.getContext('2d')!

    // Fill background
    ctx.fillStyle = EXPORT_BG_COLOR
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Calculate "contain" scaling - maximize size while maintaining aspect ratio
    const srcW = img.naturalWidth
    const srcH = img.naturalHeight
    const scale = Math.min(targetDim.width / srcW, targetDim.height / srcH)
    const drawW = srcW * scale
    const drawH = srcH * scale
    const offsetX = (targetDim.width - drawW) / 2
    const offsetY = (targetDim.height - drawH) / 2

    // Draw the captured image centered with contain scaling
    ctx.drawImage(img, offsetX, offsetY, drawW, drawH)

    return canvas.toDataURL('image/png')
  }

  // Share handler for action bar (with toast feedback)
  const handleShareFromActionBar = async () => {
    // Must have a saved photo to share
    if (!dayCard?.photo_path) return

    setSharing(true)
    setIsExporting(true)

    // Small delay to ensure React re-renders with isExporting=true
    await new Promise(resolve => setTimeout(resolve, 50))

    try {
      // Capture Day View as image (default to instagram_post 1:1)
      const dataUrl = await captureDayView('instagram_post')

      // Convert to blob for sharing
      const response = await fetch(dataUrl)
      const blob = await response.blob()
      const file = new File([blob], `day-pat-${dateStr}.png`, { type: 'image/png' })

      // Try Web Share API first
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file] })
          showToast('Successfully done!', 'success')
        } catch (err) {
          if ((err as Error).name === 'AbortError') {
            // User cancelled - don't show toast
          } else {
            // Share failed, fallback to download
            downloadDataUrl(dataUrl, `day-pat-${dateStr}.png`)
            showToast('Successfully done!', 'success')
          }
        }
      } else {
        // Fallback to download
        downloadDataUrl(dataUrl, `day-pat-${dateStr}.png`)
        showToast('Successfully done!', 'success')
      }
    } catch (err) {
      console.error('Share failed:', err)
      showToast('Something went wrong', 'error')
    } finally {
      setIsExporting(false)
      setSharing(false)
    }
  }

  // Helper function to download data URL
  const downloadDataUrl = (dataUrl: string, filename: string) => {
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
          isExporting={isExporting}
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
