'use client'

import { jsPDF } from 'jspdf'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { StickerState } from '@/types/database'

// Re-export for backward compatibility
export type { ExportData } from '@/components/day/exportable-polaroid'

// Stamp image path (must match stamp-overlay.tsx)
const STAMP_IMAGE_PATH = '/image/seal-image.jpg'
const BUCKET_NAME = 'entry-photos'

// Canvas export dimensions
const CANVAS_WIDTH = 340 * 2  // 2x for retina quality
const CANVAS_HEIGHT = 440 * 2 // Approximate polaroid height
const PHOTO_AREA_HEIGHT = 280 * 2
const PADDING = 16 * 2
const CORNER_RADIUS = 16 * 2
const PHOTO_CORNER_RADIUS = 12 * 2

/**
 * Download image from Supabase Storage and convert to data URL.
 * Uses Supabase client's download() which bypasses CORS issues.
 */
async function downloadSupabaseImage(path: string): Promise<string | null> {
  console.log('[EXPORT] downloadSupabaseImage called with path:', path)

  try {
    const supabase = getSupabaseClient()
    console.log('[EXPORT] Supabase client obtained, calling download...')

    const { data: blob, error } = await supabase.storage
      .from(BUCKET_NAME)
      .download(path)

    if (error) {
      console.error('[EXPORT] Supabase download error:', error.message, error)
      return null
    }

    if (!blob) {
      console.error('[EXPORT] Supabase download returned no blob')
      return null
    }

    console.log('[EXPORT] Supabase download success:', {
      blobSize: blob.size,
      blobType: blob.type,
    })

    // Convert blob to data URL
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        console.log('[EXPORT] Blob->DataURL conversion:', {
          success: !!result,
          length: result?.length,
          startsWithData: result?.startsWith('data:'),
        })
        resolve(result)
      }
      reader.onerror = (e) => {
        console.error('[EXPORT] FileReader error:', e)
        resolve(null)
      }
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('[EXPORT] downloadSupabaseImage exception:', error)
    return null
  }
}

/**
 * Fetch a local image URL and convert it to a data URL.
 */
async function fetchLocalImage(url: string): Promise<string | null> {
  console.log('[EXPORT] fetchLocalImage called with:', url)

  try {
    const response = await fetch(url)
    console.log('[EXPORT] Local fetch response:', response.status, response.statusText)

    if (!response.ok) {
      console.error('[EXPORT] Local fetch failed:', response.status)
      return null
    }

    const blob = await response.blob()
    console.log('[EXPORT] Local blob:', { size: blob.size, type: blob.type })

    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        console.log('[EXPORT] Local image->DataURL:', {
          success: !!result,
          length: result?.length,
          startsWithData: result?.startsWith('data:'),
        })
        resolve(result)
      }
      reader.onerror = (e) => {
        console.error('[EXPORT] Local FileReader error:', e)
        resolve(null)
      }
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('[EXPORT] fetchLocalImage exception:', error)
    return null
  }
}

/**
 * Load an image from a data URL and wait for it to be ready.
 */
async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = (e) => reject(e)
    img.src = src
  })
}

/**
 * Draw a rounded rectangle path on a canvas context.
 */
function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

/**
 * Internal export data structure.
 */
interface InternalExportData {
  photoDataUrl: string | null
  stampDataUrl: string | null
  praise: string | null
  stickers: Array<StickerState & { dataUrl?: string }>
  showStamp: boolean
  createdAt: string | null
}

/**
 * Prepare export data by converting all images to data URLs.
 * Uses Supabase download API for photos to bypass CORS issues.
 */
async function prepareExportData(
  photoPath: string | null,
  stickers: StickerState[],
  praise: string | null,
  showStamp: boolean,
  createdAt: string | null
): Promise<InternalExportData> {
  console.log('=== PREPARE EXPORT DATA ===')
  console.log('[EXPORT] photoPath:', photoPath)
  console.log('[EXPORT] stickers count:', stickers.length)
  console.log('[EXPORT] showStamp:', showStamp)

  // Download photo from Supabase
  let photoDataUrl: string | null = null
  if (photoPath) {
    photoDataUrl = await downloadSupabaseImage(photoPath)
    console.log('[EXPORT] Photo download:', photoDataUrl ? `SUCCESS (${photoDataUrl.length} bytes)` : 'FAILED')
  }

  // Fetch stamp from local assets
  let stampDataUrl: string | null = null
  if (showStamp) {
    stampDataUrl = await fetchLocalImage(STAMP_IMAGE_PATH)
    console.log('[EXPORT] Stamp fetch:', stampDataUrl ? `SUCCESS (${stampDataUrl.length} bytes)` : 'FAILED')
  }

  // Convert sticker images to data URLs
  const stickersWithDataUrls = await Promise.all(
    stickers.map(async (sticker) => {
      if (sticker.src.startsWith('/')) {
        const dataUrl = await fetchLocalImage(sticker.src)
        console.log(`[EXPORT] Sticker "${sticker.src}":`, dataUrl ? 'SUCCESS' : 'FAILED')
        return { ...sticker, dataUrl: dataUrl || undefined }
      }
      // Emoji - no dataUrl needed
      return sticker
    })
  )

  return {
    photoDataUrl,
    stampDataUrl,
    praise,
    stickers: stickersWithDataUrls,
    showStamp,
    createdAt,
  }
}

