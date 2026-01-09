'use client'

/**
 * View-Based Export Renderer
 *
 * This module renders Day/Week/Month views as canvas images for PDF export.
 * Each view is rendered exactly as it appears on screen, not as a date range listing.
 *
 * Key Principles:
 * - DOM capture is FORBIDDEN (no html2canvas, html-to-image, foreignObject)
 * - All rendering uses Canvas composition (drawImage, fillText, etc.)
 * - Images are fetched via Supabase download() to avoid CORS issues
 * - Week view supports multi-page pagination (no text clipping)
 */

import { getSupabaseClient } from '@/lib/supabase/client'
import { formatDateString, getWeekRange, getMonthRange, getWeekDays } from '@/lib/utils'
import { startOfWeek, startOfMonth, format, getWeek, isSameMonth, isToday, addDays } from 'date-fns'

// ============================================================
// TYPES
// ============================================================

export interface PageImage {
  dataUrl: string
  width: number
  height: number
  pageNumber: number
  totalPages: number
}

export interface DayEntryData {
  date: string
  photoPath: string | null
  photoDataUrl: string | null
  praise: string | null
  stickers: StickerData[]
  isLiked: boolean
}

export interface StickerData {
  src: string
  x: number
  y: number
  scale: number
  rotation: number
  dataUrl?: string
}

export interface WeekEntryData {
  date: string
  thumbUrl: string | null
  thumbDataUrl: string | null
  caption: string | null
}

export interface MonthEntryData {
  date: string
  thumbUrl: string | null
  thumbDataUrl: string | null
}

// ============================================================
// CONSTANTS
// ============================================================

const BUCKET_NAME = 'entry-photos'
const STAMP_IMAGE_PATH = '/image/seal-image.jpg'

// PDF page dimensions (A4 at 150 DPI for good quality)
const PDF_PAGE = {
  width: 1240,   // ~210mm at 150 DPI
  height: 1754,  // ~297mm at 150 DPI
  margin: 60,
  headerHeight: 100,
}

// Week View layout constants
const WEEK_LAYOUT = {
  cardWidth: 1120,  // PDF_PAGE.width - 2 * margin
  cardPadding: 20,
  photoHeight: 200,
  dateColumnWidth: 80,
  cardGap: 24,
  fontSize: {
    dayName: 14,
    dayNumber: 36,
    caption: 18,
  },
  lineHeight: 1.5,
  fontFamily: '"Inter", "Noto Sans KR", system-ui, sans-serif',
}

// Month View layout constants
const MONTH_LAYOUT = {
  gridGap: 2,
  cellPadding: 4,
  headerHeight: 80,
  weekdayHeight: 40,
  fontSize: {
    title: 32,
    weekday: 14,
    dayNumber: 14,
  },
  fontFamily: '"Inter", "Noto Sans KR", system-ui, sans-serif',
}

// Day Polaroid layout (matches export-polaroid.ts)
// lineHeight: 1.625 matches Tailwind's "leading-relaxed" used in Day View
const POLAROID_LAYOUT = {
  width: 340,
  height: 440,
  padding: 16,
  photo: { x: 16, y: 16, width: 308, height: 280 },
  comment: {
    x: 16,
    y: 314,
    width: 308,
    height: 80,
    fontSize: 14,
    lineHeight: 1.625, // MUST match Day View's "leading-relaxed" (Tailwind)
    maxLines: 4,
    fontFamily: '"Inter", "Noto Sans KR", system-ui, sans-serif',
    fontWeight: 500,
    baselineAdjustPx: 2, // Fine-tune for canvas vs DOM metrics
  },
  footer: { y: 424, sloganFontSize: 11, heartSize: 16 },
  watermark: { x: 28, y: 28, fontSize: 20 },
  stamp: { size: 70, margin: 10 },
}

const BRAND_TEXT = 'DayPat'
const BRAND_COLOR = '#F27430'
const BRAND_FONT_FAMILY = "'Caveat', cursive"
const SLOGAN_TEXT = 'EVERY DAY DESERVES A PAT.'
const SLOGAN_FONT_FAMILY = "'Open Sans', sans-serif"
const EXPORT_BACKGROUND_COLOR = '#FFFDF8'

const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// =============================================================================
// HEART ICON SVG PATH (Font Awesome faHeart - identical to day view)
// =============================================================================
// This is the exact same SVG path used by Font Awesome's solid heart icon
// which is rendered in the day view via AppIcon component.
// ViewBox: 512x512
const FA_HEART_PATH = 'M241 87.1l15 20.7 15-20.7C296 52.5 336.2 32 378.9 32 452.4 32 512 91.6 512 165.1l0 2.6c0 112.2-139.9 242.5-212.9 298.2-12.4 9.4-27.6 14.1-43.1 14.1s-30.8-4.6-43.1-14.1C139.9 410.2 0 279.9 0 167.7l0-2.6C0 91.6 59.6 32 133.1 32 175.8 32 216 52.5 241 87.1z'
const FA_HEART_VIEWBOX = 512

/**
 * Draw Font Awesome heart icon on canvas.
 * Uses the exact same SVG path as the day view's AppIcon component.
 */
function drawFontAwesomeHeart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  filled: boolean
): void {
  ctx.save()
  const scale = size / FA_HEART_VIEWBOX
  ctx.translate(x - size / 2, y - size / 2)
  ctx.scale(scale, scale)
  const path = new Path2D(FA_HEART_PATH)
  if (filled) {
    // Liked state: filled red (matches day view's text-red-500 = #ef4444)
    ctx.fillStyle = '#ef4444'
    ctx.fill(path)
  } else {
    // Not liked state: filled gray (matches day view's text-gray-400 = #9ca3af)
    // Day View shows SOLID gray heart (filled), not just outline
    ctx.fillStyle = '#9ca3af'
    ctx.fill(path)
  }
  ctx.restore()
}

// ============================================================
// IMAGE UTILITIES
// ============================================================

/**
 * Download image from Supabase Storage and convert to data URL.
 */
async function downloadSupabaseImage(path: string): Promise<string | null> {
  try {
    const supabase = getSupabaseClient()
    const { data: blob, error } = await supabase.storage
      .from(BUCKET_NAME)
      .download(path)

    if (error || !blob) {
      console.error('[ViewRenderer] Supabase download error:', error?.message)
      return null
    }

    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('[ViewRenderer] downloadSupabaseImage exception:', error)
    return null
  }
}

/**
 * Fetch a local image URL and convert to data URL.
 */
async function fetchLocalImage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null

    const blob = await response.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('[ViewRenderer] fetchLocalImage exception:', error)
    return null
  }
}

/**
 * Load an image from a data URL.
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
 * Wait for fonts to be loaded.
 */
async function ensureFontsLoaded(): Promise<void> {
  if (typeof document === 'undefined') return

  try {
    await document.fonts.ready
    await Promise.all([
      document.fonts.load(`bold 48px ${BRAND_FONT_FAMILY}`),
      document.fonts.load(`500 11px ${SLOGAN_FONT_FAMILY}`),
      document.fonts.load(`500 18px ${WEEK_LAYOUT.fontFamily}`),
    ])
  } catch (e) {
    console.warn('[ViewRenderer] Font loading warning:', e)
  }
}

// ============================================================
// TEXT MEASUREMENT AND WRAPPING
// ============================================================

/**
 * Wrap text to fit within a maximum width.
 * Uses character-by-character wrapping for Korean support.
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  if (!text) return []

  const lines: string[] = []
  let currentLine = ''

  for (const char of text) {
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
 * Measure the height of wrapped text.
 */
function measureTextHeight(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  fontSize: number,
  lineHeight: number
): number {
  const lines = wrapText(ctx, text, maxWidth)
  return lines.length * fontSize * lineHeight
}

/**
 * Truncate lines with ellipsis if exceeds maxLines.
 */
function truncateWithEllipsis(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  maxLines: number,
  maxWidth: number
): string[] {
  if (lines.length <= maxLines) return lines

  const truncated = lines.slice(0, maxLines)
  let lastLine = truncated[truncated.length - 1]

  const ellipsis = '...'
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

// ============================================================
// CANVAS DRAWING UTILITIES
// ============================================================

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

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: string
): void {
  ctx.fillStyle = fill
  roundedRectPath(ctx, x, y, width, height, radius)
  ctx.fill()
}

// ============================================================
// DATA FETCHING
// ============================================================

/**
 * Fetch day entry data for a specific date.
 */
