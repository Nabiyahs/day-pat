'use client'

import { jsPDF } from 'jspdf'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { StickerState } from '@/types/database'
import { ensurePdfFontsReady, setKoreanFont } from '@/lib/pdf-fonts'
import { drawHeartIcon } from '@/components/icons/heart-icon'

// Re-export for backward compatibility
export type { ExportData } from '@/components/day/exportable-polaroid'

// Stamp image path (must match stamp-overlay.tsx)
const STAMP_IMAGE_PATH = '/image/seal-image.jpg'
const BUCKET_NAME = 'entry-photos'

// =============================================================================
// FIXED POLAROID LAYOUT - NEVER CHANGE BASED ON CONTENT
// =============================================================================
// These dimensions are ABSOLUTE and must NEVER be modified based on:
// - Comment text length
// - Photo existence
// - SNS target ratio
// - Any other content-dependent factor

const POLAROID_LAYOUT = {
  // Overall polaroid dimensions (FIXED)
  width: 340,
  height: 440,
  padding: 16,
  cornerRadius: 0,

  // Photo area (FIXED - never changes)
  photo: {
    x: 16,      // padding
    y: 16,      // padding
    width: 308, // 340 - 2*16
    height: 280,
    cornerRadius: 0,
  },

  // Comment area (FIXED - text clips if too long)
  // lineHeight: 1.625 matches Tailwind's "leading-relaxed" used in Day View
  comment: {
    x: 16,
    y: 314,     // photo.y + photo.height + 18
    width: 308,
    height: 80, // Fixed height - text MUST fit or be clipped
    fontSize: 14,
    lineHeight: 1.625, // MUST match Day View's "leading-relaxed" (Tailwind)
    maxLines: 4, // Maximum lines before truncation with ellipsis
    fontFamily: '"Inter", "Noto Sans KR", system-ui, sans-serif',
    fontWeight: 500,
    // Baseline adjustment for canvas vs DOM font metrics (fine-tune if needed)
    baselineAdjustPx: 2,
  },

  // Footer area (FIXED)
  footer: {
    y: 424, // height - 16
    sloganFontSize: 11,
    heartSize: 14, // Slightly smaller than Day View's 16px for better visual match in export
  },

  // Watermark (FIXED)
  watermark: {
    x: 28,  // photo.x + 12
    y: 28,  // photo.y + 12
    fontSize: 20,
  },

  // Stamp (FIXED)
  stamp: {
    size: 70,
    margin: 10,
  },
} as const

// Legacy constants for backward compatibility
const BASE_POLAROID_WIDTH = POLAROID_LAYOUT.width
const BASE_POLAROID_HEIGHT = POLAROID_LAYOUT.height
const BASE_PHOTO_AREA_HEIGHT = POLAROID_LAYOUT.photo.height
const BASE_PADDING = POLAROID_LAYOUT.padding
const BASE_CORNER_RADIUS = POLAROID_LAYOUT.cornerRadius
const BASE_PHOTO_CORNER_RADIUS = POLAROID_LAYOUT.photo.cornerRadius

// Brand text settings
const BRAND_TEXT = 'DayPat'
const BRAND_COLOR = '#F27430'
const BRAND_FONT_FAMILY = "'Caveat', cursive"
// Slogan text (replaces timestamp in export)
const SLOGAN_TEXT = 'EVERY DAY DESERVES A PAT.'
const SLOGAN_FONT_FAMILY = "'Open Sans', sans-serif"
// Background color (warm cream to match app theme)
const EXPORT_BACKGROUND_COLOR = '#FFFDF8'

// =============================================================================
// HEART ICON - Uses shared module for 100% consistency with Day View
// =============================================================================
// Heart icon is imported from @/components/icons/heart-icon
// This ensures the exact same SVG path and colors as Day View's AppIcon

// =============================================================================
// EXPORT TARGET DEFINITIONS
// =============================================================================

export type ExportTarget = 'instagram_post' | 'instagram_story' | 'instagram_reel'