/**
 * CANVAS COMPOSITION EXPORT
 *
 * This function bypasses html-to-image and directly draws all elements
 * onto a canvas. This is more reliable as it doesn't depend on DOM capture.
 */
async function captureWithCanvas(data: InternalExportData): Promise<string> {
  console.log('=== CANVAS COMPOSITION EXPORT ===')
  console.log('[EXPORT] Starting canvas composition...')
  console.log('[EXPORT] Data:', {
    hasPhoto: !!data.photoDataUrl,
    hasStamp: !!data.stampDataUrl,
    stickersCount: data.stickers.length,
    praise: data.praise?.substring(0, 30),
  })

  // Create canvas
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_WIDTH
  canvas.height = CANVAS_HEIGHT
  const ctx = canvas.getContext('2d')!

  // Scale factor (for retina)
  const scale = 2

  // Draw shadow first (offset by a few pixels)
  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.25)'
  ctx.shadowBlur = 50 * scale
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 25 * scale

  // White polaroid background with rounded corners
  ctx.fillStyle = 'white'
  roundedRectPath(ctx, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, CORNER_RADIUS)
  ctx.fill()
  ctx.restore()

  // Photo area background (gray)
  const photoX = PADDING
  const photoY = PADDING
  const photoWidth = CANVAS_WIDTH - 2 * PADDING
  const photoHeight = PHOTO_AREA_HEIGHT

  ctx.fillStyle = '#f3f4f6'
  roundedRectPath(ctx, photoX, photoY, photoWidth, photoHeight, PHOTO_CORNER_RADIUS)
  ctx.fill()

  // Draw photo if available
  if (data.photoDataUrl) {
    console.log('[EXPORT] Loading photo image...')
    try {
      const photoImg = await loadImage(data.photoDataUrl)
      console.log('[EXPORT] Photo loaded:', photoImg.naturalWidth, 'x', photoImg.naturalHeight)

      // Clip to photo area with rounded corners
      ctx.save()
      roundedRectPath(ctx, photoX, photoY, photoWidth, photoHeight, PHOTO_CORNER_RADIUS)
      ctx.clip()

      // Draw photo with cover fit
      const imgAspect = photoImg.naturalWidth / photoImg.naturalHeight
      const areaAspect = photoWidth / photoHeight

      let drawWidth: number, drawHeight: number, drawX: number, drawY: number

      if (imgAspect > areaAspect) {
        // Image is wider - fit height, crop width
        drawHeight = photoHeight
        drawWidth = drawHeight * imgAspect
        drawX = photoX - (drawWidth - photoWidth) / 2
        drawY = photoY
      } else {
        // Image is taller - fit width, crop height
        drawWidth = photoWidth
        drawHeight = drawWidth / imgAspect
        drawX = photoX
        drawY = photoY - (drawHeight - photoHeight) / 2
      }

      ctx.drawImage(photoImg, drawX, drawY, drawWidth, drawHeight)
      ctx.restore()
      console.log('[EXPORT] Photo drawn successfully')
    } catch (e) {
      console.error('[EXPORT] Failed to load photo:', e)
    }
  } else {
    console.log('[EXPORT] No photo to draw')
  }

  // Draw stickers
  console.log('[EXPORT] Drawing', data.stickers.length, 'stickers...')
  for (const sticker of data.stickers) {
    const isImageSticker = sticker.src.startsWith('/')
    const stickerX = photoX + sticker.x * photoWidth
    const stickerY = photoY + sticker.y * photoHeight

    ctx.save()
    ctx.translate(stickerX, stickerY)
    ctx.rotate((sticker.rotation * Math.PI) / 180)
    ctx.scale(sticker.scale, sticker.scale)

    if (isImageSticker && sticker.dataUrl) {
      // Image sticker
      try {
        const stickerImg = await loadImage(sticker.dataUrl)
        const stickerSize = 80 * scale
        ctx.drawImage(stickerImg, -stickerSize / 2, -stickerSize / 2, stickerSize, stickerSize)
        console.log('[EXPORT] Drew image sticker:', sticker.src)
      } catch (e) {
        console.error('[EXPORT] Failed to load sticker image:', sticker.src, e)
      }
    } else if (!isImageSticker) {
      // Emoji sticker
      ctx.font = `${30 * scale}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(sticker.src, 0, 0)
      console.log('[EXPORT] Drew emoji sticker:', sticker.src)
    }

    ctx.restore()
  }

  // Draw caption text
  const captionY = photoY + photoHeight + 24 * scale
  const captionText = data.praise || 'Give your day a pat.'
  ctx.font = `500 ${16 * scale}px "Inter", "Noto Sans KR", system-ui, sans-serif`
  ctx.fillStyle = data.praise ? '#374151' : '#9ca3af'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(captionText, CANVAS_WIDTH / 2, captionY)

  // Draw footer (time)
  const footerY = captionY + 36 * scale
  const timeText = data.createdAt
    ? new Date(data.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : ''
  ctx.font = `${12 * scale}px "Inter", system-ui, sans-serif`
  ctx.fillStyle = '#9ca3af'
  ctx.textAlign = 'left'
  ctx.fillText(timeText, PADDING + 8 * scale, footerY)

  // Draw stamp if available
  if (data.showStamp && data.stampDataUrl) {
    console.log('[EXPORT] Loading stamp image...')
    try {
      const stampImg = await loadImage(data.stampDataUrl)
      const stampSize = 88 * scale
      const stampX = CANVAS_WIDTH - PADDING - stampSize
      const stampY = CANVAS_HEIGHT - 48 * scale - stampSize

      // Draw stamp with circular clip and shadow
      ctx.save()
      ctx.shadowColor = 'rgba(0, 0, 0, 0.1)'
      ctx.shadowBlur = 15 * scale
      ctx.shadowOffsetY = 10 * scale

      ctx.beginPath()
      ctx.arc(stampX + stampSize / 2, stampY + stampSize / 2, stampSize / 2, 0, Math.PI * 2)
      ctx.clip()

      ctx.drawImage(stampImg, stampX, stampY, stampSize, stampSize)
      ctx.restore()
      console.log('[EXPORT] Stamp drawn successfully')
    } catch (e) {
      console.error('[EXPORT] Failed to load stamp:', e)
    }
  }

  // Export canvas as PNG
  const dataUrl = canvas.toDataURL('image/png')
  console.log('[EXPORT] Canvas export complete, dataUrl length:', dataUrl.length)
  return dataUrl
}

/**
 * Download a data URL as a file.
 */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  link.click()
}

/**
 * Convert data URL to Blob.
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',')
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png'
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new Blob([u8arr], { type: mime })
}

/**
 * Format date for PDF header (YYYY.MM.DD format).
 */
function formatPdfDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  return `${year}.${month}.${day}`
}

/**
 * Get weekday name from date string.
 */
function getWeekdayName(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { weekday: 'long' })
}

// ============================================================
// PUBLIC API
// ============================================================

export interface ExportOptions {
  /** Photo storage path (e.g., "uuid.webp") - NOT a URL */
  photoPath: string | null
  /** Sticker state array */
  stickers: StickerState[]
  /** Caption/praise text */
  praise: string | null
  /** Whether to show the stamp */
  showStamp: boolean
  /** Created at timestamp */
  createdAt: string | null
  /** Date string (YYYY-MM-DD) for filename */
  date: string
}

/**
 * Capture the polaroid as a PNG data URL.
 * Uses canvas composition for reliable capture (bypasses html-to-image).
 */
export async function capturePolaroidAsPng(options: ExportOptions): Promise<string> {
  const { photoPath, stickers, praise, showStamp, createdAt } = options

  // Prepare export data (download from Supabase and convert to data URLs)
  const exportData = await prepareExportData(photoPath, stickers, praise, showStamp, createdAt)

  // Use canvas composition for reliable export
  return captureWithCanvas(exportData)
}

/**
 * Export polaroid as PNG and download.
 */
export async function exportPolaroidAsPng(options: ExportOptions): Promise<void> {
  const dataUrl = await capturePolaroidAsPng(options)
  const filename = `day-pat-${options.date}.png`
  downloadDataUrl(dataUrl, filename)
}

/**
 * Export polaroid as PDF with pretty template and download.
 */
export async function exportPolaroidAsPdf(options: ExportOptions): Promise<void> {
  const { date } = options

  // Prepare export data and capture using canvas
  const exportData = await prepareExportData(
    options.photoPath,
    options.stickers,
    options.praise,
    options.showStamp,
    options.createdAt
  )
  const dataUrl = await captureWithCanvas(exportData)

  // A4 dimensions in mm: 210 x 297
  const pageWidth = 210
  const pageHeight = 297
  const margin = 24

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  // Load image to get dimensions
  const img = new Image()
  img.src = dataUrl
  await new Promise((resolve) => {
    img.onload = resolve
  })

  // ========== HEADER SECTION ==========
  const headerY = margin

  pdf.setFontSize(28)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(31, 41, 55)
  const formattedDate = formatPdfDate(date)
  pdf.text(formattedDate, pageWidth / 2, headerY, { align: 'center' })

  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(107, 114, 128)
  const weekday = getWeekdayName(date)
  pdf.text(weekday, pageWidth / 2, headerY + 10, { align: 'center' })

  pdf.setDrawColor(229, 231, 235)
  pdf.setLineWidth(0.5)
  pdf.line(margin + 20, headerY + 16, pageWidth - margin - 20, headerY + 16)

  // ========== POLAROID IMAGE SECTION ==========
  const contentStartY = headerY + 28
  const contentEndY = pageHeight - margin - 20
  const availableHeight = contentEndY - contentStartY
  const availableWidth = pageWidth - 2 * margin

  const imgAspect = img.width / img.height
  let imgWidth = availableWidth
  let imgHeight = imgWidth / imgAspect

  if (imgHeight > availableHeight) {
    imgHeight = availableHeight
    imgWidth = imgHeight * imgAspect
  }

  const maxPolaroidWidth = 140
  if (imgWidth > maxPolaroidWidth) {
    imgWidth = maxPolaroidWidth
    imgHeight = imgWidth / imgAspect
  }

  const imgX = (pageWidth - imgWidth) / 2
  const imgY = contentStartY + 4

  // Draw subtle shadow
  pdf.setFillColor(200, 200, 200)
  pdf.roundedRect(imgX + 1.5, imgY + 1.5, imgWidth, imgHeight, 2, 2, 'F')

  pdf.addImage(dataUrl, 'PNG', imgX, imgY, imgWidth, imgHeight)

  // ========== FOOTER SECTION ==========
  const footerY = pageHeight - margin

  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(156, 163, 175)
  pdf.text('Day Pat', margin, footerY)

  const timestamp = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  pdf.text(`Generated: ${timestamp}`, pageWidth - margin, footerY, { align: 'right' })

  pdf.setFontSize(9)
  pdf.text('1', pageWidth / 2, footerY, { align: 'center' })

  pdf.save(`day-pat-${date}.pdf`)
}

export type ShareResult = {
  success: boolean
  method: 'shared' | 'downloaded' | 'cancelled' | 'failed'
  error?: string
}

/**
 * Share polaroid via Web Share API or fallback to download.
 */
export async function sharePolaroid(options: ExportOptions): Promise<ShareResult> {
  console.log('[EXPORT] sharePolaroid called:', {
    photoPath: options.photoPath,
    stickersCount: options.stickers.length,
    showStamp: options.showStamp,
    date: options.date,
  })

  try {
    const dataUrl = await capturePolaroidAsPng(options)
    console.log('[EXPORT] Capture complete, dataUrl length:', dataUrl.length)
    const blob = dataUrlToBlob(dataUrl)
    const file = new File([blob], `day-pat-${options.date}.png`, { type: 'image/png' })

    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'My Day Pat',
          text: `My day on ${options.date}`,
        })
        return { success: true, method: 'shared' }
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          return { success: false, method: 'cancelled' }
        }
        console.warn('Share failed, falling back to download:', err)
      }
    }

    downloadDataUrl(dataUrl, `day-pat-${options.date}.png`)
    return { success: true, method: 'downloaded' }
  } catch (err) {
    console.error('Share/download failed:', err)
    return {
      success: false,
      method: 'failed',
      error: err instanceof Error ? err.message : 'Failed to create image',
    }
  }
}

// ============================================================
// LEGACY API (for backward compatibility)
// ============================================================

/**
 * @deprecated Use capturePolaroidAsPng with ExportOptions instead.
 * This legacy function is kept for backward compatibility.
 */
export async function captureElementAsPng(
  _element: HTMLElement,
  _options?: { pixelRatio?: number }
): Promise<string> {
  console.warn('captureElementAsPng is deprecated. Use capturePolaroidAsPng with ExportOptions instead.')
  // Return empty data URL as this should not be used
  return 'data:image/png;base64,'
}