async function fetchDayEntry(date: string): Promise<DayEntryData | null> {
  const supabase = getSupabaseClient()

  const { data: entry, error } = await supabase
    .from('entries')
    .select('*')
    .eq('entry_date', date)
    .single()

  if (error || !entry) return null

  // Download photo
  let photoDataUrl: string | null = null
  if (entry.photo_path) {
    photoDataUrl = await downloadSupabaseImage(entry.photo_path)
  }

  // Process stickers from sticker_state column
  // sticker_state is stored as { stickers: [...] } in the database
  const stickers: StickerData[] = []
  const stickerStateData = entry.sticker_state as { stickers?: unknown[] } | unknown[] | null
  const rawStickers = Array.isArray(stickerStateData)
    ? stickerStateData  // Legacy: direct array
    : (stickerStateData as { stickers?: unknown[] })?.stickers || []

  if (Array.isArray(rawStickers)) {
    for (const sticker of rawStickers as Array<{ src: string; x: number; y: number; scale?: number; rotation?: number }>) {
      let dataUrl: string | undefined
      if (sticker.src?.startsWith('/')) {
        dataUrl = await fetchLocalImage(sticker.src) || undefined
      }
      stickers.push({
        src: sticker.src,
        x: sticker.x,
        y: sticker.y,
        scale: sticker.scale || 1,
        rotation: sticker.rotation || 0,
        dataUrl,
      })
    }
  }

  return {
    date,
    photoPath: entry.photo_path,
    photoDataUrl,
    praise: entry.praise,
    stickers,
    isLiked: entry.is_liked || false,
  }
}

/**
 * Fetch week entries for a week starting from anchorDate.
 */
async function fetchWeekEntries(anchorDate: Date): Promise<Map<string, WeekEntryData>> {
  const supabase = getSupabaseClient()
  const { start, end } = getWeekRange(anchorDate)

  const { data: entries, error } = await supabase
    .from('entries')
    .select('entry_date, praise, photo_path')
    .gte('entry_date', start)
    .lte('entry_date', end)

  const weekData = new Map<string, WeekEntryData>()

  if (!entries || error) return weekData

  for (const entry of entries) {
    let thumbDataUrl: string | null = null
    if (entry.photo_path) {
      thumbDataUrl = await downloadSupabaseImage(entry.photo_path)
    }

    weekData.set(entry.entry_date, {
      date: entry.entry_date,
      thumbUrl: null,
      thumbDataUrl,
      caption: entry.praise,
    })
  }

  return weekData
}

/**
 * Fetch month entries for a specific month.
 */
async function fetchMonthEntries(year: number, month: number): Promise<Map<string, MonthEntryData>> {
  const supabase = getSupabaseClient()
  const { start, end } = getMonthRange(year, month)

  const { data: entries, error } = await supabase
    .from('entries')
    .select('entry_date, photo_path')
    .gte('entry_date', start)
    .lte('entry_date', end)

  const monthData = new Map<string, MonthEntryData>()

  if (!entries || error) return monthData

  for (const entry of entries) {
    let thumbDataUrl: string | null = null
    if (entry.photo_path) {
      thumbDataUrl = await downloadSupabaseImage(entry.photo_path)
    }

    monthData.set(entry.entry_date, {
      date: entry.entry_date,
      thumbUrl: null,
      thumbDataUrl,
    })
  }

  return monthData
}

// ============================================================
// DATA FILTERING UTILITIES
// ============================================================

/**
 * Check if an entry has any meaningful data.
 * Data exists if: praise, photo_path, or stickers (non-empty).
 *
 * NOTE: sticker_state is stored as { stickers: [...] } in the database.
 */
function hasEntryData(entry: {
  praise?: string | null
  photo_path?: string | null
  sticker_state?: { stickers?: unknown[] } | unknown[] | null
}): boolean {
  if (entry.praise && entry.praise.trim().length > 0) return true
  if (entry.photo_path) return true
  // Handle sticker_state: can be { stickers: [...] } or legacy direct array
  if (entry.sticker_state) {
    if (Array.isArray(entry.sticker_state) && entry.sticker_state.length > 0) return true
    if (typeof entry.sticker_state === 'object' && 'stickers' in entry.sticker_state) {
      const stickers = (entry.sticker_state as { stickers?: unknown[] }).stickers
      if (Array.isArray(stickers) && stickers.length > 0) return true
    }
  }
  return false
}

/**
 * Fetch all dates that have data within a date range (single DB query).
 * Returns a Set of date strings (YYYY-MM-DD) for efficient lookup.
 */
export async function fetchDatesWithDataInRange(
  fromDate: string,
  toDate: string
): Promise<Set<string>> {
  const supabase = getSupabaseClient()

  const { data: entries, error } = await supabase
    .from('entries')
    .select('entry_date, praise, photo_path, sticker_state')
    .gte('entry_date', fromDate)
    .lte('entry_date', toDate)

  const datesWithData = new Set<string>()

  if (error) {
    console.error('[ViewRenderer] fetchDatesWithDataInRange error:', error.message)
    return datesWithData
  }

  if (!entries) {
    return datesWithData
  }

  for (const entry of entries) {
    if (hasEntryData(entry)) {
      datesWithData.add(entry.entry_date)
    }
  }

  console.log('[ViewRenderer] Dates with data in range:', datesWithData.size)

  return datesWithData
}

/**
 * Get dates with data as an array (for Day export).
 */
export async function getDateKeysWithDataInRange(
  fromDate: string,
  toDate: string
): Promise<string[]> {
  const datesSet = await fetchDatesWithDataInRange(fromDate, toDate)
  // Sort dates chronologically
  return Array.from(datesSet).sort()
}

/**
 * Get week anchors that have at least one day with data.
 */
export async function getWeeksWithAnyData(
  fromDate: string,
  toDate: string
): Promise<Date[]> {
  const datesWithData = await fetchDatesWithDataInRange(fromDate, toDate)
  const weekAnchors = generateWeekAnchors(fromDate, toDate)

  // Filter weeks that have at least one day with data
  return weekAnchors.filter((anchor) => {
    const weekStart = startOfWeek(anchor, { weekStartsOn: 1 })
    // Check all 7 days of the week
    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStart, i)
      const dateStr = formatDateString(day)
      if (datesWithData.has(dateStr)) {
        return true
      }
    }
    return false
  })
}

/**
 * Get month anchors that have at least one day with data.
 */
export async function getMonthsWithAnyData(
  fromDate: string,
  toDate: string
): Promise<Array<{ year: number; month: number }>> {
  const datesWithData = await fetchDatesWithDataInRange(fromDate, toDate)
  const monthAnchors = generateMonthAnchors(fromDate, toDate)

  // Filter months that have at least one day with data
  return monthAnchors.filter(({ year, month }) => {
    // Check if any date in this month has data
    for (const dateStr of datesWithData) {
      const date = new Date(dateStr + 'T00:00:00')
      if (date.getFullYear() === year && date.getMonth() === month) {
        return true
      }
    }
    return false
  })
}

// ============================================================
// DAY PAGE RENDERER
// ============================================================

/**
 * Render a single day as a polaroid image (same as SNS share).
 */
