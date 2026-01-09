'use client'

import { useState, useEffect } from 'react'
import { jsPDF } from 'jspdf'
import { AppIcon } from '@/components/ui/app-icon'
import { cn } from '@/lib/utils'
import { getSupabaseClient } from '@/lib/supabase/client'
import { ensurePdfFontsReady, setKoreanFont } from '@/lib/pdf-fonts'

// View type determines how entries are grouped in PDF, NOT the query range
type ViewType = 'day' | 'week' | 'month'
type ExportMode = 'range' | 'liked'

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
}

interface EntryData {
  id: string
  entry_date: string
  praise: string | null
  photo_path: string | null
  is_liked: boolean
  photoUrl?: string // signed URL
}

// Format date for display
function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// Get ISO week number and year
function getWeekInfo(dateStr: string): { weekNum: number; year: number; weekStart: string; weekEnd: string } {
  const date = new Date(dateStr + 'T00:00:00')
  const day = date.getDay()
  // Week starts on Sunday (day 0)
  const weekStart = new Date(date)
  weekStart.setDate(date.getDate() - day)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  // Get week number (simple calculation)
  const startOfYear = new Date(date.getFullYear(), 0, 1)
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
  const weekNum = Math.ceil((days + startOfYear.getDay() + 1) / 7)

  return {
    weekNum,
    year: date.getFullYear(),
    weekStart: weekStart.toISOString().split('T')[0],
    weekEnd: weekEnd.toISOString().split('T')[0],
  }
}

// Get month info
function getMonthInfo(dateStr: string): { month: number; year: number; monthName: string } {
  const date = new Date(dateStr + 'T00:00:00')
  return {
    month: date.getMonth(),
    year: date.getFullYear(),
    monthName: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
  }
}

// Group entries by view type
function groupEntriesByView(entries: EntryData[], viewType: ViewType): Map<string, EntryData[]> {
  const groups = new Map<string, EntryData[]>()

  for (const entry of entries) {
    let groupKey: string

    if (viewType === 'day') {
      groupKey = entry.entry_date
    } else if (viewType === 'week') {
      const { year, weekNum } = getWeekInfo(entry.entry_date)
      groupKey = `${year}-W${weekNum.toString().padStart(2, '0')}`
    } else {
      const { year, month } = getMonthInfo(entry.entry_date)
      groupKey = `${year}-${(month + 1).toString().padStart(2, '0')}`
    }

    if (!groups.has(groupKey)) {
      groups.set(groupKey, [])
    }
    groups.get(groupKey)!.push(entry)
  }

  return groups
}

// Get group title for PDF section header
function getGroupTitle(groupKey: string, viewType: ViewType, entries: EntryData[]): string {
  if (viewType === 'day') {
    return formatDisplayDate(groupKey)
  } else if (viewType === 'week') {
    // groupKey is like "2026-W01"
    const firstEntry = entries[0]
    const lastEntry = entries[entries.length - 1]
    const { weekStart, weekEnd } = getWeekInfo(firstEntry.entry_date)
    return `Week: ${formatDisplayDate(weekStart)} - ${formatDisplayDate(weekEnd)}`
  } else {
    // groupKey is like "2026-01"
    const [year, month] = groupKey.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1, 1)
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }
}

// Load image as base64 for PDF embedding
async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error('Failed to fetch image')
    const blob = await response.blob()

    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch (err) {
    console.warn('[ExportPDF] Failed to load image:', err)
    return null
  }
}

