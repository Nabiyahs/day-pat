'use client'

/**
 * Image loading utilities for SNS share capture.
 * Ensures all images are fully loaded before DOM capture.
 */

const DEBUG = process.env.NODE_ENV === 'development'

/**
 * Error class for capture-related issues
 */
export class CaptureError extends Error {
  constructor(message: string, public readonly details?: Record<string, unknown>) {
    super(message)
    this.name = 'CaptureError'
  }
}

/**
 * Wait for next animation frame (layout stabilization).
 * Calling twice ensures both layout and paint are complete.
 */
export function nextPaint(): Promise<void> {
  return new Promise(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })
}

/**
 * Assert that an element has a non-empty bounding rect.
 * Throws CaptureError if the element is null or has zero/tiny dimensions.
 *
 * @param el - Element to validate
 * @param label - Label for error messages (e.g., 'clone', 'target')
 */
export function assertNonEmptyRect(el: HTMLElement | null, label = 'element'): asserts el is HTMLElement {
  if (!el) {
    throw new CaptureError(`${label} is null`, { label })
  }

  const rect = el.getBoundingClientRect()
  const styles = window.getComputedStyle(el)

  if (DEBUG) {
    console.log(`[image-utils] assertNonEmptyRect ${label}:`, {
      width: rect.width,
      height: rect.height,
      display: styles.display,
      visibility: styles.visibility,
      opacity: styles.opacity,
    })
  }

  if (rect.width < 10 || rect.height < 10) {
    throw new CaptureError(`${label} has invalid dimensions: ${rect.width}x${rect.height}`, {
      label,
      width: rect.width,
      height: rect.height,
      display: styles.display,
      visibility: styles.visibility,
      opacity: styles.opacity,
    })
  }

  if (styles.display === 'none') {
    throw new CaptureError(`${label} has display:none`, { label, display: styles.display })
  }

  if (styles.visibility === 'hidden') {
    throw new CaptureError(`${label} has visibility:hidden`, { label, visibility: styles.visibility })
  }
}

/**
 * Create an offscreen clone that remains renderable.
 *
 * CRITICAL: Do NOT use left:-9999px or display:none - these break rendering.
 * Instead, use transform to move offscreen while keeping the element visible.
 *
 * @param source - Source element to clone
 * @param options - Configuration options
 * @returns Object with clone element and cleanup function
 */
export function createOffscreenClone(
  source: HTMLElement,
  options: {
    /** Background color for the clone container */
    backgroundColor?: string
    /** Additional styles to apply to the clone */
    additionalStyles?: Partial<CSSStyleDeclaration>
  } = {}
): { clone: HTMLElement; cleanup: () => void } {
  const { backgroundColor = '#FFFDF8' } = options

  // Get source dimensions before cloning
  const sourceRect = source.getBoundingClientRect()

  if (DEBUG) {
    console.log('[image-utils] createOffscreenClone source rect:', {
      width: sourceRect.width,
      height: sourceRect.height,
    })
  }

  // Clone the element
  const clone = source.cloneNode(true) as HTMLElement

  // CRITICAL: Set explicit dimensions to preserve layout
  // Using fixed position with explicit width/height preserves rendering
  clone.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: ${sourceRect.width}px !important;
    height: ${sourceRect.height}px !important;
    transform: translateX(-200vw) !important;
    opacity: 1 !important;
    visibility: visible !important;
    pointer-events: none !important;
    z-index: -1 !important;
    background: ${backgroundColor} !important;
  `

  // Apply any additional styles
  if (options.additionalStyles) {
    Object.assign(clone.style, options.additionalStyles)
  }

  // Append to body
  document.body.appendChild(clone)

  // Track if cleanup has been called (idempotent cleanup)
  let isCleanedUp = false

  // Cleanup function - safe to call multiple times
  // Uses defensive checks to avoid NotFoundError during React route transitions
  const cleanup = () => {
    // Prevent double cleanup
    if (isCleanedUp) {
      if (DEBUG) console.log('[image-utils] Clone already cleaned up, skipping')
      return
    }
    isCleanedUp = true

    try {
      // Only remove if still attached to DOM
      if (clone && clone.parentNode) {
        clone.parentNode.removeChild(clone)
        if (DEBUG) console.log('[image-utils] Clone cleaned up')
      }
    } catch (err) {
      // Silently ignore removeChild errors (node may already be detached)
      if (DEBUG) console.warn('[image-utils] Clone cleanup error (safe to ignore):', err)
    }
  }

  return { clone, cleanup }
}

/**
 * Preload a single image URL.
 * Returns a promise that resolves when the image is loaded.
 *
 * @param url - Image URL to preload
 * @param timeoutMs - Timeout in milliseconds (default: 3000)
 */
export async function preloadImage(url: string, timeoutMs = 3000): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    const timeout = setTimeout(() => {
      reject(new Error(`Image load timeout: ${url}`))
    }, timeoutMs)

    img.onload = () => {
      clearTimeout(timeout)
      resolve(img)
    }

    img.onerror = () => {
      clearTimeout(timeout)
      reject(new Error(`Image load failed: ${url}`))
    }

    img.src = url
  })
}

/**
 * Convert an image URL to a data URL (base64).
 * This avoids CORS issues when capturing DOM with html-to-image.
 *
 * @param url - Image URL to convert
 * @param timeoutMs - Timeout in milliseconds
 */
export async function imageToDataUrl(url: string, timeoutMs = 4000): Promise<string> {
  // If already a data URL or blob URL, return as-is
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return url
  }

  // Local images (same origin) can be used directly
  if (url.startsWith('/')) {
    // For local images, we still convert to dataURL for clone safety
    try {
      const img = await preloadImage(url, timeoutMs)
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      return canvas.toDataURL('image/png')
    } catch {
      // Fallback: return original URL if conversion fails
      if (DEBUG) console.warn('[image-utils] Failed to convert local image to dataURL:', url)
      return url
    }
  }

  // For external URLs, fetch and convert to dataURL
  try {
    const response = await fetch(url, { mode: 'cors' })
    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status}`)
    }
    const blob = await response.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    if (DEBUG) console.warn('[image-utils] Failed to convert external image to dataURL:', url, error)
    // Fallback: try canvas method
    try {
      const img = await preloadImage(url, timeoutMs)
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      return canvas.toDataURL('image/png')
    } catch {
      // Last resort: return original URL
      return url
    }
  }
}