async function renderDayPolaroid(entry: DayEntryData): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas')
  canvas.width = POLAROID_LAYOUT.width
  canvas.height = POLAROID_LAYOUT.height
  const ctx = canvas.getContext('2d')!

  // White background
  ctx.fillStyle = 'white'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Photo area background
  const photo = POLAROID_LAYOUT.photo
  ctx.fillStyle = '#f3f4f6'
  ctx.fillRect(photo.x, photo.y, photo.width, photo.height)

  // Draw photo
  if (entry.photoDataUrl) {
    try {
      const img = await loadImage(entry.photoDataUrl)
      ctx.save()
      ctx.beginPath()
      ctx.rect(photo.x, photo.y, photo.width, photo.height)
      ctx.clip()

      // Cover fit
      const imgAspect = img.naturalWidth / img.naturalHeight
      const areaAspect = photo.width / photo.height
      let drawWidth: number, drawHeight: number, drawX: number, drawY: number

      if (imgAspect > areaAspect) {
        drawHeight = photo.height
        drawWidth = drawHeight * imgAspect
        drawX = photo.x - (drawWidth - photo.width) / 2
        drawY = photo.y
      } else {
        drawWidth = photo.width
        drawHeight = drawWidth / imgAspect
        drawX = photo.x
        drawY = photo.y - (drawHeight - photo.height) / 2
      }

      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)
      ctx.restore()
    } catch (e) {
      console.error('[ViewRenderer] Failed to draw photo:', e)
    }
  }

  // Draw stickers
  for (const sticker of entry.stickers) {
    const stickerX = photo.x + sticker.x * photo.width
    const stickerY = photo.y + sticker.y * photo.height

    ctx.save()
    ctx.translate(stickerX, stickerY)
    ctx.rotate((sticker.rotation * Math.PI) / 180)
    ctx.scale(sticker.scale, sticker.scale)

    if (sticker.dataUrl) {
      try {
        const stickerImg = await loadImage(sticker.dataUrl)
        const stickerSize = 80
        ctx.drawImage(stickerImg, -stickerSize / 2, -stickerSize / 2, stickerSize, stickerSize)
      } catch (e) {
        console.error('[ViewRenderer] Failed to draw sticker:', e)
      }
    } else if (!sticker.src.startsWith('/')) {
      // Emoji
      ctx.font = '30px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(sticker.src, 0, 0)
    }

    ctx.restore()
  }

  // Watermark
  const watermark = POLAROID_LAYOUT.watermark
  ctx.save()
  ctx.font = `600 ${watermark.fontSize}px ${BRAND_FONT_FAMILY}`
  ctx.fillStyle = BRAND_COLOR
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.shadowColor = 'rgba(255, 255, 255, 0.8)'
  ctx.shadowBlur = 3
  ctx.fillText(BRAND_TEXT, watermark.x, watermark.y)
  ctx.restore()

  // Stamp (shown when entry is liked)
  if (entry.isLiked) {
    const stamp = POLAROID_LAYOUT.stamp
    const stampDataUrl = await fetchLocalImage(STAMP_IMAGE_PATH)
    if (stampDataUrl) {
      try {
        const stampImg = await loadImage(stampDataUrl)
        const stampX = photo.x + photo.width - stamp.size - stamp.margin
        const stampY = photo.y + photo.height - stamp.size - stamp.margin

        ctx.save()
        ctx.shadowColor = 'rgba(0, 0, 0, 0.1)'
        ctx.shadowBlur = 10
        ctx.shadowOffsetY = 6
        // Circular clip for stamp
        ctx.beginPath()
        ctx.arc(stampX + stamp.size / 2, stampY + stamp.size / 2, stamp.size / 2, 0, Math.PI * 2)
        ctx.clip()
        ctx.drawImage(stampImg, stampX, stampY, stamp.size, stamp.size)
        ctx.restore()
      } catch (e) {
        console.error('[ViewRenderer] Failed to draw stamp:', e)
      }
    }
  }

  // Caption - render with same settings as export-polaroid.ts
  // Uses lineHeight 1.625 (Tailwind's "leading-relaxed") to match Day View
  const comment = POLAROID_LAYOUT.comment
  ctx.font = `${comment.fontWeight} ${comment.fontSize}px ${comment.fontFamily}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top' // CRITICAL: Use 'top' for consistent positioning like DOM

  const displayText = entry.praise || 'Give your day a pat.'
  const displayColor = entry.praise ? '#374151' : '#9ca3af'
  ctx.fillStyle = displayColor

  const lines = wrapText(ctx, displayText, comment.width - 8)
  const truncatedLines = truncateWithEllipsis(ctx, lines, comment.maxLines, comment.width - 8)
  // PIXEL ROUNDING: Round lineHeight to integer for consistent spacing
  const lineHeightPx = Math.round(comment.fontSize * comment.lineHeight)

  ctx.save()
  ctx.beginPath()
  ctx.rect(comment.x, comment.y, comment.width, comment.height)
  ctx.clip()

  // PIXEL ROUNDING: Round coordinates to integers for crisp text rendering
  const startX = Math.round(comment.x + comment.width / 2)
  const startY = Math.round(comment.y + comment.baselineAdjustPx)

  for (let i = 0; i < truncatedLines.length; i++) {
    // Calculate Y position with integer-based line height (no cumulative float error)
    const currentY = startY + i * lineHeightPx
    ctx.fillText(truncatedLines[i], startX, currentY)
  }
  ctx.restore()

  // Footer: slogan
  const footer = POLAROID_LAYOUT.footer
  ctx.font = `500 ${footer.sloganFontSize}px ${SLOGAN_FONT_FAMILY}`
  ctx.fillStyle = BRAND_COLOR
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(SLOGAN_TEXT, POLAROID_LAYOUT.padding, footer.y)

  // Heart icon using Font Awesome path (IDENTICAL to day view)
  const heartSize = footer.heartSize
  const heartX = POLAROID_LAYOUT.width - POLAROID_LAYOUT.padding - heartSize / 2
  const heartY = footer.y
  drawFontAwesomeHeart(ctx, heartX, heartY, heartSize, entry.isLiked)

  return canvas
}

/**
 * Render day entry as PDF page image.
 * Polaroid is centered on a warm cream background.
 */
async function renderDayAsPage(entry: DayEntryData): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas')
  canvas.width = PDF_PAGE.width
  canvas.height = PDF_PAGE.height
  const ctx = canvas.getContext('2d')!

  // Background
  ctx.fillStyle = EXPORT_BACKGROUND_COLOR
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Render polaroid
  const polaroid = await renderDayPolaroid(entry)

  // Scale and center polaroid
  const maxWidth = PDF_PAGE.width - PDF_PAGE.margin * 2
  const maxHeight = PDF_PAGE.height - PDF_PAGE.margin * 2 - 100 // Leave room for header
  const scale = Math.min(maxWidth / polaroid.width, maxHeight / polaroid.height, 2.5)

  const drawWidth = polaroid.width * scale
  const drawHeight = polaroid.height * scale
  const drawX = (PDF_PAGE.width - drawWidth) / 2
  const drawY = PDF_PAGE.margin + 80 + (maxHeight - drawHeight) / 2

  // Draw shadow
  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.15)'
  ctx.shadowBlur = 30
  ctx.shadowOffsetY = 15
  ctx.fillStyle = 'white'
  ctx.fillRect(drawX, drawY, drawWidth, drawHeight)
  ctx.restore()

  // Draw polaroid
  ctx.drawImage(polaroid, drawX, drawY, drawWidth, drawHeight)

  // Header with date
  const date = new Date(entry.date + 'T00:00:00')
  const dateStr = format(date, 'yyyy.MM.dd')
  const weekday = format(date, 'EEEE')

  ctx.font = `bold 36px ${WEEK_LAYOUT.fontFamily}`
  ctx.fillStyle = '#1f2937'
  ctx.textAlign = 'center'
  ctx.fillText(dateStr, PDF_PAGE.width / 2, PDF_PAGE.margin + 40)

  ctx.font = `500 18px ${WEEK_LAYOUT.fontFamily}`
  ctx.fillStyle = '#6b7280'
  ctx.fillText(weekday, PDF_PAGE.width / 2, PDF_PAGE.margin + 65)

  return canvas
}

/**
 * Render Day View pages for export.
 * Uses the current selected date to render a single day.
 */
export async function renderDayPageImages(selectedDate: string): Promise<PageImage[]> {
  console.log('[ViewRenderer] renderDayPageImages:', selectedDate)
  await ensureFontsLoaded()

  const entry = await fetchDayEntry(selectedDate)

  if (!entry) {
    console.warn('[ViewRenderer] No entry found for date:', selectedDate)
    // Return empty page with message
    const canvas = document.createElement('canvas')
    canvas.width = PDF_PAGE.width
    canvas.height = PDF_PAGE.height
    const ctx = canvas.getContext('2d')!

    ctx.fillStyle = EXPORT_BACKGROUND_COLOR
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.font = `500 24px ${WEEK_LAYOUT.fontFamily}`
    ctx.fillStyle = '#9ca3af'
    ctx.textAlign = 'center'
    ctx.fillText('No entry for this date', PDF_PAGE.width / 2, PDF_PAGE.height / 2)

    return [{
      dataUrl: canvas.toDataURL('image/png'),
      width: canvas.width,
      height: canvas.height,
      pageNumber: 1,
      totalPages: 1,
    }]
  }

  const pageCanvas = await renderDayAsPage(entry)

  return [{
    dataUrl: pageCanvas.toDataURL('image/png'),
    width: pageCanvas.width,
    height: pageCanvas.height,
    pageNumber: 1,
    totalPages: 1,
  }]
}

// ============================================================
// WEEK PAGE RENDERER WITH MULTI-PAGE PAGINATION
// ============================================================

interface WeekCardMeasurement {
  date: Date
  dateStr: string
  entry: WeekEntryData | null
  cardHeight: number
  captionLines: string[]
}

/**
 * A "slice" of a week card that fits on a single page.
 * When a card's caption is too long, it gets split into multiple slices.
 */
interface WeekCardSlice {
  /** Original card measurement */
  card: WeekCardMeasurement
  /** Height of this slice */
  sliceHeight: number
  /** Which caption lines to render (start index, inclusive) */
  captionStartLine: number
  /** Which caption lines to render (end index, exclusive) */
  captionEndLine: number
  /** Is this the first slice of the card? (shows photo and date) */
  isFirstSlice: boolean
  /** Is this the last slice of the card? (no continuation indicator) */
  isLastSlice: boolean
}

/**
 * Measure week cards and calculate their heights.
 * IMPORTANT: Only includes days that have actual data (photo or caption).
 * Days without entries are excluded from PDF export.
 */
function measureWeekCards(
  ctx: CanvasRenderingContext2D,
  weekDays: Date[],
  weekData: Map<string, WeekEntryData>
): WeekCardMeasurement[] {
  const measurements: WeekCardMeasurement[] = []
  const captionMaxWidth = WEEK_LAYOUT.cardWidth - WEEK_LAYOUT.dateColumnWidth - WEEK_LAYOUT.cardPadding * 3

  ctx.font = `500 ${WEEK_LAYOUT.fontSize.caption}px ${WEEK_LAYOUT.fontFamily}`

  for (const date of weekDays) {
    const dateStr = formatDateString(date)
    const entry = weekData.get(dateStr) || null

    // EXPORT FIX: Only include days that have actual data
    // Skip days without photo or caption
    if (!entry || (!entry.thumbDataUrl && !entry.caption)) {
      continue
    }

    let captionLines: string[] = []
    let captionHeight = 0

    if (entry?.caption) {
      captionLines = wrapText(ctx, entry.caption, captionMaxWidth)
      captionHeight = captionLines.length * WEEK_LAYOUT.fontSize.caption * WEEK_LAYOUT.lineHeight
    }

    // Card height = padding + max(photo height, date column) + caption + padding
    const baseHeight = WEEK_LAYOUT.cardPadding * 2 + WEEK_LAYOUT.photoHeight
    const totalHeight = baseHeight + (captionLines.length > 0 ? captionHeight + WEEK_LAYOUT.cardPadding : 0)

    measurements.push({
      date,
      dateStr,
      entry,
      cardHeight: Math.max(totalHeight, 120), // Minimum card height
      captionLines,
    })
  }

  return measurements
}

/**
 * Calculate how many caption lines can fit in available height.
 */
function calculateFittingCaptionLines(
  availableHeight: number,
  includePhotoAndDate: boolean
): number {
  const lineHeight = WEEK_LAYOUT.fontSize.caption * WEEK_LAYOUT.lineHeight
  const baseHeight = includePhotoAndDate
    ? WEEK_LAYOUT.cardPadding * 2 + WEEK_LAYOUT.photoHeight + WEEK_LAYOUT.cardPadding
    : WEEK_LAYOUT.cardPadding * 2 // Just padding for continuation
  const heightForCaption = availableHeight - baseHeight
  return Math.max(0, Math.floor(heightForCaption / lineHeight))
}

/**
 * Calculate slice height based on caption lines.
 */
function calculateSliceHeight(
  numCaptionLines: number,
  isFirstSlice: boolean
): number {
  const lineHeight = WEEK_LAYOUT.fontSize.caption * WEEK_LAYOUT.lineHeight
  const captionHeight = numCaptionLines * lineHeight

  if (isFirstSlice) {
    // First slice includes photo and date
    const baseHeight = WEEK_LAYOUT.cardPadding * 2 + WEEK_LAYOUT.photoHeight
    return baseHeight + (numCaptionLines > 0 ? captionHeight + WEEK_LAYOUT.cardPadding : 0)
  } else {
    // Continuation slice - just caption with padding
    return WEEK_LAYOUT.cardPadding * 2 + captionHeight
  }
}

/**
 * Split week cards into pages based on available height.
 * Uses greedy algorithm to maximize density without clipping.
 *
 * KEY FEATURE: When a single card's caption exceeds page height,
 * the card is split into multiple "slices" across pages.
 * This ensures NO text is ever clipped.
 */
function splitIntoPages(
  measurements: WeekCardMeasurement[],
  availableHeight: number
): WeekCardSlice[][] {
  const pages: WeekCardSlice[][] = []
  let currentPage: WeekCardSlice[] = []
  let currentHeight = 0

  for (const card of measurements) {
    const totalCaptionLines = card.captionLines.length

    // Check if card fits entirely on current page
    if (currentHeight + card.cardHeight <= availableHeight || currentPage.length === 0) {
      // Check if card fits on this page (or if page is empty, we must start here)
      if (currentHeight + card.cardHeight <= availableHeight) {
        // Whole card fits
        currentPage.push({
          card,
          sliceHeight: card.cardHeight,
          captionStartLine: 0,
          captionEndLine: totalCaptionLines,
          isFirstSlice: true,
          isLastSlice: true,
        })
        currentHeight += card.cardHeight + WEEK_LAYOUT.cardGap
      } else {
        // Card doesn't fit but page is empty - need to split this card
        let remainingLines = totalCaptionLines
        let currentStartLine = 0
        let isFirst = true

        while (remainingLines > 0 || isFirst) {
          const availableOnPage = currentPage.length === 0 ? availableHeight : availableHeight - currentHeight
          const fittingLines = calculateFittingCaptionLines(availableOnPage, isFirst)

          if (fittingLines <= 0 && currentPage.length > 0) {
            // No room on current page, start new page
            pages.push(currentPage)
            currentPage = []
            currentHeight = 0
            continue
          }

          const linesToRender = Math.min(fittingLines, remainingLines)
          const endLine = currentStartLine + linesToRender
          const sliceHeight = calculateSliceHeight(linesToRender, isFirst)
          const isLast = endLine >= totalCaptionLines

          currentPage.push({
            card,
            sliceHeight,
            captionStartLine: currentStartLine,
            captionEndLine: endLine,
            isFirstSlice: isFirst,
            isLastSlice: isLast,
          })

          currentHeight += sliceHeight + WEEK_LAYOUT.cardGap
          currentStartLine = endLine
          remainingLines = totalCaptionLines - endLine
          isFirst = false

          if (!isLast) {
            // More caption to render, start new page
            pages.push(currentPage)
            currentPage = []
            currentHeight = 0
          }
        }
      }
    } else {
      // Card doesn't fit on current page - start new page
      pages.push(currentPage)
      currentPage = []
      currentHeight = 0

      // Now add the card (possibly splitting if needed)
      if (card.cardHeight <= availableHeight) {
        // Whole card fits on new page
        currentPage.push({
          card,
          sliceHeight: card.cardHeight,
          captionStartLine: 0,
          captionEndLine: totalCaptionLines,
          isFirstSlice: true,
          isLastSlice: true,
        })
        currentHeight = card.cardHeight + WEEK_LAYOUT.cardGap
      } else {
        // Card is too tall even for a full page - split it
        let remainingLines = totalCaptionLines
        let currentStartLine = 0
        let isFirst = true

        while (remainingLines > 0 || isFirst) {
          const fittingLines = calculateFittingCaptionLines(availableHeight, isFirst)
          const linesToRender = isFirst
            ? Math.min(fittingLines, remainingLines)
            : Math.min(fittingLines, remainingLines)
          const endLine = currentStartLine + linesToRender
          const sliceHeight = calculateSliceHeight(linesToRender, isFirst)
          const isLast = endLine >= totalCaptionLines

          currentPage.push({
            card,
            sliceHeight: Math.min(sliceHeight, availableHeight),
            captionStartLine: currentStartLine,
            captionEndLine: endLine,
            isFirstSlice: isFirst,
            isLastSlice: isLast,
          })

          currentStartLine = endLine
          remainingLines = totalCaptionLines - endLine
          isFirst = false

          if (!isLast) {
            pages.push(currentPage)
            currentPage = []
            currentHeight = 0
          } else {
            currentHeight = sliceHeight + WEEK_LAYOUT.cardGap
          }
        }
      }
    }
  }

  if (currentPage.length > 0) {
    pages.push(currentPage)
  }

  return pages
}

/**
 * Draw a week card slice on the canvas.
 *
 * A slice is a portion of a card that fits on a single page.
 * - First slice: shows photo, date, and first N caption lines
 * - Continuation slice: shows only caption lines with "..." header
 */
async function drawWeekCardSlice(
  ctx: CanvasRenderingContext2D,
  slice: WeekCardSlice,
  x: number,
  y: number,
  width: number
): Promise<number> {
  const { card, sliceHeight, captionStartLine, captionEndLine, isFirstSlice, isLastSlice } = slice
  const dayIndex = (card.date.getDay() + 6) % 7 // Convert to Monday-based

  // Card background (EXPORT: no special "today" border - clean PDF output)
  ctx.fillStyle = 'white'
  ctx.shadowColor = 'rgba(0, 0, 0, 0.1)'
  ctx.shadowBlur = 10
  ctx.shadowOffsetY = 4
  roundedRectPath(ctx, x, y, width, sliceHeight, 16)
  ctx.fill()
  ctx.shadowColor = 'transparent'

  const dateX = x + WEEK_LAYOUT.cardPadding
  const photoX = dateX + WEEK_LAYOUT.dateColumnWidth + WEEK_LAYOUT.cardPadding
  const photoWidth = width - WEEK_LAYOUT.dateColumnWidth - WEEK_LAYOUT.cardPadding * 3

  if (isFirstSlice) {
    // First slice: show date column, photo, and caption lines
    const dateY = y + WEEK_LAYOUT.cardPadding
    const photoY = y + WEEK_LAYOUT.cardPadding

    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'

    // Day name (EXPORT: no special "today" color - clean PDF output)
    ctx.font = `bold ${WEEK_LAYOUT.fontSize.dayName}px ${WEEK_LAYOUT.fontFamily}`
    ctx.fillStyle = '#6b7280'
    ctx.fillText(WEEKDAYS[dayIndex], dateX + WEEK_LAYOUT.dateColumnWidth / 2, dateY)

    // Day number (EXPORT: no special "today" color - clean PDF output)
    ctx.font = `bold ${WEEK_LAYOUT.fontSize.dayNumber}px ${WEEK_LAYOUT.fontFamily}`
    ctx.fillStyle = '#1f2937'
    ctx.fillText(card.date.getDate().toString(), dateX + WEEK_LAYOUT.dateColumnWidth / 2, dateY + 20)

    // Photo area
    if (card.entry?.thumbDataUrl) {
      try {
        const img = await loadImage(card.entry.thumbDataUrl)
        ctx.save()
        roundedRectPath(ctx, photoX, photoY, photoWidth, WEEK_LAYOUT.photoHeight, 12)
        ctx.clip()

        // Cover fit
        const imgAspect = img.naturalWidth / img.naturalHeight
        const areaAspect = photoWidth / WEEK_LAYOUT.photoHeight
        let drawWidth: number, drawHeight: number, drawPx: number, drawPy: number

        if (imgAspect > areaAspect) {
          drawHeight = WEEK_LAYOUT.photoHeight
          drawWidth = drawHeight * imgAspect
          drawPx = photoX - (drawWidth - photoWidth) / 2
          drawPy = photoY
        } else {
          drawWidth = photoWidth
          drawHeight = drawWidth / imgAspect
          drawPx = photoX
          drawPy = photoY - (drawHeight - WEEK_LAYOUT.photoHeight) / 2
        }

        ctx.drawImage(img, drawPx, drawPy, drawWidth, drawHeight)
        ctx.restore()
      } catch (e) {
        console.error('[ViewRenderer] Failed to draw week card photo:', e)
        drawRoundedRect(ctx, photoX, photoY, photoWidth, WEEK_LAYOUT.photoHeight, 12, '#f3f4f6')
      }
    } else {
      // Empty photo placeholder
      drawRoundedRect(ctx, photoX, photoY, photoWidth, WEEK_LAYOUT.photoHeight, 12, '#f3f4f6')
      ctx.fillStyle = '#d1d5db'
      ctx.font = `bold 48px ${WEEK_LAYOUT.fontFamily}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('+', photoX + photoWidth / 2, photoY + WEEK_LAYOUT.photoHeight / 2)
    }

    // Caption lines (first slice portion)
    // NOTE: "No entry yet" case removed - we only include days with data in export
    if (captionEndLine > captionStartLine) {
      ctx.font = `500 ${WEEK_LAYOUT.fontSize.caption}px ${WEEK_LAYOUT.fontFamily}`
      ctx.fillStyle = '#4b5563'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'

      let captionY = photoY + WEEK_LAYOUT.photoHeight + WEEK_LAYOUT.cardPadding
      const linesToRender = card.captionLines.slice(captionStartLine, captionEndLine)

      for (const line of linesToRender) {
        ctx.fillText(line, photoX, captionY)
        captionY += WEEK_LAYOUT.fontSize.caption * WEEK_LAYOUT.lineHeight
      }
    }

    // Continuation indicator if not last slice
    if (!isLastSlice) {
      ctx.font = `italic 500 ${WEEK_LAYOUT.fontSize.caption}px ${WEEK_LAYOUT.fontFamily}`
      ctx.fillStyle = '#9ca3af'
      ctx.textAlign = 'right'
      ctx.fillText('(continued...)', x + width - WEEK_LAYOUT.cardPadding, y + sliceHeight - WEEK_LAYOUT.cardPadding - 10)
    }
  } else {
    // Continuation slice: show continuation header and remaining caption
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'

    // Continuation header with date reference
    ctx.font = `italic 500 ${WEEK_LAYOUT.fontSize.caption}px ${WEEK_LAYOUT.fontFamily}`
    ctx.fillStyle = '#9ca3af'
    const headerText = `${WEEKDAYS[dayIndex]} ${card.date.getDate()} (continued)`
    ctx.fillText(headerText, photoX, y + WEEK_LAYOUT.cardPadding)

    // Caption lines (continuation portion)
    ctx.font = `500 ${WEEK_LAYOUT.fontSize.caption}px ${WEEK_LAYOUT.fontFamily}`
    ctx.fillStyle = '#4b5563'

    let captionY = y + WEEK_LAYOUT.cardPadding + WEEK_LAYOUT.fontSize.caption * WEEK_LAYOUT.lineHeight + 8
    const linesToRender = card.captionLines.slice(captionStartLine, captionEndLine)

    for (const line of linesToRender) {
      ctx.fillText(line, photoX, captionY)
      captionY += WEEK_LAYOUT.fontSize.caption * WEEK_LAYOUT.lineHeight
    }

    // Continuation indicator if not last slice
    if (!isLastSlice) {
      ctx.font = `italic 500 ${WEEK_LAYOUT.fontSize.caption}px ${WEEK_LAYOUT.fontFamily}`
      ctx.fillStyle = '#9ca3af'
      ctx.textAlign = 'right'
      ctx.fillText('(continued...)', x + width - WEEK_LAYOUT.cardPadding, y + sliceHeight - WEEK_LAYOUT.cardPadding - 10)
    }
  }

  return sliceHeight
}

