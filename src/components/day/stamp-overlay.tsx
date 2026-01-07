'use client'

import { useEffect, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'

// Animation timing constants (must match globals.css)
const ANIMATION_DURATION = 550 // Total animation duration in ms
const IMPACT_TIMING = 200 // When impact happens (38% of 550ms ≈ 209ms)

interface StampOverlayProps {
  /** Whether to show the stamp (entry exists) */
  show: boolean
  /** Trigger the stamp animation (after save success) */
  playAnimation: boolean
  /** Callback when animation completes */
  onAnimationComplete?: () => void
  /** Callback when stamp impacts (for polaroid shake sync) */
  onImpact?: () => void
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
  onImpact,
}: StampOverlayProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  const handleAnimationStart = useCallback(() => {
    // Trigger haptic + impact callback at the "squash" moment
    const impactTimer = setTimeout(() => {
      triggerHapticFeedback()
      onImpact?.()
    }, IMPACT_TIMING)

    return () => clearTimeout(impactTimer)
  }, [onImpact])

  useEffect(() => {
    if (playAnimation && show) {
      setIsAnimating(true)

      // Trigger haptic feedback at impact moment
      const impactCleanup = handleAnimationStart()

      // Animation complete
      const timer = setTimeout(() => {
        setIsAnimating(false)
        onAnimationComplete?.()
      }, ANIMATION_DURATION)

      return () => {
        clearTimeout(timer)
        impactCleanup()
      }
    }
  }, [playAnimation, show, onAnimationComplete, handleAnimationStart])

  if (!show) return null

  return (
    <div
      className={cn(
        'absolute bottom-6 right-2 z-30 pointer-events-none',
        isAnimating && 'animate-stamp-thump'
      )}
    >
      <img
        src="/image/seal-image.jpg"
        alt="Compliment seal"
        className="w-20 h-20 object-contain rounded-full shadow-md"
        draggable={false}
      />
    </div>
  )
}
