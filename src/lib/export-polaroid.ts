'use client'

import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'
import { createRoot } from 'react-dom/client'
import { createElement } from 'react'
import { ExportablePolaroid, type ExportData } from '@/components/day/exportable-polaroid'
import type { StickerState } from '@/types/database'

// Stamp image path (must match stamp-overlay.tsx)
const STAMP_IMAGE_PATH = '/image/seal-image.jpg'

/**
 * Fetch an image URL and convert it to a data URL.
 * This bypasses CORS issues by fetching through the browser.
 */
async function imageUrlToDataUrl(url: string): Promise<string | null> {
  try {
    // For local images (starting with /), use fetch directly
    if (url.startsWith('/')) {
      const response = await fetch(url)
      const blob = await response.blob()
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = () => resolve(null)
        reader.readAsDataURL(blob)
      })
    }

    // For remote images, try to fetch with CORS
    // If CORS fails, fall back to canvas approach
    try {
      const response = await fetch(url, {
        mode: 'cors',
        credentials: 'omit',
      })
      const blob = await response.blob()
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = () => resolve(null)
        reader.readAsDataURL(blob)
      })
    } catch {
      // CORS fetch failed, try canvas approach
      return new Promise((resolve) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas')
            canvas.width = img.naturalWidth
            canvas.height = img.naturalHeight
            const ctx = canvas.getContext('2d')
            if (ctx) {
              ctx.drawImage(img, 0, 0)
              resolve(canvas.toDataURL('image/jpeg', 0.9))
            } else {
              resolve(null)
            }
          } catch {
            resolve(null)
          }
        }
        img.onerror = () => resolve(null)
        img.src = url
      })
    }
  } catch {
    return null
  }
}

/**
 * Wait for an image element to fully load and decode.
 */
async function waitForImageLoad(img: HTMLImageElement): Promise<void> {
  if (img.complete && img.naturalWidth > 0) {
    try {
      await img.decode()
    } catch {
      // Decode failed but image may still work
    }
    return
  }

  return new Promise((resolve) => {
    img.onload = async () => {
      try {
        await img.decode()
      } catch {
        // Decode failed but image may still work
      }
      resolve()
    }
    img.onerror = () => resolve()
  })
}

/**
 * Wait for all images in a container to load.
 */
async function waitForAllImages(container: HTMLElement): Promise<void> {
  const images = container.querySelectorAll('img')
  await Promise.all(Array.from(images).map(waitForImageLoad))
}

/**
 * Prepare export data by converting all images to data URLs.
 */
async function prepareExportData(
  photoUrl: string | null,
  stickers: StickerState[],
  praise: string | null,
  showStamp: boolean,
  createdAt: string | null
): Promise<ExportData> {
  // Convert photo to data URL
  const photoDataUrl = photoUrl ? await imageUrlToDataUrl(photoUrl) : null

  // Convert stamp to data URL
  const stampDataUrl = showStamp ? await imageUrlToDataUrl(STAMP_IMAGE_PATH) : null

  // Convert sticker images to data URLs
  const stickersWithDataUrls = await Promise.all(
    stickers.map(async (sticker) => {
      if (sticker.src.startsWith('/')) {
        const dataUrl = await imageUrlToDataUrl(sticker.src)
        return { ...sticker, dataUrl: dataUrl || sticker.src }
      }
      // Emoji stickers don't need conversion
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
 * Render the export view offscreen and capture it as a PNG data URL.
 */
async function captureExportView(exportData: ExportData, pixelRatio: number = 2): Promise<string> {
  // Create offscreen container
  const container = document.createElement('div')
  container.style.cssText = `
    position: fixed;
    left: -9999px;
    top: -9999px;
    width: 340px;
    background: white;
    z-index: -1;
  `
  document.body.appendChild(container)

  try {
    // Render ExportablePolaroid into the container
    const root = createRoot(container)
    const exportRef = { current: null as HTMLDivElement | null }

    await new Promise<void>((resolve) => {
      root.render(
        createElement(ExportablePolaroid, {
          data: exportData,
          ref: (el: HTMLDivElement | null) => {
            exportRef.current = el
            // Give React time to render
            setTimeout(resolve, 100)
          },
        })
      )
    })

    // Wait for all images to load
    await waitForAllImages(container)

    // Additional delay to ensure rendering is complete
    await new Promise((resolve) => setTimeout(resolve, 200))

    // Capture the element
    const targetElement = exportRef.current || container.firstElementChild as HTMLElement
    const dataUrl = await toPng(targetElement, {
      pixelRatio,
      cacheBust: true,
      backgroundColor: 'white',
      style: {
        transform: 'rotate(-1deg)',
      },
    })

    // Cleanup
    root.unmount()
    document.body.removeChild(container)

    return dataUrl
  } catch (error) {
    // Cleanup on error
    document.body.removeChild(container)
    throw error
  }
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
  /** Photo URL (signed URL from Supabase) */
  photoUrl: string | null
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
 * Uses the dedicated export view for reliable capture.
 */
export async function capturePolaroidAsPng(options: ExportOptions): Promise<string> {
  const { photoUrl, stickers, praise, showStamp, createdAt } = options

  // Prepare export data (convert all images to data URLs)
  const exportData = await prepareExportData(photoUrl, stickers, praise, showStamp, createdAt)

  // Capture the export view
  return captureExportView(exportData, 2)
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

  // Capture at higher resolution for PDF
  const exportData = await prepareExportData(
    options.photoUrl,
    options.stickers,
    options.praise,
    options.showStamp,
    options.createdAt
  )
  const dataUrl = await captureExportView(exportData, 3)

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
  try {
    const dataUrl = await capturePolaroidAsPng(options)
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
