'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { AppIcon } from '@/components/ui/app-icon'
import { cn } from '@/lib/utils'

const SWIPE_HINT_STORAGE_KEY = 'daypat_guide_swipe_hint_shown'

interface GuideModalProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * GuideModal - Fullscreen swipeable guide popup
 *
 * Separate from IntroModal (onboarding) - this is for the info button in bottom nav.
 * Shows Day/Week/Month/Favorites reference screens from main.html with images.
 * Supports touch swipe navigation for mobile Safari.
 */
export function GuideModal({ isOpen, onClose }: GuideModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const totalSlides = 4

  // Swipe hint state - show only once per localStorage
  const [showSwipeHint, setShowSwipeHint] = useState(false)

  // Touch handling for swipe
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)
  const sliderRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      // Prevent iOS Safari bounce
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
      document.body.style.top = `-${window.scrollY}px`
    }

    return () => {
      const scrollY = document.body.style.top
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
      document.body.style.top = ''
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1)
      }
    }
  }, [isOpen])

  // Reset slide when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentSlide(0)
      setDragOffset(0)
    }
  }, [isOpen])

  // Swipe hint - show once on first open (localStorage-based)
  useEffect(() => {
    if (!isOpen) return

    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    // Check localStorage
    try {
      const hintShown = localStorage.getItem(SWIPE_HINT_STORAGE_KEY)
      if (!hintShown) {
        // Show hint after a brief delay for modal to settle
        const showTimer = setTimeout(() => {
          setShowSwipeHint(true)
        }, 300)

        // Hide hint after animation completes (~1.5s)
        const hideTimer = setTimeout(() => {
          setShowSwipeHint(false)
          localStorage.setItem(SWIPE_HINT_STORAGE_KEY, 'true')
        }, 1800)

        return () => {
          clearTimeout(showTimer)
          clearTimeout(hideTimer)
        }
      }
    } catch {
      // localStorage not available
    }
  }, [isOpen])

  // Hide swipe hint when user starts interacting
  const dismissSwipeHint = useCallback(() => {
    if (showSwipeHint) {
      setShowSwipeHint(false)
      try {
        localStorage.setItem(SWIPE_HINT_STORAGE_KEY, 'true')
      } catch {
        // localStorage not available
      }
    }
  }, [showSwipeHint])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && currentSlide > 0) setCurrentSlide(currentSlide - 1)
      if (e.key === 'ArrowRight' && currentSlide < totalSlides - 1) setCurrentSlide(currentSlide + 1)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, currentSlide])

  // Touch handlers for swipe
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].screenX
    setIsDragging(true)
    dismissSwipeHint() // Hide hint on first touch
  }, [dismissSwipeHint])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return
    const currentX = e.changedTouches[0].screenX
    const diff = currentX - touchStartX.current
    // Limit drag at edges
    if ((currentSlide === 0 && diff > 0) || (currentSlide === totalSlides - 1 && diff < 0)) {
      setDragOffset(diff * 0.3) // Reduced resistance at edges
    } else {
      setDragOffset(diff)
    }
  }, [isDragging, currentSlide])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].screenX
    setIsDragging(false)
    setDragOffset(0)

    const diff = touchEndX.current - touchStartX.current
    const threshold = 50 // minimum swipe distance

    if (diff > threshold && currentSlide > 0) {
      // Swipe right - go to previous
      setCurrentSlide(currentSlide - 1)
    } else if (diff < -threshold && currentSlide < totalSlides - 1) {
      // Swipe left - go to next
      setCurrentSlide(currentSlide + 1)
    }
  }, [currentSlide])

  const goToSlide = (index: number) => {
    setCurrentSlide(index)
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50"
      style={{ touchAction: 'pan-y pinch-zoom' }}
    >
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-b border-amber-100 z-10 safe-area-inset-top">
        <div className="flex items-center justify-between px-5 py-4">
          <h1
            className="text-2xl font-bold text-gray-800"
            style={{ fontFamily: 'Caveat, cursive' }}
          >
            Guide
          </h1>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close guide"
          >
            <AppIcon name="x" className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Swipe hint - subtle chevrons on edges (first time only) */}
      {showSwipeHint && currentSlide === 0 && (
        <>
          {/* Right chevron hint - primary direction */}
          <div
            className="fixed right-2 top-1/2 -translate-y-1/2 z-20 pointer-events-none animate-swipe-hint-right"
            aria-hidden="true"
          >
            <AppIcon name="chevron-right" className="w-6 h-6 text-gray-400/40" />
          </div>
        </>
      )}

      {/* Main content - Fullscreen slides */}
      <div
        ref={sliderRef}
        className="h-full pt-[72px] pb-[100px] overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className={cn(
            'flex h-full',
            !isDragging && 'transition-transform duration-300 ease-out'
          )}
          style={{
            transform: `translateX(calc(-${currentSlide * 100}% + ${dragOffset}px))`
          }}
        >
          {/* Slide 1: Day View */}
          <div className="min-w-full h-full px-5 flex flex-col items-center justify-center">
            <div className="w-full max-w-sm">
              {/* Icon badge */}
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                  <AppIcon name="calendar" className="w-8 h-8 text-orange-500" />
                </div>
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">Day View</h2>
              <p className="text-gray-600 text-center text-sm mb-6">Your daily Polaroid card</p>

              {/* Reference image - Polaroid card */}
              <div className="bg-white rounded-3xl shadow-xl p-5 transform rotate-[-1deg]">
                <div className="bg-gray-100 rounded-2xl overflow-hidden mb-4 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/image/9848b97d68-29d8f31e7e5b8dcb9f5d.png"
                    alt="Day view example - morning coffee"
                    className="w-full h-[200px] object-cover"
                    draggable={false}
                  />
                  <div className="absolute top-3 right-3 flex gap-2">
                    <span className="text-2xl">☕</span>
                    <span className="text-2xl">✨</span>
                  </div>
                </div>
                <div className="px-2">
                  <p className="text-gray-700 text-center font-medium leading-relaxed text-sm">
                    Started my day with gratitude. The simple joy of morning coffee and sunshine.
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-400 mt-3">
                    <span>3:42 PM</span>
                    <div className="flex gap-3">
                      <AppIcon name="pencil" className="w-4 h-4" />
                      <AppIcon name="heart" className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Slide 2: Week View */}
          <div className="min-w-full h-full px-5 flex flex-col items-center justify-center">
            <div className="w-full max-w-sm">
              {/* Icon badge */}
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
                  <AppIcon name="calendar" className="w-8 h-8 text-amber-600" />
                </div>
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">Week View</h2>
              <p className="text-gray-600 text-center text-sm mb-6">Monday to Sunday overview</p>

              {/* Reference - Week grid */}
              <div className="space-y-3">
                {/* Monday */}
                <div className="bg-white rounded-2xl p-4 shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="text-center w-12">
                      <p className="text-xs text-gray-500 font-medium">MON</p>
                      <p className="text-2xl font-bold text-gray-800">13</p>
                    </div>
                    <div className="flex-1 h-[80px] rounded-xl overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/image/df82fafb81-e691c7ae868ff48609ca.png"
                        alt="Monday - yoga"
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-1">Morning yoga session 🧘‍♀️✨</p>
                </div>

                {/* Tuesday */}
                <div className="bg-white rounded-2xl p-4 shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="text-center w-12">
                      <p className="text-xs text-gray-500 font-medium">TUE</p>
                      <p className="text-2xl font-bold text-gray-800">14</p>
                    </div>
                    <div className="flex-1 h-[80px] rounded-xl overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/image/67c9033525-e71831b512ea2e428637.png"
                        alt="Tuesday - salad"
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-1">Healthy food day 🥗💚</p>
                </div>

                {/* Wednesday - highlighted */}
                <div className="bg-white rounded-2xl p-4 shadow-md border-2 border-orange-400">
                  <div className="flex items-center gap-3">
                    <div className="text-center w-12">
                      <p className="text-xs text-orange-600 font-bold">WED</p>
                      <p className="text-2xl font-bold text-orange-600">15</p>
                    </div>
                    <div className="flex-1 h-[80px] rounded-xl overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/image/9848b97d68-29d8f31e7e5b8dcb9f5d.png"
                        alt="Wednesday - coffee"
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-1">Simple joy of morning coffee ☕✨</p>
                </div>
              </div>
            </div>
          </div>

          {/* Slide 3: Month View */}
          <div className="min-w-full h-full px-5 flex flex-col items-center justify-center">
            <div className="w-full max-w-sm">
              {/* Icon badge */}
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
                  <AppIcon name="calendar" className="w-8 h-8 text-yellow-600" />
                </div>
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">Month View</h2>
              <p className="text-gray-600 text-center text-sm mb-6">Calendar with photo thumbnails</p>

              {/* Reference - Month calendar */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg">
                <h3 className="text-lg font-bold text-gray-800 text-center mb-3">January 2025</h3>
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                    <div key={day} className="text-center text-xs font-semibold text-gray-500 py-1">{day}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {/* Empty cells for days before month start */}
                  {[...Array(2)].map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square bg-gray-50 rounded-lg"></div>
                  ))}
                  {/* Days 1-12 with some having photos */}
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((day) => {
                    const hasPhoto = [4, 6, 8, 10, 12].includes(day)
                    const images: { [key: number]: string } = {
                      4: '/image/06c4d59883-ce5ce94d6ad46c42ee8e.png',
                      6: '/image/5ec6adb291-19a4f27becd9bf81891a.png',
                      8: '/image/7d5f2711ea-308301cb34fc01259450.png',
                      10: '/image/bbd9a37480-db910cb1c5c32661b40c.png',
                      12: '/image/3fef0312cc-ac35f49b2c70e143e772.png',
                    }
                    return (
                      <div
                        key={day}
                        className={cn(
                          'aspect-square rounded-lg p-0.5 relative overflow-hidden',
                          !hasPhoto && 'bg-gray-50'
                        )}
                      >
                        <span className={cn(
                          'absolute top-0.5 left-1 text-[9px] font-semibold z-10',
                          hasPhoto ? 'text-white drop-shadow' : 'text-gray-700'
                        )}>{day}</span>
                        {hasPhoto && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={images[day]}
                            alt={`Day ${day}`}
                            className="w-full h-full object-cover rounded"
                            draggable={false}
                          />
                        )}
                      </div>
                    )
                  })}
                  {/* More days */}
                  {[13, 14].map((day) => {
                    const images: { [key: number]: string } = {
                      13: '/image/ea32fb5053-f4123dab51535d78b2ac.png',
                      14: '/image/011a105c86-64ea07166049e1017e9a.png',
                    }
                    return (
                      <div key={day} className="aspect-square rounded-lg p-0.5 relative overflow-hidden">
                        <span className="absolute top-0.5 left-1 text-[9px] font-bold text-white z-10 drop-shadow">{day}</span>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={images[day]}
                          alt={`Day ${day}`}
                          className="w-full h-full object-cover rounded"
                          draggable={false}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Slide 4: Favorites */}
          <div className="min-w-full h-full px-5 flex flex-col items-center justify-center">
            <div className="w-full max-w-sm">
              {/* Icon badge */}
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <AppIcon name="heart" className="w-8 h-8 text-red-500 fill-current" />
                </div>
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">Favorites</h2>
              <p className="text-gray-600 text-center text-sm mb-6">Your cherished moments</p>

              {/* Reference - Favorites grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="relative bg-white rounded-2xl shadow-md overflow-hidden transform rotate-[-2deg] h-36">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/image/06c4d59883-ce5ce94d6ad46c42ee8e.png"
                    alt="Favorite 1"
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                  <div className="absolute top-2 right-2">
                    <AppIcon name="heart" className="w-5 h-5 text-red-500 fill-current drop-shadow-lg" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2">
                    <p className="text-white text-xs">Jan 4</p>
                  </div>
                </div>

                <div className="relative bg-white rounded-2xl shadow-md overflow-hidden transform rotate-[2deg] h-36 mt-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/image/5ec6adb291-19a4f27becd9bf81891a.png"
                    alt="Favorite 2"
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                  <div className="absolute top-2 right-2">
                    <AppIcon name="heart" className="w-5 h-5 text-red-500 fill-current drop-shadow-lg" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2">
                    <p className="text-white text-xs">Jan 6</p>
                  </div>
                </div>

                <div className="relative bg-white rounded-2xl shadow-md overflow-hidden transform rotate-[1deg] h-36">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/image/7d5f2711ea-308301cb34fc01259450.png"
                    alt="Favorite 3"
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                  <div className="absolute top-2 right-2">
                    <AppIcon name="heart" className="w-5 h-5 text-red-500 fill-current drop-shadow-lg" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2">
                    <p className="text-white text-xs">Jan 8</p>
                  </div>
                </div>

                <div className="relative bg-white rounded-2xl shadow-md overflow-hidden transform rotate-[-1deg] h-36 mt-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/image/bbd9a37480-db910cb1c5c32661b40c.png"
                    alt="Favorite 4"
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                  <div className="absolute top-2 right-2">
                    <AppIcon name="heart" className="w-5 h-5 text-red-500 fill-current drop-shadow-lg" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2">
                    <p className="text-white text-xs">Jan 10</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-gray-200 safe-area-inset-bottom">
        <div className="px-5 py-4">
          {/* Dots indicator */}
          <div className="flex items-center justify-center gap-2 mb-3">
            {[0, 1, 2, 3].map((index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={cn(
                  'w-2.5 h-2.5 rounded-full transition-all duration-200',
                  currentSlide === index
                    ? 'bg-orange-500 w-6'
                    : 'bg-gray-300 hover:bg-gray-400'
                )}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => currentSlide > 0 && setCurrentSlide(currentSlide - 1)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-gray-500 font-medium rounded-lg hover:bg-gray-100 transition-colors',
                currentSlide === 0 && 'opacity-0 pointer-events-none'
              )}
            >
              <AppIcon name="chevron-left" className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              onClick={() => {
                if (currentSlide < totalSlides - 1) {
                  setCurrentSlide(currentSlide + 1)
                } else {
                  onClose()
                }
              }}
              className="flex items-center gap-2 px-6 py-2 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors"
            >
              {currentSlide === totalSlides - 1 ? (
                <>
                  <span>Got it</span>
                  <AppIcon name="check" className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Next</span>
                  <AppIcon name="chevron-right" className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
