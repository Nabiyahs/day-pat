'use client'

import { useState } from 'react'
import { jsPDF } from 'jspdf'
import { AppIcon } from '@/components/ui/app-icon'
import { cn } from '@/lib/utils'
import { getSupabaseClient } from '@/lib/supabase/client'

type ExportType = 'day' | 'week' | 'month' | 'liked'

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  selectedDate?: string // YYYY-MM-DD format
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
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// Get week range for a date
function getWeekRange(dateStr: string): { start: string; end: string } {
  const date = new Date(dateStr)
  const day = date.getDay()
  const start = new Date(date)
  start.setDate(date.getDate() - day)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

// Get month range for a date
function getMonthRange(dateStr: string): { start: string; end: string } {
  const date = new Date(dateStr)
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
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
  selectedDate = new Date().toISOString().split('T')[0],
}: ExportModalProps) {
  const [exportType, setExportType] = useState<ExportType>('day')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [likedCount, setLikedCount] = useState<number | null>(null)

  const supabase = getSupabaseClient()

  // Check liked count when modal opens or type changes to 'liked'
  const checkLikedCount = async () => {
    const { count } = await supabase
      .from('entries')
      .select('*', { count: 'exact', head: true })
      .eq('is_liked', true)
    setLikedCount(count || 0)
  }

  // Fetch entries based on export type
  const fetchEntries = async (): Promise<EntryData[]> => {
    let query = supabase
      .from('entries')
      .select('id, entry_date, praise, photo_path, is_liked')
      .order('entry_date', { ascending: true })

    if (exportType === 'day') {
      query = query.eq('entry_date', selectedDate)
    } else if (exportType === 'week') {
      const { start, end } = getWeekRange(selectedDate)
      query = query.gte('entry_date', start).lte('entry_date', end)
    } else if (exportType === 'month') {
      const { start, end } = getMonthRange(selectedDate)
      query = query.gte('entry_date', start).lte('entry_date', end)
    } else if (exportType === 'liked') {
      query = query.eq('is_liked', true)
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
          // Continue without photo
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
    if (exportType === 'day') {
      return `DayPat_Day_${selectedDate}.pdf`
    } else if (exportType === 'week') {
      const { start, end } = getWeekRange(selectedDate)
      return `DayPat_Week_${start}_to_${end}.pdf`
    } else if (exportType === 'month') {
      const date = new Date(selectedDate)
      const monthStr = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).replace(' ', '_')
      return `DayPat_Month_${monthStr}.pdf`
    } else {
      return `DayPat_Liked.pdf`
    }
  }

  // Generate PDF
  const generatePDF = async (entries: EntryData[]) => {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 20
    const contentWidth = pageWidth - margin * 2

    let currentY = margin
    let isFirstEntry = true

    for (const entry of entries) {
      // Add new page if needed (not for first entry)
      if (!isFirstEntry) {
        pdf.addPage()
        currentY = margin
      }
      isFirstEntry = false

      // Date header
      pdf.setFontSize(14)
      pdf.setTextColor(100, 100, 100)
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
            // Calculate image dimensions to fit width while maintaining aspect ratio
            const img = new Image()
            await new Promise((resolve, reject) => {
              img.onload = resolve
              img.onerror = reject
              img.src = imageData
            })

            const aspectRatio = img.height / img.width
            const imageWidth = contentWidth
            const imageHeight = imageWidth * aspectRatio

            // Check if image fits on page, if not scale down
            const maxImageHeight = pageHeight - currentY - margin - 30 // Leave room for text
            const finalHeight = Math.min(imageHeight, maxImageHeight)
            const finalWidth = finalHeight / aspectRatio

            // Center the image
            const imageX = margin + (contentWidth - finalWidth) / 2

            pdf.addImage(imageData, 'WEBP', imageX, currentY, finalWidth, finalHeight)
            currentY += finalHeight + 8
          } catch (imgErr) {
            console.warn('[ExportPDF] Failed to add image to PDF:', imgErr)
            // Continue without image
            pdf.setFontSize(10)
            pdf.setTextColor(150, 150, 150)
            pdf.text('[Photo unavailable]', margin, currentY)
            currentY += 10
          }
        }
      }

      // Praise text
      if (entry.praise) {
        pdf.setFontSize(12)
        pdf.setTextColor(60, 60, 60)

        // Word wrap the text
        const lines = pdf.splitTextToSize(entry.praise, contentWidth)

        // Check if text fits, if not truncate
        const lineHeight = 6
        const availableHeight = pageHeight - currentY - margin
        const maxLines = Math.floor(availableHeight / lineHeight)
        const displayLines = lines.slice(0, maxLines)

        pdf.text(displayLines, margin, currentY)
      }
    }

    // Save PDF
    pdf.save(getFilename())
  }

  // Handle export
  const handleExport = async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch entries
      const entries = await fetchEntries()

      if (entries.length === 0) {
        setError('No entries found for the selected period')
        setLoading(false)
        return
      }

      // Load photos
      const entriesWithPhotos = await loadPhotos(entries)

      // Generate PDF
      await generatePDF(entriesWithPhotos)

      // Success - close modal
      onClose()
    } catch (err) {
      console.error('[ExportPDF] Export error:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate PDF')
    } finally {
      setLoading(false)
    }
  }

  // When modal opens, check liked count
  if (isOpen && likedCount === null) {
    checkLikedCount()
  }

  if (!isOpen) return null

  const exportOptions: { type: ExportType; label: string; description: string }[] = [
    { type: 'day', label: 'Day', description: formatDisplayDate(selectedDate) },
    { type: 'week', label: 'Week', description: `${formatDisplayDate(getWeekRange(selectedDate).start)} - ${formatDisplayDate(getWeekRange(selectedDate).end)}` },
    { type: 'month', label: 'Month', description: new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) },
    { type: 'liked', label: 'Favorites', description: likedCount !== null ? `${likedCount} entries` : 'Loading...' },
  ]

  const isLikedDisabled = exportType === 'liked' && likedCount === 0

  return (
    <div
      className={cn(
        'fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] transition-opacity duration-300 flex items-center justify-center p-5',
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
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

        <div className="p-6">
          {/* Export Type Options */}
          <div className="space-y-3 mb-6">
            <p className="text-sm font-medium text-gray-700 mb-3">Select export range:</p>
            {exportOptions.map((option) => (
              <button
                key={option.type}
                onClick={() => setExportType(option.type)}
                disabled={loading || (option.type === 'liked' && likedCount === 0)}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left',
                  exportType === option.type
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300',
                  (option.type === 'liked' && likedCount === 0) && 'opacity-50 cursor-not-allowed'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                    exportType === option.type ? 'border-orange-500' : 'border-gray-300'
                  )}>
                    {exportType === option.type && (
                      <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{option.label}</p>
                    <p className="text-xs text-gray-500">{option.description}</p>
                  </div>
                </div>
                {option.type === 'liked' && (
                  <AppIcon name="heart" className="w-5 h-5 text-red-500" />
                )}
              </button>
            ))}
          </div>

          {/* Liked warning */}
          {exportType === 'liked' && likedCount === 0 && (
            <p className="text-sm text-gray-500 text-center mb-4">
              No favorite entries yet. Like some entries first!
            </p>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Export button */}
          <button
            onClick={handleExport}
            disabled={loading || isLikedDisabled}
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
