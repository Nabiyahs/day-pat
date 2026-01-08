'use client'

import { useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AppIcon } from '@/components/ui/app-icon'
import { DayView } from '@/components/day/day-view'

interface DayViewModalProps {
  isOpen: boolean
  onClose: () => void
  selectedDate: string
  onDateChange: (date: string) => void
}

export function DayViewModal({ isOpen, onClose, selectedDate, onDateChange }: DayViewModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  // Handle escape key and focus management
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    if (isOpen) {
      // Store previously focused element
      previousFocusRef.current = document.activeElement as HTMLElement

      // Disable body scroll
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'

      // Focus the modal
      setTimeout(() => {
        modalRef.current?.focus()
      }, 100)
    }

    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'auto'

      // Restore focus when modal closes
      if (previousFocusRef.current && !isOpen) {
        previousFocusRef.current.focus()
      }
    }
  }, [isOpen, onClose])

  // Focus trap handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !modalRef.current) return

    const focusableElements = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault()
        lastElement?.focus()
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault()
        firstElement?.focus()
      }
    }
  }, [])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal - bottom sheet on mobile, centered card on desktop */}
          <motion.div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label="Day View"
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 rounded-t-3xl md:rounded-2xl shadow-xl z-50 flex flex-col max-h-[90vh] md:max-h-[85vh] md:max-w-md md:w-full overflow-hidden"
          >
            {/* Header with close button and drag handle (mobile) */}
            <div className="sticky top-0 z-10 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 pt-3 pb-2 px-4">
              {/* Mobile drag handle indicator */}
              <div className="flex justify-center mb-2 md:hidden">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
              </div>

              {/* Close button */}
              <div className="flex justify-end">
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/80 hover:bg-white transition-colors shadow-sm"
                  aria-label="Close"
                >
                  <AppIcon name="x" className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Day View Content - scrollable */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-2 pb-6">
              {/* Only render DayView when we have a valid date */}
              {selectedDate ? (
                <DayView
                  selectedDate={selectedDate}
                  onDateChange={onDateChange}
                />
              ) : (
                <div className="flex items-center justify-center h-40">
                  <p className="text-gray-400">Loading...</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
