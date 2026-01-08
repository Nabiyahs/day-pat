'use client'

import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'

/**
 * Wait for all images within a container to load
 */
async function waitForImages(container: HTMLElement): Promise<void> {
  const images = container.querySelectorAll('img')
  const promises = Array.from(images).map((img) => {
    if (img.complete) return Promise.resolve()
    return new Promise<void>((resolve) => {
      img.onload = () => resolve()
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

  // Wait for all images to load
  await waitForImages(element)

  // Small delay to ensure rendering is complete
  await new Promise((resolve) => setTimeout(resolve, 100))

  // Capture the element
  const dataUrl = await toPng(element, {
    pixelRatio,
    cacheBust: true,
    // Include external images (stickers)
    includeQueryParams: true,
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
 * Export polaroid as PDF and download
 */
export async function exportPolaroidAsPdf(
  element: HTMLElement,
  date: string
): Promise<void> {
  const dataUrl = await captureElementAsPng(element, { pixelRatio: 2 })

  // Create PDF with the image
  // A4 dimensions in mm: 210 x 297
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

  // Calculate dimensions to fit on A4 with margins
  const pageWidth = 210
  const pageHeight = 297
  const margin = 20
  const maxWidth = pageWidth - 2 * margin
  const maxHeight = pageHeight - 2 * margin

  const imgAspect = img.width / img.height
  let imgWidth = maxWidth
  let imgHeight = imgWidth / imgAspect

  if (imgHeight > maxHeight) {
    imgHeight = maxHeight
    imgWidth = imgHeight * imgAspect
  }

  // Center the image
  const x = (pageWidth - imgWidth) / 2
  const y = (pageHeight - imgHeight) / 2

  pdf.addImage(dataUrl, 'PNG', x, y, imgWidth, imgHeight)
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