/**
 * Wait for all images within a DOM element to be fully loaded.
 *
 * @param root - Root element to search for images
 * @param options - Configuration options
 */
export async function waitForImages(
  root: HTMLElement,
  options: { timeoutMs?: number } = {}
): Promise<void> {
  const { timeoutMs = 3000 } = options

  const images = Array.from(root.querySelectorAll('img')) as HTMLImageElement[]

  if (DEBUG) console.log('[image-utils] waitForImages: found', images.length, 'images')

  const imagePromises = images.map((img, index) => {
    return new Promise<void>((resolve) => {
      // Already loaded
      if (img.complete && img.naturalWidth > 0) {
        if (DEBUG) console.log('[image-utils] Image', index, 'already loaded:', img.src.substring(0, 50))
        resolve()
        return
      }

      const timeout = setTimeout(() => {
        if (DEBUG) console.warn('[image-utils] Image', index, 'load timeout:', img.src.substring(0, 50))
        resolve() // Don't reject - resolve anyway to not block other images
      }, timeoutMs)

      img.onload = () => {
        clearTimeout(timeout)
        if (DEBUG) console.log('[image-utils] Image', index, 'loaded:', img.src.substring(0, 50))
        resolve()
      }

      img.onerror = () => {
        clearTimeout(timeout)
        if (DEBUG) console.warn('[image-utils] Image', index, 'load error:', img.src.substring(0, 50))
        resolve() // Don't reject - resolve anyway
      }
    })
  })

  await Promise.all(imagePromises)
}

/**
 * Collect all image URLs from a DOM element (including background-images).
 *
 * @param root - Root element to search
 */
export function collectImageUrls(root: HTMLElement): string[] {
  const urls: string[] = []

  // Collect <img> src attributes
  const images = root.querySelectorAll('img')
  images.forEach(img => {
    if (img.src) urls.push(img.src)
  })

  // Collect background-image URLs from computed styles
  const allElements = root.querySelectorAll('*')
  allElements.forEach(el => {
    const style = window.getComputedStyle(el)
    const bgImage = style.backgroundImage
    if (bgImage && bgImage !== 'none') {
      const match = bgImage.match(/url\(["']?(.+?)["']?\)/)
      if (match && match[1]) {
        urls.push(match[1])
      }
    }
  })

  return [...new Set(urls)] // Remove duplicates
}

/**
 * Replace all image src attributes with data URLs in a cloned DOM element.
 * This ensures CORS safety when capturing the DOM.
 *
 * @param root - Root element (should be a clone, not the original DOM)
 * @param urlToDataUrl - Map of original URLs to data URLs
 */
export function replaceImageSrcsWithDataUrls(
  root: HTMLElement,
  urlToDataUrl: Map<string, string>
): void {
  const images = root.querySelectorAll('img')
  images.forEach(img => {
    const dataUrl = urlToDataUrl.get(img.src)
    if (dataUrl) {
      img.src = dataUrl
    }
  })
}

/**
 * Preload all images from a DOM element and create a URL-to-dataURL map.
 * This is the main utility for preparing images before capture.
 *
 * @param root - Root element to search for images
 * @param options - Configuration options
 */
export async function prepareImagesForCapture(
  root: HTMLElement,
  options: { timeoutMs?: number } = {}
): Promise<Map<string, string>> {
  const { timeoutMs = 4000 } = options
  const urls = collectImageUrls(root)
  const urlMap = new Map<string, string>()

  if (DEBUG) console.log('[image-utils] prepareImagesForCapture: found', urls.length, 'image URLs')

  await Promise.all(
    urls.map(async url => {
      try {
        const dataUrl = await imageToDataUrl(url, timeoutMs)
        urlMap.set(url, dataUrl)
        if (DEBUG) console.log('[image-utils] Converted to dataURL:', url.substring(0, 50))
      } catch (error) {
        if (DEBUG) console.warn('[image-utils] Failed to convert:', url.substring(0, 50), error)
        // Keep original URL as fallback
        urlMap.set(url, url)
      }
    })
  )

  return urlMap
}
