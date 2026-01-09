'use client'

import { useState, useEffect, useMemo } from 'react'
import { jsPDF } from 'jspdf'
import { AppIcon } from '@/components/ui/app-icon'
import { DateWheelPicker } from '@/components/ui/date-wheel-picker'
import { cn } from '@/lib/utils'
import { buildPdfPages, type ExportMode, type PageImage } from '@/lib/export-view-renderer'
import { format, subMonths } from 'date-fns'

/**
 * View-Based Export Modal with Date Range Selection
 *
 * Export Types:
 * - Day: One polaroid per day in range
 * - Week: Multi-page week views for each week in range
 * - Month: Calendar grid for each month in range
 * - Favorites: Polaroid grid of favorited entries in range
 *
 * Date Range: Independent from main page toggle state
 */

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  activeView: 'day' | 'week' | 'month'
  selectedDate: string // YYYY-MM-DD format (used as default for date range)
}

// Export mode options - simplified to just value and label
const EXPORT_MODES: Array<{ value: ExportMode; label: string }> = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'favorites', label: 'Favorites' },
]

// Type descriptions - reused from previous modal implementation
const TYPE_DESCRIPTIONS: Record<ExportMode, string> = {
  day: 'Each day in the range will be exported as a polaroid page.',
  week: 'Each week in the range will be exported with all entries. Multiple pages per week if needed.',
  month: 'Each month in the range will be exported as a calendar grid page.',
  favorites: 'All favorited entries in the range will be exported as a polaroid grid.',
}

// Get filename based on export mode and date range
function getFilename(mode: ExportMode, fromDate: string, toDate: string): string {
  const fromStr = fromDate.replace(/-/g, '')
  const toStr = toDate.replace(/-/g, '')

  switch (mode) {
    case 'day':
      return `DayPat_Days_${fromStr}-${toStr}.pdf`
    case 'week':
      return `DayPat_Weeks_${fromStr}-${toStr}.pdf`
    case 'month':
      return `DayPat_Months_${fromStr}-${toStr}.pdf`
    case 'favorites':
      return `DayPat_Favorites_${fromStr}-${toStr}.pdf`
    default:
      return 'DayPat_Export.pdf'
  }
}

// Format date as YYYY/M/D (no zero padding)
function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return format(date, 'yyyy/M/d')
}

// Generate PDF from page images
async function generatePdfFromPages(pages: PageImage[], filename: string): Promise<void> {
  if (pages.length === 0) {
    throw new Error('No pages to export')
  }

  // Create PDF with A4 dimensions
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]

    if (i > 0) {
      pdf.addPage()
    }

    // Calculate scaling to fit image on page while maintaining aspect ratio
    const imgAspect = page.width / page.height
    const pageAspect = pageWidth / pageHeight

    let imgWidth: number
    let imgHeight: number

    if (imgAspect > pageAspect) {
      // Image is wider - fit to width
      imgWidth = pageWidth
      imgHeight = pageWidth / imgAspect
    } else {
      // Image is taller - fit to height
      imgHeight = pageHeight
      imgWidth = pageHeight * imgAspect
    }

    // Center image on page
    const x = (pageWidth - imgWidth) / 2
    const y = (pageHeight - imgHeight) / 2

    // Add image to PDF
    pdf.addImage(page.dataUrl, 'PNG', x, y, imgWidth, imgHeight)
  }

  // Save PDF
  pdf.save(filename)
}

export function ExportModal({
  isOpen,
  onClose,
  activeView,
  selectedDate,
}: ExportModalProps) {
  // Map activeView to ExportMode for initial value
  const initialMode: ExportMode = activeView === 'day' ? 'day' : activeView === 'week' ? 'week' : 'month'

  const [exportMode, setExportMode] = useState<ExportMode>(initialMode)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<string>('')

  // Date range state - default to last 30 days
  const defaultTo = selectedDate
  const defaultFrom = useMemo(() => {
    const date = new Date(selectedDate + 'T00:00:00')
    return format(subMonths(date, 1), 'yyyy-MM-dd')
  }, [selectedDate])

  const [fromDate, setFromDate] = useState(defaultFrom)
  const [toDate, setToDate] = useState(defaultTo)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null)
      setProgress('')
      setExportMode(initialMode)
      setFromDate(defaultFrom)
      setToDate(defaultTo)
    }
  }, [isOpen, initialMode, defaultFrom, defaultTo])

  // Validate date range
  const isValidRange = useMemo(() => {
    return fromDate && toDate && fromDate <= toDate
  }, [fromDate, toDate])

  // Format date range for display (YYYY/M/D format)
  const dateRangeDisplay = useMemo(() => {
    if (!fromDate || !toDate) return ''
    return `${formatDateDisplay(fromDate)} - ${formatDateDisplay(toDate)}`
  }, [fromDate, toDate])

  // Handle export
  const handleExport = async () => {
    if (!isValidRange) {
      setError('Please select a valid date range')
      return
    }

    setLoading(true)
    setError(null)
    setProgress('Preparing export...')

    try {
      // Build pages using the new date range API
      setProgress(`Rendering ${exportMode} view...`)
      const pages = await buildPdfPages({
        mode: exportMode,
        fromDate,
        toDate,
      })

      if (pages.length === 0) {
        throw new Error('No content to export for the selected date range')
      }

      // Generate PDF
      setProgress(`Generating PDF (${pages.length} page${pages.length > 1 ? 's' : ''})...`)
      const filename = getFilename(exportMode, fromDate, toDate)
      await generatePdfFromPages(pages, filename)

      setProgress('')
      onClose()
    } catch (err) {
      console.error('[ExportModal] Export error:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate PDF')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className={cn(
        'fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] transition-opacity duration-300 flex items-center justify-center p-5',
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
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
          {/* Export Type Selection - Simplified text-only buttons */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Export Type
            </label>
            <div className="flex gap-2">
              {EXPORT_MODES.map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  disabled={loading}
                  onClick={() => setExportMode(mode.value)}
                  className={cn(
                    'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all',
                    exportMode === mode.value
                      ? 'bg-[#F27430] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range Selection - Wheel Pickers */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700">
              Date Range
            </label>

            <div className="grid grid-cols-2 gap-3">
              {/* From Date */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">From</label>
                <DateWheelPicker
                  value={fromDate}
                  onChange={setFromDate}
                  disabled={loading}
                />
              </div>

              {/* To Date */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">To</label>
                <DateWheelPicker
                  value={toDate}
                  onChange={setToDate}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Date Range Invalid Warning */}
            {!isValidRange && fromDate && toDate && (
              <p className="text-xs text-red-500">
                "From" date must be before or equal to "To" date
              </p>
            )}
          </div>

          {/* Summary Box */}
          <div className="bg-amber-50 rounded-2xl p-4">
            <p className="font-semibold text-gray-800 mb-1">
              {dateRangeDisplay}
            </p>
            <p className="text-xs text-gray-500">
              {TYPE_DESCRIPTIONS[exportMode]}
            </p>
          </div>

          {/* Progress indicator */}
          {loading && progress && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
              <AppIcon name="spinner" className="w-5 h-5 animate-spin text-blue-500" />
              <p className="text-sm text-blue-700">{progress}</p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Export button - No icon */}
          <button
            onClick={handleExport}
            disabled={loading || !isValidRange}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl transition-all"
          >
            {loading ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  )
}