/**
 * Render a single week page with slices.
 * Supports multi-page pagination with card slicing (no text clipping).
 */
async function renderWeekPage(
  slices: WeekCardSlice[],
  weekNumber: number,
  weekStart: Date,
  weekEnd: Date,
  pageNumber: number,
  totalPages: number
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas')
  canvas.width = PDF_PAGE.width
  canvas.height = PDF_PAGE.height
  const ctx = canvas.getContext('2d')!

  // Background
  ctx.fillStyle = EXPORT_BACKGROUND_COLOR
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Header
  ctx.font = `bold 32px ${WEEK_LAYOUT.fontFamily}`
  ctx.fillStyle = '#1f2937'
  ctx.textAlign = 'center'
  ctx.fillText(`Week ${weekNumber}`, PDF_PAGE.width / 2, PDF_PAGE.margin + 35)

  ctx.font = `500 16px ${WEEK_LAYOUT.fontFamily}`
  ctx.fillStyle = '#6b7280'
  ctx.fillText(
    `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`,
    PDF_PAGE.width / 2,
    PDF_PAGE.margin + 60
  )

  // Page indicator if multi-page
  if (totalPages > 1) {
    ctx.font = `500 14px ${WEEK_LAYOUT.fontFamily}`
    ctx.fillStyle = '#9ca3af'
    ctx.textAlign = 'right'
    ctx.fillText(`Page ${pageNumber}/${totalPages}`, PDF_PAGE.width - PDF_PAGE.margin, PDF_PAGE.margin + 35)
  }

  // Draw card slices
  let currentY = PDF_PAGE.margin + PDF_PAGE.headerHeight
  const cardX = PDF_PAGE.margin

  for (const slice of slices) {
    await drawWeekCardSlice(ctx, slice, cardX, currentY, WEEK_LAYOUT.cardWidth)
    currentY += slice.sliceHeight + WEEK_LAYOUT.cardGap
  }

  // Footer
  ctx.font = `500 12px ${WEEK_LAYOUT.fontFamily}`
  ctx.fillStyle = '#9ca3af'
  ctx.textAlign = 'left'
  ctx.fillText('DayPat', PDF_PAGE.margin, PDF_PAGE.height - PDF_PAGE.margin + 20)

  ctx.textAlign = 'right'
  ctx.fillText(
    format(new Date(), 'MMM d, yyyy'),
    PDF_PAGE.width - PDF_PAGE.margin,
    PDF_PAGE.height - PDF_PAGE.margin + 20
  )

  return canvas
}

