'use client'

import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'

/**
 * Wait for web fonts to load before capturing
 * This ensures Korean (Noto Sans KR) and other fonts render correctly
 */
async function waitForFonts(): Promise<void> {
  try {
    // Wait for all fonts to be ready (including Noto Sans KR for Korean)
    await document.fonts.ready
    // Additional delay to ensure font rendering is complete
    await new Promise((resolve) => setTimeout(resolve, 100))
  } catch {
    // Fonts API not supported, continue anyway
  }
}

/**
 * Wait for all images within a container to fully load and decode
 */
async function waitForImages(container: HTMLElement): Promise<void> {
  const images = container.querySelectorAll('img')
  const promises = Array.from(images).map(async (img) => {
    // If already loaded, ensure it's decoded
    if (img.complete && img.naturalWidth > 0) {
      try {
        await img.decode()
      } catch {
        // Decode failed, but image may still render
      }
      return
    }
    // Wait for load then decode
    return new Promise<void>((resolve) => {
      img.onload = async () => {
        try {
          await img.decode()
        } catch {
          // Decode failed, but image may still render
        }
        resolve()
      }
      img.onerror = () => resolve() // Don't block on failed images
    })
  })
  await Promise.all(promises)
}

/**
 * Capture a DOM element as a high-resolution PNG data URL
 */
export async function captureElementAsPng(
  element: HTMLElement,
  options?: { pixelRatio?: number }
): Promise<string> {
  const pixelRatio = options?.pixelRatio ?? 2 // Default 2x for crisp output

  // Wait for fonts to load (critical for Korean text)
  await waitForFonts()

  // Wait for all images to load and decode
  await waitForImages(element)

  // Longer delay to ensure rendering is complete
  await new Promise((resolve) => setTimeout(resolve, 200))

  // Capture the element with proper font and CORS handling
  const dataUrl = await toPng(element, {
    pixelRatio,
    cacheBust: true,
    includeQueryParams: true,
    // Fetch options for cross-origin images
    fetchRequestInit: {
      mode: 'cors',
      credentials: 'omit',
    },
    // Enable font embedding for Korean text support
    skipFonts: false,
  })

  return dataUrl
}

/**
 * Download a data URL as a file
 */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  link.click()
}

/**
 * Convert data URL to Blob
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
 * Format date for PDF header (YYYY.MM.DD format)
 */
function formatPdfDate(dateStr: string): string {
  // dateStr is in YYYY-MM-DD format
  const [year, month, day] = dateStr.split('-')
  return `${year}.${month}.${day}`
}

/**
 * Get weekday name from date string
 */
function getWeekdayName(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { weekday: 'long' })
}

/**
 * Export polaroid as PNG and download
 */
export async function exportPolaroidAsPng(
  element: HTMLElement,
  date: string
): Promise<void> {
  const dataUrl = await captureElementAsPng(element)
  const filename = `day-pat-${date}.png`
  downloadDataUrl(dataUrl, filename)
}

/**
 * Export polaroid as PDF with pretty template and download
 *
 * Template design:
 * - A4 format with clean margins (24mm)
 * - Header: Big date title (YYYY.MM.DD) + weekday subtitle
 * - Main: Polaroid image with subtle shadow effect
 * - Footer: App name + generated timestamp + page number
 */
export async function exportPolaroidAsPdf(
  element: HTMLElement,
  date: string
): Promise<void> {
  // Capture polaroid at 3x resolution for crisp PDF rendering
  const dataUrl = await captureElementAsPng(element, { pixelRatio: 3 })

  // A4 dimensions in mm: 210 x 297
  const pageWidth = 210
  const pageHeight = 297
  const margin = 24 // Clean margins

  // Create PDF
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

  // Date title (YYYY.MM.DD) - large, bold
  pdf.setFontSize(28)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(31, 41, 55) // gray-800
  const formattedDate = formatPdfDate(date)
  pdf.text(formattedDate, pageWidth / 2, headerY, { align: 'center' })

  // Weekday subtitle
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(107, 114, 128) // gray-500
  const weekday = getWeekdayName(date)
  pdf.text(weekday, pageWidth / 2, headerY + 10, { align: 'center' })

  // Decorative line under header
  pdf.setDrawColor(229, 231, 235) // gray-200
  pdf.setLineWidth(0.5)
  pdf.line(margin + 20, headerY + 16, pageWidth - margin - 20, headerY + 16)

  // ========== POLAROID IMAGE SECTION ==========
  const contentStartY = headerY + 28
  const contentEndY = pageHeight - margin - 20 // Leave space for footer
  const availableHeight = contentEndY - contentStartY
  const availableWidth = pageWidth - 2 * margin

  // Calculate image dimensions to fit within available space
  const imgAspect = img.width / img.height
  let imgWidth = availableWidth
  let imgHeight = imgWidth / imgAspect

  // Constrain to available height
  if (imgHeight > availableHeight) {
    imgHeight = availableHeight
    imgWidth = imgHeight * imgAspect
  }

  // Max width for polaroid aesthetic (not too wide)
  const maxPolaroidWidth = 140
  if (imgWidth > maxPolaroidWidth) {
    imgWidth = maxPolaroidWidth
    imgHeight = imgWidth / imgAspect
  }

  // Center the image horizontally
  const imgX = (pageWidth - imgWidth) / 2
  // Position image with some top margin from header
  const imgY = contentStartY + 4

  // Draw subtle shadow effect for polaroid feel
  pdf.setFillColor(200, 200, 200) // Light gray shadow
  pdf.roundedRect(imgX + 1.5, imgY + 1.5, imgWidth, imgHeight, 2, 2, 'F')

  // Add the polaroid image
  pdf.addImage(dataUrl, 'PNG', imgX, imgY, imgWidth, imgHeight)

  // ========== FOOTER SECTION ==========
  const footerY = pageHeight - margin

  // App name
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(156, 163, 175) // gray-400
  pdf.text('Day Pat', margin, footerY)

  // Generated timestamp
  const timestamp = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  pdf.text(`Generated: ${timestamp}`, pageWidth - margin, footerY, { align: 'right' })

  // Page number (centered)
  pdf.setFontSize(9)
  pdf.text('1', pageWidth / 2, footerY, { align: 'center' })

  // Save the PDF
  pdf.save(`day-pat-${date}.pdf`)
}

export type ShareResult = {
  success: boolean
  method: 'shared' | 'downloaded' | 'cancelled' | 'failed'
  error?: string
}

/**
 * Share polaroid via Web Share API or fallback to download
 * Returns result object with success status and method used
 */
export async function sharePolaroid(
  element: HTMLElement,
  date: string
): Promise<ShareResult> {
  try {
    const dataUrl = await captureElementAsPng(element)
    const blob = dataUrlToBlob(dataUrl)
    const file = new File([blob], `day-pat-${date}.png`, { type: 'image/png' })

    // Check if Web Share API supports sharing files
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'My Day Pat',
          text: `My day on ${date}`,
        })
        return { success: true, method: 'shared' }
      } catch (err) {
        // User cancelled the share dialog
        if ((err as Error).name === 'AbortError') {
          return { success: false, method: 'cancelled' }
        }
        // Share failed, fall back to download
        console.warn('Share failed, falling back to download:', err)
      }
    }

    // Fallback: download the image
    downloadDataUrl(dataUrl, `day-pat-${date}.png`)
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
