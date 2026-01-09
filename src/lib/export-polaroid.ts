'use client'

import { jsPDF } from 'jspdf'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { StickerState } from '@/types/database'

// Re-export for backward compatibility
export type { ExportData } from '@/components/day/exportable-polaroid'

// Stamp image path (must match stamp-overlay.tsx)
const STAMP_IMAGE_PATH = '/image/seal-image.jpg'
const BUCKET_NAME = 'entry-photos'

// Base polaroid dimensions (unscaled, 1x)
const BASE_POLAROID_WIDTH = 340
const BASE_POLAROID_HEIGHT = 440
const BASE_PHOTO_AREA_HEIGHT = 280
const BASE_PADDING = 16
const BASE_CORNER_RADIUS = 16
const BASE_PHOTO_CORNER_RADIUS = 12

// Brand text settings
const BRAND_TEXT = 'DayPat'
const BRAND_COLOR = '#F27430'
const BRAND_FONT_FAMILY = "'Caveat', cursive"
// Background color (warm cream to match app theme)
const EXPORT_BACKGROUND_COLOR = '#FFFDF8'

// =============================================================================
// EXPORT TARGET DEFINITIONS
// =============================================================================

export type ExportTarget = 'instagram_post' | 'instagram_story' | 'instagram_reel'

interface ExportLayout {
  /** Canvas width in pixels */
  canvasWidth: number
  /** Canvas height in pixels */
  canvasHeight: number
  /** Polaroid X position */
  polaroidX: number
  /** Polaroid Y position */
  polaroidY: number
  /** Polaroid render scale (1 = base size) */
  polaroidScale: number
  /** Brand font size in pixels (unscaled) */
  brandFontSize: number
}

/**
 * Calculate export layout based on target format.
 * Instagram uses fixed dimensions (1080x1080 for post, 1080x1920 for story/reel).
 */
function calculateExportLayout(target: ExportTarget): ExportLayout {
  if (target === 'instagram_post') {
    // 1:1 aspect ratio (1080x1080)
    const canvasWidth = 1080
    const canvasHeight = 1080
    const safePadding = Math.round(canvasWidth * 0.03) // ~32px

    // Calculate scale to make polaroid fill the canvas
    const availableW = canvasWidth - 2 * safePadding
    const availableH = canvasHeight - 2 * safePadding

    // Account for shadow offset (shadow extends ~20px down, ~15px sides)
    const shadowMargin = 25
    const effectiveAvailableW = availableW - shadowMargin * 2
    const effectiveAvailableH = availableH - shadowMargin - shadowMargin / 2

    const scaleW = effectiveAvailableW / BASE_POLAROID_WIDTH
    const scaleH = effectiveAvailableH / BASE_POLAROID_HEIGHT
    const polaroidScale = Math.min(scaleW, scaleH)

    const scaledW = BASE_POLAROID_WIDTH * polaroidScale
    const scaledH = BASE_POLAROID_HEIGHT * polaroidScale

    // Center polaroid (accounting for shadow)
    const polaroidX = (canvasWidth - scaledW) / 2
    const polaroidY = (canvasHeight - scaledH) / 2 - shadowMargin / 4

    return {
      canvasWidth,
      canvasHeight,
      polaroidX,
      polaroidY,
      polaroidScale,
      brandFontSize: 22, // Small, on photo area
    }
  } else {
    // instagram_story / instagram_reel: 9:16 aspect ratio (1080x1920)
    const canvasWidth = 1080
    const canvasHeight = 1920

    // Safe areas for story/reel UI overlays
    const topSafe = 180
    const bottomSafe = 260
    const leftRightSafe = 60

    const availableW = canvasWidth - 2 * leftRightSafe
    const availableH = canvasHeight - topSafe - bottomSafe

    // Account for shadow
    const shadowMargin = 30
    const effectiveAvailableW = availableW - shadowMargin * 2
    const effectiveAvailableH = availableH - shadowMargin - shadowMargin / 2

    const scaleW = effectiveAvailableW / BASE_POLAROID_WIDTH
    const scaleH = effectiveAvailableH / BASE_POLAROID_HEIGHT
    const polaroidScale = Math.min(scaleW, scaleH)

    const scaledW = BASE_POLAROID_WIDTH * polaroidScale
    const scaledH = BASE_POLAROID_HEIGHT * polaroidScale

    // Center horizontally, vertically within safe area
    const polaroidX = (canvasWidth - scaledW) / 2
    const polaroidY = topSafe + (availableH - scaledH) / 2 - shadowMargin / 4

    return {
      canvasWidth,
      canvasHeight,
      polaroidX,
      polaroidY,
      polaroidScale,
      brandFontSize: 26, // Slightly larger for bigger canvas
    }
  }
}

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
 * Wait for fonts to be loaded before drawing text.
 */