/**
 * Render Week View pages for export.
 * Supports multi-page pagination - comments are NEVER clipped.
 */
export async function renderWeekPageImages(anchorDate: Date): Promise<PageImage[]> {
  console.log('[ViewRenderer] renderWeekPageImages:', anchorDate)
  await ensureFontsLoaded()

  const weekStart = startOfWeek(anchorDate, { weekStartsOn: 1 })
  const weekDays = getWeekDays(weekStart)
  const weekNumber = getWeek(weekStart, { weekStartsOn: 1 })
  const weekEnd = addDays(weekStart, 6)

  // Fetch week data
  const weekData = await fetchWeekEntries(weekStart)

  // Create measurement canvas for text measurement
  const measureCanvas = document.createElement('canvas')
  const measureCtx = measureCanvas.getContext('2d')!

  // Measure all cards
  const measurements = measureWeekCards(measureCtx, weekDays, weekData)

  // Calculate available height for cards
  const availableHeight = PDF_PAGE.height - PDF_PAGE.margin * 2 - PDF_PAGE.headerHeight - 40

  // Split into pages (cards may be split into slices if captions are long)
  const pages = splitIntoPages(measurements, availableHeight)
  const totalPages = pages.length

  console.log('[ViewRenderer] Week pages:', totalPages, 'slices per page:', pages.map(p => p.length))
  console.log('[ViewRenderer] Available height:', availableHeight, 'px')

  // Render each page
  const pageImages: PageImage[] = []

  for (let i = 0; i < pages.length; i++) {
    const pageCanvas = await renderWeekPage(
      pages[i],
      weekNumber,
      weekStart,
      weekEnd,
      i + 1,
      totalPages
    )

    pageImages.push({
      dataUrl: pageCanvas.toDataURL('image/png'),
      width: pageCanvas.width,
      height: pageCanvas.height,
      pageNumber: i + 1,
      totalPages,
    })
  }

  return pageImages
}

