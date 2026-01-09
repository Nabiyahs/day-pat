'use client'

import { useState, useEffect } from 'react'
import { jsPDF } from 'jspdf'
import { AppIcon } from '@/components/ui/app-icon'
import { cn } from '@/lib/utils'
import { renderViewPages, type ExportViewType, type PageImage } from '@/lib/export-view-renderer'
import { startOfWeek, startOfMonth, format } from 'date-fns'

/**
 * View-Based Export Modal
 *
 * This modal exports the CURRENT VIEW as shown on screen:
 * - Day View: Exports the selected day as a polaroid (same as SNS share)
 * - Week View: Exports the current week view (multi-page if needed)
 * - Month View: Exports the current month view as a single page
 *
 * NO date range selection - exports exactly what the user sees.
 */

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  activeView: ExportViewType
  selectedDate: string // YYYY-MM-DD format
  weekAnchorDate?: Date // Optional: anchor date for week view
  monthYear?: number // Optional: year for month view
  monthIndex?: number // Optional: month index (0-11) for month view
}

// Get description based on view type
function getViewDescription(viewType: ExportViewType, selectedDate: string, weekAnchorDate?: Date, monthYear?: number, monthIndex?: number): string {
  const date = new Date(selectedDate + 'T00:00:00')

  switch (viewType) {
    case 'day':
      return format(date, 'MMMM d, yyyy')
    case 'week': {
      const weekStart = weekAnchorDate
        ? startOfWeek(weekAnchorDate, { weekStartsOn: 1 })
        : startOfWeek(date, { weekStartsOn: 1 })
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
    }
    case 'month': {
      const y = monthYear ?? date.getFullYear()
      const m = monthIndex ?? date.getMonth()
      const monthDate = new Date(y, m, 1)
      return format(monthDate, 'MMMM yyyy')
    }
    default:
      return ''
  }
}

// Get filename based on view type
function getFilename(viewType: ExportViewType, selectedDate: string): string {
  const date = new Date(selectedDate + 'T00:00:00')

  switch (viewType) {
    case 'day':
      return `DayPat_${format(date, 'yyyy-MM-dd')}.pdf`
    case 'week': {
      const weekStart = startOfWeek(date, { weekStartsOn: 1 })
      return `DayPat_Week_${format(weekStart, 'yyyy-MM-dd')}.pdf`
    }
    case 'month':
      return `DayPat_${format(date, 'yyyy-MM')}.pdf`
    default:
      return 'DayPat_Export.pdf'
  }
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
  weekAnchorDate,
  monthYear,
  monthIndex,
}: ExportModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<string>('')

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null)
      setProgress('')
    }
  }, [isOpen])

  // Handle export
  const handleExport = async () => {
    setLoading(true)
    setError(null)
    setProgress('Preparing export...')

    try {
      // Render pages based on view type
      setProgress('Rendering view...')
      const pages = await renderViewPages({
        viewType: activeView,
        selectedDate,
        weekAnchorDate,
        monthYear,
        monthIndex,
      })

      if (pages.length === 0) {
        throw new Error('No content to export')
      }

      // Generate PDF
      setProgress(`Generating PDF (${pages.length} page${pages.length > 1 ? 's' : ''})...`)
      const filename = getFilename(activeView, selectedDate)
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

  const viewDescription = getViewDescription(activeView, selectedDate, weekAnchorDate, monthYear, monthIndex)

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

        <div className="p-6 space-y-5">
          {/* Current View Info */}
          <div className="bg-amber-50 rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center',
                activeView === 'day' && 'bg-orange-100',
                activeView === 'week' && 'bg-blue-100',
                activeView === 'month' && 'bg-purple-100'
              )}>
                <AppIcon
                  name={activeView === 'day' ? 'calendar' : activeView === 'week' ? 'calendar-days' : 'calendar-range'}
                  className={cn(
                    'w-5 h-5',
                    activeView === 'day' && 'text-orange-600',
                    activeView === 'week' && 'text-blue-600',
                    activeView === 'month' && 'text-purple-600'
                  )}
                />
              </div>
              <div>
                <p className="font-semibold text-gray-800 capitalize">{activeView} View</p>
                <p className="text-sm text-gray-600">{viewDescription}</p>
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-2">
              {activeView === 'day' && 'Your day will be exported as a polaroid image.'}
              {activeView === 'week' && 'Your week will be exported with all entries. Multiple pages if needed.'}
              {activeView === 'month' && 'Your month calendar will be exported as a single page.'}
            </p>
          </div>

          {/* Export Info */}
          <div className="text-center py-2">
            <p className="text-sm text-gray-500">
              The export will match exactly what you see on screen.
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

          {/* Export button */}
          <button
            onClick={handleExport}
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <AppIcon name="spinner" className="w-5 h-5 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <AppIcon name="file-text" className="w-5 h-5" />
                Export {activeView.charAt(0).toUpperCase() + activeView.slice(1)} View
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
