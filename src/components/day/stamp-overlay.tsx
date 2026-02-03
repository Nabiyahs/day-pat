'use client'

import { useEffect, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'

// Animation timing constants (must match globals.css keyframes)
const ANIMATION_DURATION = 1100 // Total animation duration in ms (longer for emphasis)
const IMPACT_TIMING = 660 // When impact squash happens (60% of 1100ms)

// Cache-busting version for seal image (update when image file changes)
const SEAL_IMAGE_VERSION = '20260108'

interface StampOverlayProps {
  /** Whether to show the stamp (entry exists) */
  show: boolean
  /** Trigger the stamp animation (after save success) */
  playAnimation: boolean
  /** Callback when animation completes */
  onAnimationComplete?: () => void
  /** When true, stamp is centered (for text-only entries without photo) */
  centered?: boolean
}

/**
 * Trigger haptic feedback (vibration) on supported devices.
 * Fails silently on iOS and unsupported browsers.
 */
function triggerHapticFeedback() {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(50) // Stronger "thump" vibration
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
  centered = false,
}: StampOverlayProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  const handleAnimationStart = useCallback(() => {
    // Trigger haptic at the "squash" moment
    const impactTimer = setTimeout(() => {
      triggerHapticFeedback()
    }, IMPACT_TIMING)

    return () => clearTimeout(impactTimer)
  }, [])

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

  // Position: bottom-right of PHOTO area (default) or centered (for text-only entries)
  // This ensures the stamp does not overlap the comment/caption section
  // Nudged slightly up from bottom edge to avoid overlapping other UI elements
  return (
    <div
      data-stamp="true"
      className={cn(
        'absolute z-20 pointer-events-none',
        centered
          ? 'inset-0 flex items-center justify-center'
          : 'bottom-3 right-3',
        isAnimating && 'animate-stamp-thump'
      )}
    >
      <img
        src={`/image/seal-image.jpg?v=${SEAL_IMAGE_VERSION}`}
        alt="Compliment seal"
        className="w-[88px] h-[88px] object-contain rounded-full shadow-lg"
        draggable={false}
      />
    </div>
  )
}