// ============================================================
// MONTH PAGE RENDERER
// ============================================================

/**
 * Render Month View as a single page.
 */
export async function renderMonthPageImages(year: number, month: number): Promise<PageImage[]> {
  console.log('[ViewRenderer] renderMonthPageImages:', year, month)
  await ensureFontsLoaded()

  const canvas = document.createElement('canvas')
  canvas.width = PDF_PAGE.width
  canvas.height = PDF_PAGE.height
  const ctx = canvas.getContext('2d')!

  // Background
  ctx.fillStyle = EXPORT_BACKGROUND_COLOR
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Fetch month data
  const monthData = await fetchMonthEntries(year, month)

  // Header
  const monthDate = new Date(year, month, 1)
  ctx.font = `bold 36px ${MONTH_LAYOUT.fontFamily}`
  ctx.fillStyle = '#1f2937'
  ctx.textAlign = 'center'
  ctx.fillText(format(monthDate, 'MMMM yyyy'), PDF_PAGE.width / 2, PDF_PAGE.margin + 45)

  // Build calendar days first to determine numWeeks
  const firstDay = startOfMonth(monthDate)
  const calendarDays: Date[] = []

  let dayOfWeek = firstDay.getDay()
  dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Monday-based

  // Padding days from previous month
  for (let i = 0; i < dayOfWeek; i++) {
    calendarDays.push(new Date(year, month, -(dayOfWeek - i - 1)))
  }

  // Days of the month
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(new Date(year, month, i))
  }

  // Padding to complete last week
  const remaining = (7 - (calendarDays.length % 7)) % 7
  for (let i = 1; i <= remaining; i++) {
    calendarDays.push(new Date(year, month + 1, i))
  }

  const numWeeks = Math.ceil(calendarDays.length / 7)

  // EXPORT FIX: Calculate grid with proper aspect ratio (no vertical stretch)
  // Use square cells and center the grid on page
  const gridWidth = PDF_PAGE.width - PDF_PAGE.margin * 2
  const cellWidth = (gridWidth - MONTH_LAYOUT.gridGap * 6) / 7
  // IMPORTANT: Use square cells to maintain aspect ratio
  const cellHeight = cellWidth
  // Calculate actual grid height based on square cells
  const actualGridHeight = numWeeks * cellHeight + (numWeeks - 1) * MONTH_LAYOUT.gridGap
  // Available space for grid (excluding header and footer)
  const availableHeight = PDF_PAGE.height - PDF_PAGE.margin * 2 - MONTH_LAYOUT.headerHeight - MONTH_LAYOUT.weekdayHeight - 30
  // Center grid vertically within available space
  const gridTopOffset = Math.max(0, (availableHeight - actualGridHeight) / 2)
  const gridTop = PDF_PAGE.margin + MONTH_LAYOUT.headerHeight + MONTH_LAYOUT.weekdayHeight + gridTopOffset

  // Weekday headers
  ctx.font = `600 ${MONTH_LAYOUT.fontSize.weekday}px ${MONTH_LAYOUT.fontFamily}`
  ctx.fillStyle = '#6b7280'
  ctx.textAlign = 'center'

  for (let i = 0; i < 7; i++) {
    const x = PDF_PAGE.margin + i * (cellWidth + MONTH_LAYOUT.gridGap) + cellWidth / 2
    ctx.fillText(WEEKDAYS_SHORT[i], x, PDF_PAGE.margin + MONTH_LAYOUT.headerHeight + 25)
  }

  // Calendar cells
  for (let i = 0; i < calendarDays.length; i++) {
    const date = calendarDays[i]
    const dateStr = formatDateString(date)
    const col = i % 7
    const row = Math.floor(i / 7)

    const cellX = PDF_PAGE.margin + col * (cellWidth + MONTH_LAYOUT.gridGap)
    const cellY = gridTop + row * (cellHeight + MONTH_LAYOUT.gridGap)

    const isCurrentMonth = isSameMonth(date, monthDate)
    const dayData = monthData.get(dateStr)
    const hasPhoto = dayData?.thumbDataUrl && isCurrentMonth

    // Cell background
    if (!isCurrentMonth) {
      ctx.fillStyle = '#f3f4f6'
      ctx.fillRect(cellX, cellY, cellWidth, cellHeight)
    } else if (hasPhoto) {
      // Draw photo
      try {
        const img = await loadImage(dayData!.thumbDataUrl!)
        ctx.save()
        ctx.beginPath()
        ctx.rect(cellX, cellY, cellWidth, cellHeight)
        ctx.clip()

        // Cover fit
        const imgAspect = img.naturalWidth / img.naturalHeight
        const areaAspect = cellWidth / cellHeight
        let drawWidth: number, drawHeight: number, drawX: number, drawY: number

        if (imgAspect > areaAspect) {
          drawHeight = cellHeight
          drawWidth = drawHeight * imgAspect
          drawX = cellX - (drawWidth - cellWidth) / 2
          drawY = cellY
        } else {
          drawWidth = cellWidth
          drawHeight = drawWidth / imgAspect
          drawX = cellX
          drawY = cellY - (drawHeight - cellHeight) / 2
        }

        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)
        ctx.restore()
      } catch (e) {
        ctx.fillStyle = '#f9fafb'
        ctx.fillRect(cellX, cellY, cellWidth, cellHeight)
      }
    } else {
      ctx.fillStyle = '#f9fafb'
      ctx.fillRect(cellX, cellY, cellWidth, cellHeight)
    }

    // EXPORT: No "today" indicator border (clean PDF output)

    // Date number
    if (isCurrentMonth) {
      ctx.font = `bold ${MONTH_LAYOUT.fontSize.dayNumber}px ${MONTH_LAYOUT.fontFamily}`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'

      // EXPORT: No special "today" color (clean PDF output)
      if (hasPhoto) {
        ctx.fillStyle = 'white'
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
        ctx.shadowBlur = 2
      } else {
        ctx.fillStyle = '#374151'
        ctx.shadowColor = 'transparent'
      }

      ctx.fillText(date.getDate().toString(), cellX + MONTH_LAYOUT.cellPadding, cellY + MONTH_LAYOUT.cellPadding)
      ctx.shadowColor = 'transparent'
    }
  }

  // Grid border
  ctx.strokeStyle = '#e5e7eb'
  ctx.lineWidth = 1
  ctx.strokeRect(PDF_PAGE.margin, gridTop, gridWidth, numWeeks * cellHeight + (numWeeks - 1) * MONTH_LAYOUT.gridGap)

  // Footer
  ctx.font = `500 12px ${MONTH_LAYOUT.fontFamily}`
  ctx.fillStyle = '#9ca3af'
  ctx.textAlign = 'left'
  ctx.fillText('DayPat', PDF_PAGE.margin, PDF_PAGE.height - PDF_PAGE.margin + 20)

  ctx.textAlign = 'right'
  ctx.fillText(
    format(new Date(), 'MMM d, yyyy'),
    PDF_PAGE.width - PDF_PAGE.margin,
    PDF_PAGE.height - PDF_PAGE.margin + 20
  )

  return [{
    dataUrl: canvas.toDataURL('image/png'),
    width: canvas.width,
    height: canvas.height,
    pageNumber: 1,
    totalPages: 1,
  }]
}

// ============================================================
// MAIN EXPORT FUNCTION (legacy single-view)
// ============================================================

export type ExportViewType = 'day' | 'week' | 'month'

export interface ViewExportOptions {
  viewType: ExportViewType
  selectedDate: string // Current selected date (YYYY-MM-DD)
  weekAnchorDate?: Date // For week view
  monthYear?: number // For month view
  monthIndex?: number // For month view (0-11)
}