interface TargetDimensions {
  width: number
  height: number
  /** Safe area padding (for story/reel UI overlays) */
  safePadding: { top: number; bottom: number; left: number; right: number }
}

/**
 * Get target canvas dimensions based on export format.
 */
function getTargetDimensions(target: ExportTarget): TargetDimensions {
  if (target === 'instagram_post') {
    return {
      width: 1080,
      height: 1080,
      safePadding: { top: 40, bottom: 40, left: 40, right: 40 },
    }
  } else {
    // instagram_story / instagram_reel: 9:16 aspect ratio
    return {
      width: 1080,
      height: 1920,
      safePadding: { top: 180, bottom: 260, left: 60, right: 60 },
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

// =============================================================================
// TEXT WRAPPING UTILITIES (for fixed-height comment box)
// =============================================================================

/**
 * Wrap text to fit within a maximum width.
 * Returns an array of lines that fit within maxWidth.
 *
 * @param ctx - Canvas context (font must be set before calling)
 * @param text - Text to wrap
 * @param maxWidth - Maximum width in pixels
 * @returns Array of text lines
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  if (!text) return []

  const words = text.split('')  // Split by character for better Korean support
  const lines: string[] = []
  let currentLine = ''

  for (const char of words) {
    const testLine = currentLine + char
    const metrics = ctx.measureText(testLine)

    if (metrics.width > maxWidth && currentLine.length > 0) {
      lines.push(currentLine)
      currentLine = char
    } else {
      currentLine = testLine
    }
  }

  if (currentLine) {
    lines.push(currentLine)
  }

  return lines
}

/**
 * Truncate lines array to maxLines, adding ellipsis to the last line if needed.
 *
 * @param ctx - Canvas context (font must be set before calling)
 * @param lines - Array of text lines
 * @param maxLines - Maximum number of lines
 * @param maxWidth - Maximum width for ellipsis fitting
 * @returns Truncated lines array
 */
function truncateWithEllipsis(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  maxLines: number,
  maxWidth: number
): string[] {
  if (lines.length <= maxLines) {
    return lines
  }

  const truncated = lines.slice(0, maxLines)
  let lastLine = truncated[truncated.length - 1]

  // Add ellipsis, truncating if necessary to fit
  const ellipsis = '…'
  while (lastLine.length > 0) {
    const testLine = lastLine + ellipsis
    if (ctx.measureText(testLine).width <= maxWidth) {
      truncated[truncated.length - 1] = testLine
      break
    }
    lastLine = lastLine.slice(0, -1)
  }

  return truncated
}

/**
 * Draw wrapped text within a fixed box, with clipping and ellipsis truncation.
 * The box dimensions are FIXED - text is clipped if it exceeds the box.
 *
 * Text rendering is optimized to match Day View (DOM) appearance:
 * - textBaseline: 'top' for consistent positioning
 * - Pixel rounding to eliminate sub-pixel blurring
 * - baselineAdjustPx for fine-tuning canvas vs DOM font metrics
 *
 * @param ctx - Canvas context
 * @param text - Text to draw
 * @param box - Fixed box dimensions { x, y, width, height }
 * @param options - Font and styling options
 */
function drawTextInFixedBox(
  ctx: CanvasRenderingContext2D,
  text: string,
  box: { x: number; y: number; width: number; height: number },
  options: {
    fontSize: number
    lineHeight: number
    maxLines: number
    fontFamily: string
    fontWeight: number
    color: string
    align: CanvasTextAlign
    placeholder?: string
    placeholderColor?: string
    /** Fine-tune vertical offset to match DOM text rendering (canvas vs browser font metrics) */
    baselineAdjustPx?: number
  }
): void {
  const { fontSize, lineHeight, maxLines, fontFamily, fontWeight, color, align, placeholder, placeholderColor, baselineAdjustPx = 0 } = options

  // Calculate line height in pixels and ROUND to integer for consistent spacing
  const lineHeightPx = Math.round(fontSize * lineHeight)

  // Set font
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`

  // Use placeholder if no text
  const displayText = text || placeholder || ''
  const displayColor = text ? color : (placeholderColor || '#9ca3af')

  // Wrap text (font must be set before this for accurate measurement)
  const lines = wrapText(ctx, displayText, box.width - 8) // Small padding

  // Truncate with ellipsis if exceeds maxLines
  const truncatedLines = truncateWithEllipsis(ctx, lines, maxLines, box.width - 8)

  // Clip to box area (safety measure)
  ctx.save()
  ctx.beginPath()
  ctx.rect(box.x, box.y, box.width, box.height)
  ctx.clip()

  // Draw text with consistent baseline
  ctx.fillStyle = displayColor
  ctx.textAlign = align
  ctx.textBaseline = 'top' // CRITICAL: Use 'top' for consistent positioning like DOM

  // PIXEL ROUNDING: Round coordinates to integers for crisp text rendering
  const startX = Math.round(align === 'center' ? box.x + box.width / 2 : box.x)
  // Apply baseline adjustment to match DOM font metrics
  const startY = Math.round(box.y + baselineAdjustPx)

  for (let i = 0; i < truncatedLines.length; i++) {
    // Calculate Y position with integer-based line height (no cumulative float error)
    const currentY = startY + i * lineHeightPx

    // Stop if we would draw outside the box
    if (currentY + lineHeightPx > box.y + box.height) {
      break
    }
    ctx.fillText(truncatedLines[i], startX, currentY)
  }

  ctx.restore()
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
  isLiked: boolean
  date: string // YYYY-MM-DD format for display
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
  createdAt: string | null,
  isLiked: boolean = false,
  date: string = '' // YYYY-MM-DD format
): Promise<InternalExportData> {
  console.log('=== PREPARE EXPORT DATA ===')
  console.log('[EXPORT] photoPath:', photoPath)
  console.log('[EXPORT] stickers count:', stickers.length)
  console.log('[EXPORT] showStamp:', showStamp)
  console.log('[EXPORT] isLiked:', isLiked)
  console.log('[EXPORT] date:', date)

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
    isLiked,
    date,
  }
}

/**
 * Wait for fonts to be loaded before drawing text.
 * CRITICAL: Comment font and date font must be loaded before drawing for accurate measurement.
 */
async function ensureFontsLoaded(): Promise<void> {
  if (typeof document === 'undefined') return

  const { comment, footer } = POLAROID_LAYOUT

  try {
    // Wait for all fonts to be ready
    await document.fonts.ready

    // Date font size (approximately 50-60% of heart size)
    const dateFontSize = Math.round(footer.heartSize * 0.6)

    // Specifically load the fonts we need (including comment font for accurate text measurement)
    await Promise.all([
      document.fonts.load(`bold 48px ${BRAND_FONT_FAMILY}`),  // DayPat watermark
      document.fonts.load(`500 11px ${SLOGAN_FONT_FAMILY}`),  // Slogan text
      document.fonts.load(`${comment.fontWeight} ${comment.fontSize}px "Inter"`),  // Comment font
      document.fonts.load(`${comment.fontWeight} ${comment.fontSize}px "Noto Sans KR"`),  // Korean fallback
      document.fonts.load(`400 ${dateFontSize}px "Noto Sans"`),  // Date text font
      document.fonts.load(`400 ${dateFontSize}px "Noto Sans KR"`),  // Date text Korean fallback
    ])
    console.log('[EXPORT] Fonts loaded successfully (including comment and date fonts)')
  } catch (e) {
    console.warn('[EXPORT] Font loading warning:', e)
    // Continue even if font loading fails - canvas will use fallback
  }
}

// =============================================================================
// STEP 1: RENDER POLAROID BASE CANVAS (at native BASE dimensions)
// =============================================================================

/**
 * Render the polaroid at its BASE dimensions (340x440).
 * This is the "source of truth" canvas - all internal elements are drawn
 * at their native coordinates with NO scaling.
 *
 * The resulting canvas will be composed onto the Instagram target using
 * a SINGLE uniform scale to preserve aspect ratio.
 */
async function renderPolaroidBaseCanvas(
  data: InternalExportData
): Promise<HTMLCanvasElement> {
  console.log('[EXPORT] renderPolaroidBaseCanvas: Starting base canvas render')

  // Create canvas at BASE dimensions (no scaling)
  const canvas = document.createElement('canvas')
  canvas.width = BASE_POLAROID_WIDTH
  canvas.height = BASE_POLAROID_HEIGHT
  const ctx = canvas.getContext('2d')!

  // All dimensions are at BASE scale (1x)
  const padding = BASE_PADDING
  const cornerRadius = BASE_CORNER_RADIUS
  const photoCornerRadius = BASE_PHOTO_CORNER_RADIUS
  const photoHeight = BASE_PHOTO_AREA_HEIGHT

  // White polaroid background (no shadow here - shadow is added in compose step)
  ctx.fillStyle = 'white'
  roundedRectPath(ctx, 0, 0, BASE_POLAROID_WIDTH, BASE_POLAROID_HEIGHT, cornerRadius)
  ctx.fill()

  // Photo area dimensions
  const photoX = padding
  const photoY = padding
  const photoWidth = BASE_POLAROID_WIDTH - 2 * padding

  // Photo area background (gray)
  ctx.fillStyle = '#f3f4f6'
  roundedRectPath(ctx, photoX, photoY, photoWidth, photoHeight, photoCornerRadius)
  ctx.fill()

  // Draw photo if available
  if (data.photoDataUrl) {
    console.log('[EXPORT] Loading photo image...')
    try {
      const photoImg = await loadImage(data.photoDataUrl)
      console.log('[EXPORT] Photo loaded:', photoImg.naturalWidth, 'x', photoImg.naturalHeight)

      // Clip to photo area
      ctx.save()
      roundedRectPath(ctx, photoX, photoY, photoWidth, photoHeight, photoCornerRadius)
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
  }

  // Draw stickers (at BASE scale)
  console.log('[EXPORT] Drawing', data.stickers.length, 'stickers...')
  for (const sticker of data.stickers) {
    const isImageSticker = sticker.src.startsWith('/')
    const stickerX = photoX + sticker.x * photoWidth
    const stickerY = photoY + sticker.y * photoHeight

    ctx.save()
    ctx.translate(stickerX, stickerY)
    ctx.rotate((sticker.rotation * Math.PI) / 180)
    ctx.scale(sticker.scale, sticker.scale) // No polaroidScale - native coordinates

    if (isImageSticker && sticker.dataUrl) {
      try {
        const stickerImg = await loadImage(sticker.dataUrl)
        const stickerSize = 80
        ctx.drawImage(stickerImg, -stickerSize / 2, -stickerSize / 2, stickerSize, stickerSize)
        console.log('[EXPORT] Drew image sticker:', sticker.src)
      } catch (e) {
        console.error('[EXPORT] Failed to load sticker image:', sticker.src, e)
      }
    } else if (!isImageSticker) {
      ctx.font = `30px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(sticker.src, 0, 0)
      console.log('[EXPORT] Drew emoji sticker:', sticker.src)
    }

    ctx.restore()
  }

  // Draw DayPat watermark at TOP-LEFT of PHOTO area (FIXED position from POLAROID_LAYOUT)
  const { watermark } = POLAROID_LAYOUT
  ctx.save()
  ctx.font = `600 ${watermark.fontSize}px ${BRAND_FONT_FAMILY}`
  ctx.fillStyle = BRAND_COLOR
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.shadowColor = 'rgba(255, 255, 255, 0.8)'
  ctx.shadowBlur = 3
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 1
  ctx.fillText(BRAND_TEXT, watermark.x, watermark.y)
  ctx.restore()
  console.log('[EXPORT] DayPat watermark drawn')

  // Draw stamp if available (FIXED size and position from POLAROID_LAYOUT)
  const { stamp } = POLAROID_LAYOUT
  if (data.showStamp && data.stampDataUrl) {
    console.log('[EXPORT] Loading stamp image...')
    try {
      const stampImg = await loadImage(data.stampDataUrl)
      const stampX = photoX + photoWidth - stamp.size - stamp.margin
      const stampY = photoY + photoHeight - stamp.size - stamp.margin

      ctx.save()
      ctx.shadowColor = 'rgba(0, 0, 0, 0.1)'
      ctx.shadowBlur = 10
      ctx.shadowOffsetY = 6

      ctx.beginPath()
      ctx.arc(stampX + stamp.size / 2, stampY + stamp.size / 2, stamp.size / 2, 0, Math.PI * 2)
      ctx.clip()

      ctx.drawImage(stampImg, stampX, stampY, stamp.size, stamp.size)
      ctx.restore()
      console.log('[EXPORT] Stamp drawn successfully')
    } catch (e) {
      console.error('[EXPORT] Failed to load stamp:', e)
    }
  }

  // Draw caption text in FIXED box (never expands based on content)
  // Uses POLAROID_LAYOUT.comment for all dimensions - these are FIXED constants
  // lineHeight matches Day View's "leading-relaxed" (1.625) for consistent bottom padding
  const { comment } = POLAROID_LAYOUT
  drawTextInFixedBox(
    ctx,
    data.praise || '',
    { x: comment.x, y: comment.y, width: comment.width, height: comment.height },
    {
      fontSize: comment.fontSize,
      lineHeight: comment.lineHeight, // 1.625 = Tailwind's "leading-relaxed"
      maxLines: comment.maxLines,
      fontFamily: comment.fontFamily,
      fontWeight: comment.fontWeight,
      color: '#374151',
      align: 'center',
      placeholder: 'Give your day a pat.',
      placeholderColor: '#9ca3af',
      baselineAdjustPx: comment.baselineAdjustPx, // Fine-tune for canvas vs DOM metrics
    }
  )
  console.log('[EXPORT] Caption drawn in fixed box:', comment.width, 'x', comment.height, 'lineHeight:', comment.lineHeight)

  // Draw footer: slogan on left, heart icon on right (FIXED positions from POLAROID_LAYOUT)
  const { footer } = POLAROID_LAYOUT
  const footerY = footer.y

  // Draw slogan
  ctx.save()
  ctx.font = `500 ${footer.sloganFontSize}px ${SLOGAN_FONT_FAMILY}`
  ctx.fillStyle = BRAND_COLOR
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(SLOGAN_TEXT, padding, footerY)
  ctx.restore()
  console.log('[EXPORT] Slogan drawn')

  // Draw heart icon using Font Awesome path (IDENTICAL to day view)
  // Uses the exact same SVG path as AppIcon's faHeart
  const heartSize = footer.heartSize
  const heartX = BASE_POLAROID_WIDTH - padding - heartSize / 2
  const heartY = footerY

  drawHeartIcon(ctx, heartX, heartY, heartSize, data.isLiked)
  console.log('[EXPORT] Heart icon drawn (shared module), isLiked:', data.isLiked)

  // Draw date text to the LEFT of heart icon (YYYY-MM-DD format)
  // Uses Noto Sans font in gray color, vertically centered with heart
  if (data.date) {
    const DATE_FONT_SIZE = Math.round(heartSize * 0.6) // ~10px (50-60% of heart size)
    const DATE_COLOR_GRAY = '#9ca3af' // gray-400 (less prominent than heart)
    const DATE_HEART_GAP = 8 // Gap between date and heart

    // Heart bounding box left edge
    const heartBoundingLeft = heartX - heartSize / 2

    ctx.save()
    ctx.font = `400 ${DATE_FONT_SIZE}px "Noto Sans", "Noto Sans KR", sans-serif`
    ctx.fillStyle = DATE_COLOR_GRAY
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'

    // Position date to the left of heart with gap
    const dateX = Math.round(heartBoundingLeft - DATE_HEART_GAP)
    const dateY = Math.round(heartY) // Same vertical center as heart

    ctx.fillText(data.date, dateX, dateY)
    ctx.restore()
    console.log('[EXPORT] Date drawn:', data.date, 'at', dateX, dateY)
  }

  console.log('[EXPORT] Base canvas complete:', BASE_POLAROID_WIDTH, 'x', BASE_POLAROID_HEIGHT)
  return canvas
}

// =============================================================================
// STEP 2: COMPOSE TO INSTAGRAM TARGET (single uniform scale - CONTAIN mode)
// =============================================================================

/**
 * Compose the polaroid base canvas onto an Instagram target canvas.
 *
 * CRITICAL: Uses a SINGLE uniform scale to preserve aspect ratio.
 * This is "contain" mode - the polaroid fits within the target while
 * maintaining its exact aspect ratio. Empty space becomes letterbox.
 *
 * @param polaroidCanvas - The base polaroid canvas (340x440)
 * @param target - Instagram export target format
 * @returns Target canvas with polaroid composed
 */
function composeToInstagramTarget(
  polaroidCanvas: HTMLCanvasElement,
  target: ExportTarget
): HTMLCanvasElement {
  const dims = getTargetDimensions(target)
  const { width: targetW, height: targetH, safePadding } = dims

  console.log('[EXPORT] composeToInstagramTarget:', { target, targetW, targetH })

  // Create target canvas
  const canvas = document.createElement('canvas')
  canvas.width = targetW
  canvas.height = targetH
  const ctx = canvas.getContext('2d')!

  // Fill background
  ctx.fillStyle = EXPORT_BACKGROUND_COLOR
  ctx.fillRect(0, 0, targetW, targetH)

  // Source dimensions (polaroid base canvas)
  const srcW = polaroidCanvas.width
  const srcH = polaroidCanvas.height
  const srcAspect = srcW / srcH

  // Available area (accounting for safe padding)
  const availableW = targetW - safePadding.left - safePadding.right
  const availableH = targetH - safePadding.top - safePadding.bottom

  // Calculate SINGLE uniform scale (CONTAIN mode)
  // This ensures aspect ratio is NEVER changed
  const scale = Math.min(availableW / srcW, availableH / srcH)

  // Calculate draw dimensions using the SINGLE scale
  const drawW = srcW * scale
  const drawH = srcH * scale

  // ASSERTION: Verify aspect ratio is preserved
  const drawAspect = drawW / drawH
  if (Math.abs(srcAspect - drawAspect) > 1e-6) {
    console.error('[EXPORT] CRITICAL: Aspect ratio changed!', { srcAspect, drawAspect })
    throw new Error(`Aspect ratio changed in share export: src=${srcAspect.toFixed(4)}, draw=${drawAspect.toFixed(4)}`)
  }

  // Center within available area
  const x = safePadding.left + (availableW - drawW) / 2
  const y = safePadding.top + (availableH - drawH) / 2

  console.log('[EXPORT] Composition:', {
    srcW,
    srcH,
    srcAspect: srcAspect.toFixed(4),
    scale: scale.toFixed(4),
    drawW: Math.round(drawW),
    drawH: Math.round(drawH),
    drawAspect: drawAspect.toFixed(4),
    x: Math.round(x),
    y: Math.round(y),
  })

  // Draw shadow first
  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.18)'
  ctx.shadowBlur = 25 * scale
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 12 * scale

  // Draw white background for shadow (same dimensions as polaroid)
  ctx.fillStyle = 'white'
  roundedRectPath(ctx, x, y, drawW, drawH, BASE_CORNER_RADIUS * scale)
  ctx.fill()
  ctx.restore()

  // Draw the polaroid canvas onto target using SINGLE uniform scale
  // drawImage(source, dx, dy, dWidth, dHeight)
  ctx.drawImage(polaroidCanvas, x, y, drawW, drawH)

  console.log('[EXPORT] Composition complete')
  return canvas
}