export function ExportModal({
  isOpen,
  onClose,
}: ExportModalProps) {
  // Export mode: range (with date picker) or liked (favorites)
  const [exportMode, setExportMode] = useState<ExportMode>('range')

  // Date range for 'range' mode
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  // View type for grouping (only affects PDF layout, not query)
  const [viewType, setViewType] = useState<ViewType>('day')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [likedCount, setLikedCount] = useState<number | null>(null)

  const supabase = getSupabaseClient()

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null)
      checkLikedCount()
      // Set default date range to current month
      const today = new Date()
      const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      setFromDate(firstOfMonth.toISOString().split('T')[0])
      setToDate(today.toISOString().split('T')[0])
    }
  }, [isOpen])

  // Check liked count
  const checkLikedCount = async () => {
    const { count } = await supabase
      .from('entries')
      .select('*', { count: 'exact', head: true })
      .eq('is_liked', true)
    setLikedCount(count || 0)
  }

  // Validate date range
  const isDateRangeValid = (): boolean => {
    if (exportMode === 'liked') return true
    if (!fromDate || !toDate) return false
    return fromDate <= toDate
  }

  // Get validation error message
  const getValidationError = (): string | null => {
    if (exportMode === 'liked') {
      if (likedCount === 0) return 'No favorite entries yet'
      return null
    }
    if (!fromDate || !toDate) return 'Please select date range'
    if (fromDate > toDate) return 'From date must be before To date'
    return null
  }

  // Fetch entries based on mode
  const fetchEntries = async (): Promise<EntryData[]> => {
    let query = supabase
      .from('entries')
      .select('id, entry_date, praise, photo_path, is_liked')
      .order('entry_date', { ascending: true })

    if (exportMode === 'liked') {
      query = query.eq('is_liked', true)
    } else {
      // Always query by date range
      query = query.gte('entry_date', fromDate).lte('entry_date', toDate)
    }

    const { data, error: fetchError } = await query

    if (fetchError) {
      console.error('[ExportPDF] Fetch error:', fetchError.code, fetchError.message)
      throw new Error('Failed to load entries')
    }

    return data || []
  }

  // Generate signed URLs for photos
  const loadPhotos = async (entries: EntryData[]): Promise<EntryData[]> => {
    const entriesWithPhotos: EntryData[] = []

    for (const entry of entries) {
      let photoUrl: string | undefined

      if (entry.photo_path) {
        const { data, error: urlError } = await supabase.storage
          .from('entry-photos')
          .createSignedUrl(entry.photo_path, 3600)

        if (urlError) {
          console.warn('[ExportPDF] Signed URL error for', entry.photo_path, ':', urlError.message)
        } else {
          photoUrl = data?.signedUrl
        }
      }

      entriesWithPhotos.push({ ...entry, photoUrl })
    }

    return entriesWithPhotos
  }

  // Generate PDF filename
  const getFilename = (): string => {
    if (exportMode === 'liked') {
      return 'DayPat_Favorites.pdf'
    }
    return `DayPat_${fromDate}_to_${toDate}_${viewType}.pdf`
  }

  // Generate PDF with grouping based on view type
  const generatePDF = async (entries: EntryData[]) => {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    // Load Korean font for proper text rendering
    await ensurePdfFontsReady(pdf)

    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 20
    const contentWidth = pageWidth - margin * 2

    // Group entries by view type (for range mode) or just list them (for liked mode)
    const groups = exportMode === 'liked'
      ? new Map([['Favorites', entries]])
      : groupEntriesByView(entries, viewType)

    let isFirstGroup = true

    for (const [groupKey, groupEntries] of groups) {
      // Add page break between groups (except first)
      if (!isFirstGroup) {
        pdf.addPage()
      }
      isFirstGroup = false

      let currentY = margin

      // Group header (for range mode with week/month view)
      if (exportMode === 'range' && viewType !== 'day') {
        const groupTitle = getGroupTitle(groupKey, viewType, groupEntries)
        pdf.setFontSize(16)
        pdf.setTextColor(80, 80, 80)
        setKoreanFont(pdf, 'bold')
        pdf.text(groupTitle, margin, currentY)
        currentY += 12

        // Divider line
        pdf.setDrawColor(200, 200, 200)
        pdf.line(margin, currentY, pageWidth - margin, currentY)
        currentY += 8
        setKoreanFont(pdf, 'normal')
      }

      // Render entries in this group
      let isFirstEntry = true
      for (const entry of groupEntries) {
        // Check if we need a new page
        const estimatedHeight = 200 // rough estimate for entry
        if (currentY + estimatedHeight > pageHeight - margin && !isFirstEntry) {
          pdf.addPage()
          currentY = margin
        }
        isFirstEntry = false

        // Date header
        pdf.setFontSize(14)
        pdf.setTextColor(100, 100, 100)
        setKoreanFont(pdf, 'normal')
        const dateText = formatDisplayDate(entry.entry_date)
        pdf.text(dateText, margin, currentY)

        // Liked indicator
        if (entry.is_liked) {
          pdf.setTextColor(239, 68, 68) // red-500
          pdf.text(' ♥', margin + pdf.getTextWidth(dateText), currentY)
        }

        currentY += 10

        // Photo
        if (entry.photoUrl) {
          const imageData = await loadImageAsBase64(entry.photoUrl)
          if (imageData) {
            try {
              const img = new Image()
              await new Promise((resolve, reject) => {
                img.onload = resolve
                img.onerror = reject
                img.src = imageData
              })

              const aspectRatio = img.height / img.width
              const imageWidth = contentWidth
              const imageHeight = imageWidth * aspectRatio

              const maxImageHeight = pageHeight - currentY - margin - 30
              const finalHeight = Math.min(imageHeight, maxImageHeight)
              const finalWidth = finalHeight / aspectRatio

              const imageX = margin + (contentWidth - finalWidth) / 2

              pdf.addImage(imageData, 'WEBP', imageX, currentY, finalWidth, finalHeight)
              currentY += finalHeight + 8
            } catch (imgErr) {
              console.warn('[ExportPDF] Failed to add image to PDF:', imgErr)
              pdf.setFontSize(10)
              pdf.setTextColor(150, 150, 150)
              setKoreanFont(pdf, 'normal')
              pdf.text('[Photo unavailable]', margin, currentY)
              currentY += 10
            }
          }
        }

        // Praise text (may contain Korean)
        if (entry.praise) {
          pdf.setFontSize(12)
          pdf.setTextColor(60, 60, 60)
          setKoreanFont(pdf, 'normal')

          const lines = pdf.splitTextToSize(entry.praise, contentWidth)
          const lineHeight = 6
          const availableHeight = pageHeight - currentY - margin
          const maxLines = Math.floor(availableHeight / lineHeight)
          const displayLines = lines.slice(0, maxLines)

          pdf.text(displayLines, margin, currentY)
          currentY += displayLines.length * lineHeight + 15
        } else {
          currentY += 15
        }
      }
    }

    // Save PDF
    pdf.save(getFilename())
  }

  // Handle export
  const handleExport = async () => {
    const validationError = getValidationError()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const entries = await fetchEntries()

      if (entries.length === 0) {
        setError('No entries found for the selected period')
        setLoading(false)
        return
      }

      const entriesWithPhotos = await loadPhotos(entries)
      await generatePDF(entriesWithPhotos)

      onClose()
    } catch (err) {
      console.error('[ExportPDF] Export error:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate PDF')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const validationError = getValidationError()
  const canExport = !validationError && !loading

  return (
    <div
      className={cn(
        'fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] transition-opacity duration-300 flex items-center justify-center p-5',
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">Export to PDF</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            <AppIcon name="x" className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Export Mode Toggle */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Export type:</p>
            <div className="flex gap-2">
              <button
                onClick={() => setExportMode('range')}
                disabled={loading}
                className={cn(
                  'flex-1 py-2.5 px-4 rounded-xl border-2 font-medium transition-all',
                  exportMode === 'range'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                )}
              >
                Date Range
              </button>
              <button
                onClick={() => setExportMode('liked')}
                disabled={loading || likedCount === 0}
                className={cn(
                  'flex-1 py-2.5 px-4 rounded-xl border-2 font-medium transition-all flex items-center justify-center gap-2',
                  exportMode === 'liked'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600',
                  likedCount === 0 && 'opacity-50 cursor-not-allowed'
                )}
              >
                <AppIcon name="heart" className="w-4 h-4 text-red-500" />
                Favorites
                {likedCount !== null && <span className="text-xs">({likedCount})</span>}
              </button>
            </div>
          </div>

          {/* Date Range Selection (only for 'range' mode) */}
          {exportMode === 'range' && (
            <>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">Select date range:</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">From</label>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      disabled={loading}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none transition-all disabled:bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">To</label>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      disabled={loading}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none transition-all disabled:bg-gray-50"
                    />
                  </div>
                </div>
              </div>

              {/* View Type Selection */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">Group by:</p>
                <div className="flex gap-2">
                  {(['day', 'week', 'month'] as ViewType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setViewType(type)}
                      disabled={loading}
                      className={cn(
                        'flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all capitalize',
                        viewType === type
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Entries will be grouped by {viewType} in the PDF
                </p>
              </div>
            </>
          )}

          {/* Liked mode info */}
          {exportMode === 'liked' && likedCount === 0 && (
            <p className="text-sm text-gray-500 text-center py-2">
              No favorite entries yet. Like some entries first!
            </p>
          )}

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Export button */}
          <button
            onClick={handleExport}
            disabled={!canExport}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <AppIcon name="spinner" className="w-5 h-5 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <AppIcon name="file-text" className="w-5 h-5" />
                Export PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