/**
 * Render pages based on the current view type.
 * This is the main entry point for view-based export.
 */
export async function renderViewPages(options: ViewExportOptions): Promise<PageImage[]> {
  const { viewType, selectedDate, weekAnchorDate, monthYear, monthIndex } = options

  console.log('[ViewRenderer] renderViewPages:', { viewType, selectedDate })

  switch (viewType) {
    case 'day':
      return renderDayPageImages(selectedDate)

    case 'week': {
      const anchor = weekAnchorDate || new Date(selectedDate + 'T00:00:00')
      return renderWeekPageImages(anchor)
    }

    case 'month': {
      const date = new Date(selectedDate + 'T00:00:00')
      const year = monthYear ?? date.getFullYear()
      const month = monthIndex ?? date.getMonth()
      return renderMonthPageImages(year, month)
    }

    default:
      throw new Error(`Unknown view type: ${viewType}`)
  }
}

// ============================================================
// DATE RANGE EXPORT (new multi-page export with date range)
// ============================================================

/**
 * Export mode for PDF generation.
 * Defines what type of content to export with date range.
 */
export type ExportMode = 'day' | 'week' | 'month' | 'favorites'

export interface DateRangeExportOptions {
  mode: ExportMode
  fromDate: string // YYYY-MM-DD
  toDate: string   // YYYY-MM-DD
}

/**
 * Generate date range array between from and to (inclusive).
 */
function generateDateRange(fromStr: string, toStr: string): Date[] {
  const dates: Date[] = []
  const from = new Date(fromStr + 'T00:00:00')
  const to = new Date(toStr + 'T00:00:00')

  const current = new Date(from)
  while (current <= to) {
    dates.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }

  return dates
}

/**
 * Generate week anchors within date range.
 * Returns array of week start dates (Mondays).
 */
function generateWeekAnchors(fromStr: string, toStr: string): Date[] {
  const weeks: Date[] = []
  const from = new Date(fromStr + 'T00:00:00')
  const to = new Date(toStr + 'T00:00:00')

  // Find first Monday at or before from date
  let current = startOfWeek(from, { weekStartsOn: 1 })

  while (current <= to) {
    weeks.push(new Date(current))
    current = addDays(current, 7)
  }

  return weeks
}

/**
 * Generate month anchors within date range.
 * Returns array of { year, month } objects.
 */
function generateMonthAnchors(fromStr: string, toStr: string): Array<{ year: number; month: number }> {
  const months: Array<{ year: number; month: number }> = []
  const from = new Date(fromStr + 'T00:00:00')
  const to = new Date(toStr + 'T00:00:00')

  let currentYear = from.getFullYear()
  let currentMonth = from.getMonth()

  while (
    currentYear < to.getFullYear() ||
    (currentYear === to.getFullYear() && currentMonth <= to.getMonth())
  ) {
    months.push({ year: currentYear, month: currentMonth })
    currentMonth++
    if (currentMonth > 11) {
      currentMonth = 0
      currentYear++
    }
  }

  return months
}

/**
 * Render Day pages for a date range.
 * Each day = 1 PDF page (polaroid style).
 * Only includes days that have data (praise, photo, stickers, or stamp).
 */
export async function renderDayRangePages(fromDate: string, toDate: string): Promise<PageImage[]> {
  console.log('[ViewRenderer] renderDayRangePages:', fromDate, 'to', toDate)

  // Get only dates that have data (single DB query)
  const datesWithData = await getDateKeysWithDataInRange(fromDate, toDate)
  console.log('[ViewRenderer] Days with data:', datesWithData.length)

  if (datesWithData.length === 0) {
    return [] // No data in range
  }

  const allPages: PageImage[] = []

  for (const dateStr of datesWithData) {
    const pages = await renderDayPageImages(dateStr)
    allPages.push(...pages)
  }

  // Update page numbers
  const total = allPages.length
  return allPages.map((page, i) => ({
    ...page,
    pageNumber: i + 1,
    totalPages: total,
  }))
}

/**
 * Render Week pages for a date range.
 * Uses multi-page pagination for each week if needed.
 * Only includes weeks that have at least one day with data.
 */
export async function renderWeekRangePages(fromDate: string, toDate: string): Promise<PageImage[]> {
  console.log('[ViewRenderer] renderWeekRangePages:', fromDate, 'to', toDate)

  // Get only weeks that have data (single DB query)
  const weeksWithData = await getWeeksWithAnyData(fromDate, toDate)
  console.log('[ViewRenderer] Weeks with data:', weeksWithData.length)

  if (weeksWithData.length === 0) {
    return [] // No data in range
  }

  const allPages: PageImage[] = []

  for (const anchor of weeksWithData) {
    const pages = await renderWeekPageImages(anchor)
    allPages.push(...pages)
  }

  // Update page numbers
  const total = allPages.length
  return allPages.map((page, i) => ({
    ...page,
    pageNumber: i + 1,
    totalPages: total,
  }))
}

/**
 * Render Month pages for a date range.
 * Each month = 1 PDF page (calendar grid).
 * Only includes months that have at least one day with data.
 */
export async function renderMonthRangePages(fromDate: string, toDate: string): Promise<PageImage[]> {
  console.log('[ViewRenderer] renderMonthRangePages:', fromDate, 'to', toDate)

  // Get only months that have data (single DB query)
  const monthsWithData = await getMonthsWithAnyData(fromDate, toDate)
  console.log('[ViewRenderer] Months with data:', monthsWithData.length)

  if (monthsWithData.length === 0) {
    return [] // No data in range
  }

  const allPages: PageImage[] = []

  for (const { year, month } of monthsWithData) {
    const pages = await renderMonthPageImages(year, month)
    allPages.push(...pages)
  }

  // Update page numbers
  const total = allPages.length
  return allPages.map((page, i) => ({
    ...page,
    pageNumber: i + 1,
    totalPages: total,
  }))
}

// ============================================================
// FAVORITES RENDERER
// ============================================================

interface FavoriteEntry {
  id: string
  date: string
  entry_date: string
  praise: string | null
  photo_path: string | null
  photoDataUrl?: string
}

/**
 * Fetch ALL favorites from Supabase (matching Favorites screen behavior).
 * NOTE: Favorites export ignores date range - it exports ALL favorites.
 * This matches the Favorites screen which shows all liked entries.
 */
async function fetchAllFavorites(): Promise<FavoriteEntry[]> {
  const supabase = getSupabaseClient()

  // Query matches use-favorites.ts - uses 'entries' table, no date filter
  const { data, error } = await supabase
    .from('entries')
    .select('id, entry_date, praise, photo_path')
    .eq('is_liked', true)
    .order('entry_date', { ascending: false })

  if (error) {
    console.error('[ViewRenderer] Failed to fetch favorites:', error)
    return []
  }

  console.log('[ViewRenderer] fetchAllFavorites: found', data?.length || 0, 'entries')

  // Download photos and convert to data URLs
  const favorites: FavoriteEntry[] = []
  for (const entry of data || []) {
    let photoDataUrl: string | undefined
    if (entry.photo_path) {
      photoDataUrl = await downloadSupabaseImage(entry.photo_path) || undefined
    }
    favorites.push({
      id: String(entry.id),
      date: entry.entry_date,
      entry_date: entry.entry_date,
      praise: entry.praise,
      photo_path: entry.photo_path,
      photoDataUrl,
    })
  }

  return favorites
}

// Favorites layout constants (matching favorites-modal style)
const FAVORITES_LAYOUT = {
  columns: 2,
  cardWidth: 540,  // (PDF_PAGE.width - margin*2 - gap) / 2
  cardGap: 24,
  cardPadding: 16,
  photoHeight: 320,
  captionHeight: 80,
  fontSize: {
    date: 12,
    caption: 14,
  },
  lineHeight: 1.5,
}

/**
 * Draw a single favorite card on canvas.
 */