// =============================================================================
// MAIN EXPORT FUNCTION (two-step: base canvas -> compose to target)
// =============================================================================

/**
 * CANVAS COMPOSITION EXPORT
 *
 * TWO-STEP PROCESS to guarantee aspect ratio preservation:
 * 1. Render polaroid at BASE dimensions (340x440) - no scaling
 * 2. Compose onto Instagram target using SINGLE uniform scale (contain mode)
 *
 * This ensures the polaroid NEVER gets stretched horizontally or vertically.
 * Any empty space becomes letterbox (which is acceptable per requirements).
 */
async function captureWithCanvas(
  data: InternalExportData,
  target: ExportTarget = 'instagram_post'
): Promise<string> {
  console.log('=== CANVAS COMPOSITION EXPORT (TWO-STEP) ===')
  console.log('[EXPORT] Target:', target)
  console.log('[EXPORT] Data:', {
    hasPhoto: !!data.photoDataUrl,
    hasStamp: !!data.stampDataUrl,
    stickersCount: data.stickers.length,
    praise: data.praise?.substring(0, 30),
    isLiked: data.isLiked,
  })

  // Ensure fonts are loaded before drawing
  await ensureFontsLoaded()

  // STEP 1: Render polaroid at BASE dimensions (no scaling)
  const baseCanvas = await renderPolaroidBaseCanvas(data)
  console.log('[EXPORT] Step 1 complete: Base canvas', baseCanvas.width, 'x', baseCanvas.height)

  // STEP 2: Compose onto Instagram target (single uniform scale)
  const targetCanvas = composeToInstagramTarget(baseCanvas, target)
  console.log('[EXPORT] Step 2 complete: Target canvas', targetCanvas.width, 'x', targetCanvas.height)

  // Export as PNG
  const dataUrl = targetCanvas.toDataURL('image/png')
  console.log('[EXPORT] Export complete, dataUrl length:', dataUrl.length)
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
  /** Whether the entry is liked (shows filled heart) */
  isLiked?: boolean
}

