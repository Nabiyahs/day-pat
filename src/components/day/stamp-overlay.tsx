'use client'

import { useEffect, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface StampOverlayProps {
  /** Whether to show the stamp (entry exists) */
  show: boolean
  /** Trigger the stamp animation (after save success) */
  playAnimation: boolean
  /** Callback when animation completes */
  onAnimationComplete?: () => void
}

/**
 * Trigger haptic feedback (vibration) on supported devices.
 * Fails silently on iOS and unsupported browsers.
 */
function triggerHapticFeedback() {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(35) // Short "thump" vibration
    }
  } catch {
    // Silently ignore - vibration not supported or blocked
  }
}

/**
 * Stamp overlay for Day View polaroid card.
 * Shows a "compliment seal" stamp with a "thump" animation on save.
 * Only used in Day View - never rendered in month/week views.
 */
export function StampOverlay({
  show,
  playAnimation,
  onAnimationComplete,
}: StampOverlayProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  const handleAnimationStart = useCallback(() => {
    // Trigger haptic at the "land" moment (~200ms into 400ms animation)
    // This is when scale goes from 1.3 to 0.95 (50% keyframe)
    const hapticTimer = setTimeout(() => {
      triggerHapticFeedback()
    }, 180) // Slightly before 50% for better feel

    return () => clearTimeout(hapticTimer)
  }, [])

  useEffect(() => {
    if (playAnimation && show) {
      setIsAnimating(true)

      // Trigger haptic feedback at landing moment
      const hapticCleanup = handleAnimationStart()

      // Animation duration: 400ms
      const timer = setTimeout(() => {
        setIsAnimating(false)
        onAnimationComplete?.()
      }, 400)

      return () => {
        clearTimeout(timer)
        hapticCleanup()
      }
    }
  }, [playAnimation, show, onAnimationComplete, handleAnimationStart])

  if (!show) return null

  return (
    <div
      className={cn(
        'absolute bottom-6 right-2 z-30 pointer-events-none',
        isAnimating ? 'animate-stamp-thump' : 'opacity-90'
      )}
    >
      <img
        src="/image/compliment-seal.jpg"
        alt="Compliment seal"
        className="w-20 h-20 object-contain rounded-full shadow-md"
        draggable={false}
      />
    </div>
  )
}