async function drawFavoriteCard(
  ctx: CanvasRenderingContext2D,
  entry: FavoriteEntry,
  x: number,
  y: number,
  width: number,
  rotation: number
): Promise<number> {
  const cardHeight = FAVORITES_LAYOUT.cardPadding * 2 + FAVORITES_LAYOUT.photoHeight + FAVORITES_LAYOUT.captionHeight

  ctx.save()

  // Apply slight rotation for polaroid effect
  const centerX = x + width / 2
  const centerY = y + cardHeight / 2
  ctx.translate(centerX, centerY)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.translate(-centerX, -centerY)

  // Card shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.15)'
  ctx.shadowBlur = 12
  ctx.shadowOffsetY = 6

  // Card background
  ctx.fillStyle = 'white'
  roundedRectPath(ctx, x, y, width, cardHeight, 16)
  ctx.fill()
  ctx.shadowColor = 'transparent'

  // Photo
  const photoX = x + FAVORITES_LAYOUT.cardPadding
  const photoY = y + FAVORITES_LAYOUT.cardPadding
  const photoWidth = width - FAVORITES_LAYOUT.cardPadding * 2

  if (entry.photoDataUrl) {
    try {
      const img = await loadImage(entry.photoDataUrl)
      ctx.save()
      roundedRectPath(ctx, photoX, photoY, photoWidth, FAVORITES_LAYOUT.photoHeight, 12)
      ctx.clip()

      // Cover fit
      const imgAspect = img.naturalWidth / img.naturalHeight
      const areaAspect = photoWidth / FAVORITES_LAYOUT.photoHeight
      let drawWidth: number, drawHeight: number, drawPx: number, drawPy: number

      if (imgAspect > areaAspect) {
        drawHeight = FAVORITES_LAYOUT.photoHeight
        drawWidth = drawHeight * imgAspect
        drawPx = photoX - (drawWidth - photoWidth) / 2
        drawPy = photoY
      } else {
        drawWidth = photoWidth
        drawHeight = drawWidth / imgAspect
        drawPx = photoX
        drawPy = photoY - (drawHeight - FAVORITES_LAYOUT.photoHeight) / 2
      }

      ctx.drawImage(img, drawPx, drawPy, drawWidth, drawHeight)
      ctx.restore()
    } catch (e) {
      // Placeholder
      drawRoundedRect(ctx, photoX, photoY, photoWidth, FAVORITES_LAYOUT.photoHeight, 12, '#f3f4f6')
    }
  } else {
    drawRoundedRect(ctx, photoX, photoY, photoWidth, FAVORITES_LAYOUT.photoHeight, 12, '#f3f4f6')
  }

  // Heart icon overlay (top-right of photo)
  const heartSize = 24
  const heartX = photoX + photoWidth - heartSize / 2 - 12
  const heartY = photoY + heartSize / 2 + 12
  drawFontAwesomeHeart(ctx, heartX, heartY, heartSize, true)

  // Date
  const textY = photoY + FAVORITES_LAYOUT.photoHeight + FAVORITES_LAYOUT.cardPadding
  ctx.font = `500 ${FAVORITES_LAYOUT.fontSize.date}px ${WEEK_LAYOUT.fontFamily}`
  ctx.fillStyle = '#9ca3af'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  const dateStr = format(new Date(entry.entry_date + 'T00:00:00'), 'MMM d, yyyy')
  ctx.fillText(dateStr, photoX, textY)

  // Caption
  ctx.font = `500 ${FAVORITES_LAYOUT.fontSize.caption}px ${WEEK_LAYOUT.fontFamily}`
  ctx.fillStyle = '#374151'
  const captionY = textY + FAVORITES_LAYOUT.fontSize.date * FAVORITES_LAYOUT.lineHeight + 4
  const caption = entry.praise || 'No caption'
  const maxCaptionWidth = photoWidth
  const lines = wrapText(ctx, caption, maxCaptionWidth)
  const truncatedLines = truncateWithEllipsis(ctx, lines, 2, maxCaptionWidth)

  for (let i = 0; i < truncatedLines.length; i++) {
    ctx.fillText(
      truncatedLines[i],
      photoX,
      captionY + i * FAVORITES_LAYOUT.fontSize.caption * FAVORITES_LAYOUT.lineHeight
    )
  }

  ctx.restore()

  return cardHeight
}

/**
 * Render Favorites pages.
 * NOTE: Favorites export ignores date range - it exports ALL favorites
 * to match the Favorites screen behavior.
 * Displays favorites in a 2-column grid layout.
 */
export async function renderFavoritesPages(_fromDate: string, _toDate: string): Promise<PageImage[]> {
  console.log('[ViewRenderer] renderFavoritesPages: exporting ALL favorites (date range ignored)')
  await ensureFontsLoaded()

  // Fetch ALL favorites (ignoring date range, matching Favorites screen)
  const favorites = await fetchAllFavorites()
  console.log('[ViewRenderer] Found', favorites.length, 'total favorites')

  if (favorites.length === 0) {
    console.log('[ViewRenderer] No favorites found - returning empty array')
    // Return empty array to trigger "No data" message in modal
    return []
  }

  // Calculate card dimensions
  const cardWidth = (PDF_PAGE.width - PDF_PAGE.margin * 2 - FAVORITES_LAYOUT.cardGap) / 2
  const cardHeight = FAVORITES_LAYOUT.cardPadding * 2 + FAVORITES_LAYOUT.photoHeight + FAVORITES_LAYOUT.captionHeight + 20

  // Rotation patterns (subtle, like polaroid stack)
  const rotations = [-2, 2, 1, -1, -2, 2]

  // Split into pages
  const cardsPerRow = 2
  const availableHeight = PDF_PAGE.height - PDF_PAGE.margin * 2 - PDF_PAGE.headerHeight - 40
  const rowHeight = cardHeight + FAVORITES_LAYOUT.cardGap
  const rowsPerPage = Math.floor(availableHeight / rowHeight)
  const cardsPerPage = rowsPerPage * cardsPerRow

  const pages: PageImage[] = []
  const totalPages = Math.ceil(favorites.length / cardsPerPage)

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    const canvas = document.createElement('canvas')
    canvas.width = PDF_PAGE.width
    canvas.height = PDF_PAGE.height
    const ctx = canvas.getContext('2d')!

    // Background
    ctx.fillStyle = EXPORT_BACKGROUND_COLOR
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Header
    ctx.font = `bold 32px ${WEEK_LAYOUT.fontFamily}`
    ctx.fillStyle = '#1f2937'
    ctx.textAlign = 'center'
    ctx.fillText('Favorite Moments', PDF_PAGE.width / 2, PDF_PAGE.margin + 45)

    // Export date (not date range since all favorites are included)
    ctx.font = `500 16px ${WEEK_LAYOUT.fontFamily}`
    ctx.fillStyle = '#6b7280'
    ctx.fillText(`Exported ${format(new Date(), 'MMM d, yyyy')}`, PDF_PAGE.width / 2, PDF_PAGE.margin + 75)

    // Count
    ctx.font = `500 14px ${WEEK_LAYOUT.fontFamily}`
    ctx.fillStyle = '#9ca3af'
    ctx.fillText(`${favorites.length} saved memories`, PDF_PAGE.width / 2, PDF_PAGE.margin + 100)

    // Page indicator
    if (totalPages > 1) {
      ctx.textAlign = 'right'
      ctx.fillText(`Page ${pageIdx + 1}/${totalPages}`, PDF_PAGE.width - PDF_PAGE.margin, PDF_PAGE.margin + 45)
    }

    // Draw cards
    const startIdx = pageIdx * cardsPerPage
    const endIdx = Math.min(startIdx + cardsPerPage, favorites.length)

    let currentY = PDF_PAGE.margin + PDF_PAGE.headerHeight + 30

    for (let i = startIdx; i < endIdx; i += cardsPerRow) {
      for (let col = 0; col < cardsPerRow && i + col < endIdx; col++) {
        const entry = favorites[i + col]
        const x = PDF_PAGE.margin + col * (cardWidth + FAVORITES_LAYOUT.cardGap)
        const rotation = rotations[(i + col) % rotations.length]

        await drawFavoriteCard(ctx, entry, x, currentY, cardWidth, rotation)
      }
      currentY += cardHeight + FAVORITES_LAYOUT.cardGap
    }

    // Footer
    ctx.font = `500 12px ${WEEK_LAYOUT.fontFamily}`
    ctx.fillStyle = '#9ca3af'
    ctx.textAlign = 'left'
    ctx.fillText('DayPat', PDF_PAGE.margin, PDF_PAGE.height - PDF_PAGE.margin + 20)

    ctx.textAlign = 'right'
    ctx.fillText(
      format(new Date(), 'MMM d, yyyy'),
      PDF_PAGE.width - PDF_PAGE.margin,
      PDF_PAGE.height - PDF_PAGE.margin + 20
    )

    pages.push({
      dataUrl: canvas.toDataURL('image/png'),
      width: canvas.width,
      height: canvas.height,
      pageNumber: pageIdx + 1,
      totalPages,
    })
  }

  return pages
}

/**
 * Main entry point for date range export.
 * Renders pages based on export mode and date range.
 */
export async function buildPdfPages(options: DateRangeExportOptions): Promise<PageImage[]> {
  const { mode, fromDate, toDate } = options

  console.log('[ViewRenderer] buildPdfPages:', { mode, fromDate, toDate })

  switch (mode) {
    case 'day':
      return renderDayRangePages(fromDate, toDate)

    case 'week':
      return renderWeekRangePages(fromDate, toDate)

    case 'month':
      return renderMonthRangePages(fromDate, toDate)

    case 'favorites':
      return renderFavoritesPages(fromDate, toDate)

    default:
      throw new Error(`Unknown export mode: ${mode}`)
  }
}