/**
 * Capture the polaroid as a PNG data URL.
 * Uses canvas composition for reliable capture (bypasses html-to-image).
 *
 * @param options Export options including target format
 * @returns PNG data URL
 */
export async function capturePolaroidAsPng(options: ExportOptions): Promise<string> {
  const { photoPath, stickers, praise, showStamp, createdAt, exportTarget = 'instagram_post', isLiked = false, date } = options

  // Prepare export data (download from Supabase and convert to data URLs)
  const exportData = await prepareExportData(photoPath, stickers, praise, showStamp, createdAt, isLiked, date)

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
  const { date, isLiked = false } = options

  // Prepare export data and capture using canvas
  const exportData = await prepareExportData(
    options.photoPath,
    options.stickers,
    options.praise,
    options.showStamp,
    options.createdAt,
    isLiked,
    date
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

  // Load Korean font for proper text rendering
  await ensurePdfFontsReady(pdf)

  // Load image to get dimensions
  const img = new Image()
  img.src = dataUrl
  await new Promise((resolve) => {
    img.onload = resolve
  })

  // ========== HEADER SECTION ==========
  const headerY = margin

  pdf.setFontSize(28)
  setKoreanFont(pdf, 'bold')
  pdf.setTextColor(31, 41, 55)
  const formattedDate = formatPdfDate(date)
  pdf.text(formattedDate, pageWidth / 2, headerY, { align: 'center' })

  pdf.setFontSize(14)
  setKoreanFont(pdf, 'normal')
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
  setKoreanFont(pdf, 'normal')
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
        // Share image only - no title/text to avoid unwanted text in KakaoTalk and other apps
        await navigator.share({
          files: [file],
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
