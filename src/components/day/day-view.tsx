'use client'

import { useRef, useState, useCallback } from 'react'
import { format } from 'date-fns'
import { toPng } from 'html-to-image'
import { AppIcon } from '@/components/ui/app-icon'
import { Toast, useToast } from '@/components/ui/toast'
import { useDayCard } from '@/hooks/use-day-card'
import { useSwipeNav } from '@/hooks/use-swipe-nav'
import { formatDateString, parseDateString } from '@/lib/utils'
import {
  nextPaint,
  waitForImages,
  prepareImagesForCapture,
  replaceImageSrcsWithDataUrls,
} from '@/lib/image-utils'
import { PolaroidCard, type PolaroidCardRef } from './polaroid-card'

const DEBUG = process.env.NODE_ENV === 'development'

// Export target dimensions
const EXPORT_TARGETS = {
  instagram_post: { width: 1080, height: 1080 },
  instagram_story: { width: 1080, height: 1920 },
  instagram_reel: { width: 1080, height: 1920 },
} as const

type ExportTarget = keyof typeof EXPORT_TARGETS

// Background color for letterbox areas
const EXPORT_BG_COLOR = '#FFFDF8'

// Timeout for image preloading (ms)
const IMAGE_PRELOAD_TIMEOUT = 4000

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
   *
   * Key steps to ensure images appear in capture:
   * 1. Wait for document fonts
   * 2. Wait for layout/paint stabilization
   * 3. Preload all images and convert to dataURLs (CORS safety)
   * 4. Create offscreen clone with dataURL images
   * 5. Wait for clone images to load
   * 6. Capture the clone
   */
  const captureDayView = async (target: ExportTarget): Promise<string> => {
    const element = dayViewRef.current
    if (!element) throw new Error('Day View element not found')

    if (DEBUG) console.log('[DayView] Starting capture for target:', target)

    // Step 1: Ensure fonts are loaded
    await document.fonts.ready
    if (DEBUG) console.log('[DayView] Fonts ready')

    // Step 2: Wait for layout/paint stabilization
    await nextPaint()
    if (DEBUG) console.log('[DayView] Paint stabilized')

    // Step 3: Preload all images and convert to dataURLs (CORS safety)
    // This ensures external images (Supabase storage) don't cause tainted canvas issues
    const imageUrlMap = await prepareImagesForCapture(element, { timeoutMs: IMAGE_PRELOAD_TIMEOUT })
    if (DEBUG) console.log('[DayView] Images preloaded:', imageUrlMap.size)

    // Step 4: Create offscreen clone with dataURL images
    const clone = element.cloneNode(true) as HTMLElement
    clone.style.position = 'absolute'
    clone.style.left = '-9999px'
    clone.style.top = '0'
    document.body.appendChild(clone)

    try {
      // Replace image srcs with dataURLs in the clone
      replaceImageSrcsWithDataUrls(clone, imageUrlMap)
      if (DEBUG) console.log('[DayView] Clone images replaced with dataURLs')

      // Step 5: Wait for clone images to fully load
      await nextPaint()
      await waitForImages(clone, { timeoutMs: 3000 })
      if (DEBUG) console.log('[DayView] Clone images loaded')

      // Step 6: Capture the clone at high resolution (2x for quality)
      const pixelRatio = 2
      const dataUrl = await toPng(clone, {
        pixelRatio,
        backgroundColor: EXPORT_BG_COLOR,
        cacheBust: true,
        skipFonts: false,
      })
      if (DEBUG) console.log('[DayView] Clone captured')

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

      if (DEBUG) console.log('[DayView] Final canvas created')
      return canvas.toDataURL('image/png')
    } finally {
      // Always clean up the clone
      document.body.removeChild(clone)
      if (DEBUG) console.log('[DayView] Clone cleaned up')
    }
  }

  // Share handler for action bar (with toast feedback)
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

    if (DEBUG) console.log('[DayView] Starting share flow')

    // Set loading states BEFORE any async operations
    setSharing(true)
    setIsExporting(true)

    try {
      // Small delay to ensure React re-renders with isExporting=true
      // This allows the slogan to appear instead of timestamp
      await new Promise(resolve => setTimeout(resolve, 100))

      // Capture Day View as image (default to instagram_post 1:1)
      if (DEBUG) console.log('[DayView] Capturing Day View...')
      const dataUrl = await captureDayView('instagram_post')
      if (DEBUG) console.log('[DayView] Capture complete')

      // Convert to blob for sharing
      const response = await fetch(dataUrl)
      const blob = await response.blob()
      const file = new File([blob], `day-pat-${dateStr}.png`, { type: 'image/png' })

      // Try Web Share API first
      if (navigator.canShare?.({ files: [file] })) {
        if (DEBUG) console.log('[DayView] Using Web Share API')
        try {
          await navigator.share({ files: [file] })
          showToast('Successfully done!', 'success')
        } catch (err) {
          if ((err as Error).name === 'AbortError') {
            // User cancelled - don't show toast, but this is NOT an error
            if (DEBUG) console.log('[DayView] Share cancelled by user')
          } else {
            // Share failed, fallback to download
            if (DEBUG) console.log('[DayView] Share failed, falling back to download:', err)
            downloadDataUrl(dataUrl, `day-pat-${dateStr}.png`)
            showToast('Successfully done!', 'success')
          }
        }
      } else {
        // Fallback to download
        if (DEBUG) console.log('[DayView] Web Share not available, downloading')
        downloadDataUrl(dataUrl, `day-pat-${dateStr}.png`)
        showToast('Successfully done!', 'success')
      }
    } catch (err) {
      console.error('[DayView] Share failed:', err)
      showToast('Something went wrong', 'error')
    } finally {
      // ALWAYS reset loading states, regardless of success/failure/cancel
      if (DEBUG) console.log('[DayView] Share flow complete, resetting states')
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