async function ensureFontsLoaded(): Promise<void> {
  if (typeof document === 'undefined') return

  try {
    // Wait for all fonts to be ready
    await document.fonts.ready

    // Specifically load the Caveat font we need for the brand text
    await document.fonts.load(`bold 48px ${BRAND_FONT_FAMILY}`)
    console.log('[EXPORT] Fonts loaded successfully')
  } catch (e) {
    console.warn('[EXPORT] Font loading warning:', e)
    // Continue even if font loading fails - canvas will use fallback
  }
}

/**
 * CANVAS COMPOSITION EXPORT
 *
 * This function bypasses html-to-image and directly draws all elements
 * onto a canvas. This is more reliable as it doesn't depend on DOM capture.
 *
 * Supports different export targets:
 * - instagram_post (1:1, 1080x1080): Polaroid fills the canvas
 * - instagram_story (9:16, 1080x1920): Polaroid with safe areas for UI
 * - instagram_reel (9:16, 1080x1920): Same as story
 *
 * The DayPat brand text is overlaid on the PHOTO area (not the canvas corner).
 */
async function captureWithCanvas(
  data: InternalExportData,
  target: ExportTarget = 'instagram_post'
): Promise<string> {
  console.log('=== CANVAS COMPOSITION EXPORT ===')
  console.log('[EXPORT] Starting canvas composition for target:', target)
  console.log('[EXPORT] Data:', {
    hasPhoto: !!data.photoDataUrl,
    hasStamp: !!data.stampDataUrl,
    stickersCount: data.stickers.length,
    praise: data.praise?.substring(0, 30),
  })

  // Ensure fonts are loaded before drawing
  await ensureFontsLoaded()

  // Calculate layout based on export target
  const layout = calculateExportLayout(target)
  const { canvasWidth, canvasHeight, polaroidX, polaroidY, polaroidScale, brandFontSize } = layout

  console.log('[EXPORT] Layout:', {
    canvasWidth,
    canvasHeight,
    polaroidX: Math.round(polaroidX),
    polaroidY: Math.round(polaroidY),
    polaroidScale: polaroidScale.toFixed(3),
    brandFontSize,
  })

  // Create canvas
  const canvas = document.createElement('canvas')
  canvas.width = canvasWidth
  canvas.height = canvasHeight
  const ctx = canvas.getContext('2d')!

  // Calculate scaled dimensions
  const scaledPolaroidW = BASE_POLAROID_WIDTH * polaroidScale
  const scaledPolaroidH = BASE_POLAROID_HEIGHT * polaroidScale
  const scaledPadding = BASE_PADDING * polaroidScale
  const scaledCornerRadius = BASE_CORNER_RADIUS * polaroidScale
  const scaledPhotoCornerRadius = BASE_PHOTO_CORNER_RADIUS * polaroidScale
  const scaledPhotoHeight = BASE_PHOTO_AREA_HEIGHT * polaroidScale

  // Fill background with warm cream color
  ctx.fillStyle = EXPORT_BACKGROUND_COLOR
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  // Draw polaroid shadow first
  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.18)'
  ctx.shadowBlur = 25 * polaroidScale
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 12 * polaroidScale

  // White polaroid background with rounded corners
  ctx.fillStyle = 'white'
  roundedRectPath(ctx, polaroidX, polaroidY, scaledPolaroidW, scaledPolaroidH, scaledCornerRadius)
  ctx.fill()
  ctx.restore()

  // Photo area dimensions
  const photoX = polaroidX + scaledPadding
  const photoY = polaroidY + scaledPadding
  const photoWidth = scaledPolaroidW - 2 * scaledPadding
  const photoHeight = scaledPhotoHeight

  // Photo area background (gray)
  ctx.fillStyle = '#f3f4f6'
  roundedRectPath(ctx, photoX, photoY, photoWidth, photoHeight, scaledPhotoCornerRadius)
  ctx.fill()

  // Draw photo if available
  if (data.photoDataUrl) {
    console.log('[EXPORT] Loading photo image...')
    try {
      const photoImg = await loadImage(data.photoDataUrl)
      console.log('[EXPORT] Photo loaded:', photoImg.naturalWidth, 'x', photoImg.naturalHeight)

      // Clip to photo area with rounded corners
      ctx.save()
      roundedRectPath(ctx, photoX, photoY, photoWidth, photoHeight, scaledPhotoCornerRadius)
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
    ctx.scale(sticker.scale * polaroidScale, sticker.scale * polaroidScale)

    if (isImageSticker && sticker.dataUrl) {
      // Image sticker
      try {
        const stickerImg = await loadImage(sticker.dataUrl)
        const stickerSize = 80
        ctx.drawImage(stickerImg, -stickerSize / 2, -stickerSize / 2, stickerSize, stickerSize)
        console.log('[EXPORT] Drew image sticker:', sticker.src)
      } catch (e) {
        console.error('[EXPORT] Failed to load sticker image:', sticker.src, e)
      }
    } else if (!isImageSticker) {
      // Emoji sticker
      ctx.font = `30px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(sticker.src, 0, 0)
      console.log('[EXPORT] Drew emoji sticker:', sticker.src)
    }

    ctx.restore()
  }

  // Draw caption text
  const captionY = photoY + photoHeight + 18 * polaroidScale
  const captionText = data.praise || 'Give your day a pat.'
  ctx.font = `500 ${14 * polaroidScale}px "Inter", "Noto Sans KR", system-ui, sans-serif`
  ctx.fillStyle = data.praise ? '#374151' : '#9ca3af'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(captionText, polaroidX + scaledPolaroidW / 2, captionY)

  // Draw footer (time)
  const footerY = captionY + 28 * polaroidScale
  const timeText = data.createdAt
    ? new Date(data.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : ''
  ctx.font = `${10 * polaroidScale}px "Inter", system-ui, sans-serif`
  ctx.fillStyle = '#9ca3af'
  ctx.textAlign = 'left'
  ctx.fillText(timeText, photoX + 6 * polaroidScale, footerY)

  // Draw stamp if available (positioned inside photo area, bottom-right)
  if (data.showStamp && data.stampDataUrl) {
    console.log('[EXPORT] Loading stamp image...')
    try {
      const stampImg = await loadImage(data.stampDataUrl)
      const stampSize = 70 * polaroidScale
      // Position stamp at bottom-right of photo area
      const stampX = photoX + photoWidth - stampSize - 10 * polaroidScale
      const stampY = photoY + photoHeight - stampSize - 10 * polaroidScale

      // Draw stamp with circular clip and shadow
      ctx.save()
      ctx.shadowColor = 'rgba(0, 0, 0, 0.1)'
      ctx.shadowBlur = 10 * polaroidScale
      ctx.shadowOffsetY = 6 * polaroidScale

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

  // Draw DayPat brand text INSIDE the photo area (top-left overlay)
  // Using Caveat font (same as app header) with #F27430 color
  ctx.save()
  ctx.font = `bold ${brandFontSize}px ${BRAND_FONT_FAMILY}`
  ctx.fillStyle = BRAND_COLOR
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'

  // Position: top-left of PHOTO area (not canvas), with padding
  const brandPadX = 16 * polaroidScale
  const brandPadY = 12 * polaroidScale
  const brandX = photoX + brandPadX
  const brandY = photoY + brandPadY

  // Add subtle shadow for legibility on photos (very subtle)
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
  ctx.shadowBlur = 2
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 1

  ctx.fillText(BRAND_TEXT, brandX, brandY)
  ctx.restore()
  console.log('[EXPORT] Brand text drawn on photo area')

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
  /** Export target format (default: instagram_post) */
  exportTarget?: ExportTarget
}

/**
 * Capture the polaroid as a PNG data URL.
 * Uses canvas composition for reliable capture (bypasses html-to-image).
 *
 * @param options Export options including target format
 * @returns PNG data URL
 */
export async function capturePolaroidAsPng(options: ExportOptions): Promise<string> {
  const { photoPath, stickers, praise, showStamp, createdAt, exportTarget = 'instagram_post' } = options

  // Prepare export data (download from Supabase and convert to data URLs)
  const exportData = await prepareExportData(photoPath, stickers, praise, showStamp, createdAt)

  // Use canvas composition for reliable export
  return captureWithCanvas(exportData, exportTarget)
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
