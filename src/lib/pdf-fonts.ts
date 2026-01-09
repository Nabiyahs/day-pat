'use client'

import type { jsPDF } from 'jspdf'

// Google Fonts URL for NotoSansKR (Regular weight)
// Using the direct ttf URL from Google Fonts CDN
const NOTO_SANS_KR_URL = 'https://fonts.gstatic.com/s/notosanskr/v36/PbyxFmXiEBPT4ITbgNA5Cgms3VYcOA-vvnIzzuozeLTq8H4hfeE.ttf'

// Font names for jsPDF registration
const FONT_NAME = 'NotoSansKR'
const FONT_STYLE = 'normal'

// Cache for loaded font data
let cachedFontBase64: string | null = null
let fontLoadPromise: Promise<string> | null = null

/**
 * Fetch font file and convert to base64 string
 */
async function fetchFontAsBase64(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch font: ${response.statusText}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const uint8Array = new Uint8Array(arrayBuffer)

  // Convert to base64
  let binary = ''
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i])
  }

  return btoa(binary)
}

/**
 * Load Korean font (NotoSansKR) and register it with jsPDF instance.
 * This function caches the font data to avoid re-fetching.
 *
 * @param pdf - jsPDF instance to register the font with
 * @returns Promise that resolves when font is ready to use
 *
 * Usage:
 * ```
 * const pdf = new jsPDF()
 * await loadKoreanFont(pdf)
 * pdf.setFont('NotoSansKR', 'normal')
 * pdf.text('한글 텍스트', 10, 10)
 * ```
 */
export async function loadKoreanFont(pdf: jsPDF): Promise<void> {
  try {
    // Use cached font data if available, or load it
    if (!cachedFontBase64) {
      // Prevent multiple simultaneous fetches
      if (!fontLoadPromise) {
        fontLoadPromise = fetchFontAsBase64(NOTO_SANS_KR_URL)
      }
      cachedFontBase64 = await fontLoadPromise
    }

    // Register font with jsPDF VFS (Virtual File System)
    const fontFileName = `${FONT_NAME}-Regular.ttf`
    pdf.addFileToVFS(fontFileName, cachedFontBase64)
    pdf.addFont(fontFileName, FONT_NAME, FONT_STYLE)

    console.log('[PDF-Fonts] Korean font loaded and registered successfully')
  } catch (error) {
    console.error('[PDF-Fonts] Failed to load Korean font:', error)
    // Don't throw - allow fallback to default font
  }
}

/**
 * Set Korean-compatible font for PDF text rendering.
 * Falls back to helvetica if Korean font is not available.
 *
 * @param pdf - jsPDF instance
 * @param style - Font style: 'normal' or 'bold'
 */
export function setKoreanFont(pdf: jsPDF, style: 'normal' | 'bold' = 'normal'): void {
  try {
    // Try to set Korean font
    pdf.setFont(FONT_NAME, style)
  } catch {
    // Fallback to helvetica if Korean font not loaded
    console.warn('[PDF-Fonts] Korean font not available, using helvetica')
    pdf.setFont('helvetica', style)
  }
}

/**
 * Check if text contains Korean characters
 */
export function containsKorean(text: string): boolean {
  // Korean Unicode ranges: Hangul Syllables (AC00-D7AF), Hangul Jamo (1100-11FF), etc.
  return /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uD7B0-\uD7FF]/.test(text)
}

/**
 * Ensure fonts are ready before PDF generation.
 * Loads both document fonts and Korean PDF font.
 *
 * @param pdf - jsPDF instance to prepare
 */
export async function ensurePdfFontsReady(pdf: jsPDF): Promise<void> {
  // Wait for document fonts to be ready (for canvas capture)
  await document.fonts.ready

  // Load Korean font for jsPDF text rendering
  await loadKoreanFont(pdf)
}
