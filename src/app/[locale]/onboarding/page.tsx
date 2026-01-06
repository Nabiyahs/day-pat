'use client'

import { useState, ReactNode, use, useRef, TouchEvent } from 'react'
import { useRouter } from 'next/navigation'
import { AppIcon } from '@/components/ui/app-icon'
import { getDictionarySync, type Locale, i18n, isValidLocale } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'
import { SlidePraise, SlideStreak, SlideExport } from '@/components/onboarding/slides'
import { addDebugLog } from '@/lib/debug'

const ONBOARDING_KEY = 'onboarding_completed'

interface OnboardingSlide {
  id: string
  titleKey: 'praise' | 'streak' | 'export'
  bgColor: string
  textColor: string
  visual: ReactNode
}

const SLIDES: OnboardingSlide[] = [
  {
    id: 'praise',
    titleKey: 'praise',
    bgColor: 'bg-[#EDD377]',
    textColor: 'text-gray-800',
    visual: <SlidePraise />,
  },
  {
    id: 'streak',
    titleKey: 'streak',
    bgColor: 'bg-[#F27430]',
    textColor: 'text-white',
    visual: <SlideStreak />,
  },
  {
    id: 'export',
    titleKey: 'export',
    bgColor: 'bg-[#F2B949]',
    textColor: 'text-gray-800',
    visual: <SlideExport />,
  },
]

type Props = {
  params: Promise<{ locale: string }>
}

export default function OnboardingPage({ params }: Props) {
  const { locale: localeParam } = use(params)
  const locale: Locale = isValidLocale(localeParam) ? localeParam : i18n.defaultLocale
  const dict = getDictionarySync(locale)

  const [currentSlide, setCurrentSlide] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(false)
  const router = useRouter()

  // Touch handling for swipe
  const touchStartX = useRef<number>(0)
  const touchEndX = useRef<number>(0)
  const isSwiping = useRef<boolean>(false)

  const handleTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchEndX.current = e.touches[0].clientX
    isSwiping.current = false
  }

  const handleTouchMove = (e: TouchEvent) => {
    touchEndX.current = e.touches[0].clientX
    // Mark as swiping if moved more than 10px
    if (Math.abs(touchStartX.current - touchEndX.current) > 10) {
      isSwiping.current = true
    }
  }

  const handleTouchEnd = () => {
    // Only process swipe if user actually swiped (not just tapped)
    if (!isSwiping.current) return

    const diff = touchStartX.current - touchEndX.current
    const threshold = 50

    if (Math.abs(diff) > threshold && !isTransitioning) {
      if (diff > 0 && currentSlide < SLIDES.length - 1) {
        // Swipe left - next slide
        navigateToSlide(currentSlide + 1)
      } else if (diff < 0 && currentSlide > 0) {
        // Swipe right - previous slide
        navigateToSlide(currentSlide - 1)
      }
    }
  }

  const navigateToSlide = (index: number) => {
    // Validate index
    if (index < 0 || index >= SLIDES.length) return
    // Skip if already on this slide
    if (index === currentSlide) return
    // Skip if already transitioning
    if (isTransitioning) return

    console.log('[Onboarding] navigateToSlide:', { from: currentSlide, to: index })

    setIsTransitioning(true)

    // Small delay before changing slide for smoother animation
    setTimeout(() => {
      setCurrentSlide(index)
      // Reset transitioning flag after animation completes
      setTimeout(() => {
        setIsTransitioning(false)
      }, 300)
    }, 50)
  }

  /**
   * Complete onboarding and navigate based on auth state.
   */
  const completeOnboarding = async () => {
    setIsCheckingAuth(true)
    addDebugLog('nav', 'Onboarding: Completing onboarding')

    try {
      // Use sessionStorage so intro always shows on fresh visits (new browser session)
      sessionStorage.setItem(ONBOARDING_KEY, 'true')
      addDebugLog('info', 'Onboarding: sessionStorage set')
    } catch (e) {
      addDebugLog('warn', 'Onboarding: sessionStorage failed', { error: String(e) })
    }

    try {
      const supabase = createClient()
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error) {
        addDebugLog('warn', 'Onboarding: Auth check error', { error: error.message })
      }

      if (user) {
        addDebugLog('nav', 'Onboarding: User authenticated, navigating to app')
        router.replace(`/${locale}/app`)
      } else {
        addDebugLog('nav', 'Onboarding: No user, navigating to login')
        router.replace(`/${locale}/login`)
      }
    } catch (e) {
      addDebugLog('error', 'Onboarding: Navigation error', { error: String(e) })
      router.replace(`/${locale}/login`)
    }
  }

  const handleNext = () => {
    if (isTransitioning || isCheckingAuth) return

    if (currentSlide < SLIDES.length - 1) {
      navigateToSlide(currentSlide + 1)
    } else {
      completeOnboarding()
    }
  }

  const handleSkip = () => {
    if (isCheckingAuth) return
    completeOnboarding()
  }

  const handleDotClick = (index: number) => {
    if (isTransitioning) return
    navigateToSlide(index)
  }

  const slide = SLIDES[currentSlide]
  const isLastSlide = currentSlide === SLIDES.length - 1
  const stepData = dict.onboarding.steps[slide.titleKey]

  return (
    <div
      className={`min-h-screen min-h-[100dvh] ${slide.bgColor} flex flex-col transition-colors duration-300 overflow-hidden`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Skip button - always visible in top-right, fixed position */}
      <div className="fixed top-0 right-0 z-20 pt-[env(safe-area-inset-top)]">
        <div className="p-3">
          <button
            onClick={handleSkip}
            disabled={isCheckingAuth}
            className={`text-sm font-medium px-3 py-2 rounded-lg transition-all disabled:opacity-50 ${
              slide.textColor === 'text-white'
                ? 'text-white/80 hover:text-white hover:bg-white/10'
                : 'text-gray-600 hover:text-gray-800 hover:bg-black/5'
            }`}
          >
            {dict.onboarding.skip}
          </button>
        </div>
      </div>

      {/* Main content - optimized spacing for mobile */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 pt-10 pb-2">
        {/* Visual area - tighter margin */}
        <div
          className={`mb-5 transition-all duration-300 ${
            isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
          }`}
        >
          {slide.visual}
        </div>

        {/* Text content - compact styling */}
        <div
          className={`text-center max-w-[280px] transition-all duration-300 ${
            isTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
          }`}
        >
          <h1 className={`text-xl font-bold mb-2 ${slide.textColor}`}>
            {stepData.title}
          </h1>
          <p
            className={`text-sm leading-relaxed whitespace-pre-line ${
              slide.textColor === 'text-white' ? 'text-white/80' : 'text-gray-600'
            }`}
          >
            {stepData.description}
          </p>
        </div>
      </div>

      {/* Bottom section - tighter padding */}
      <div className="flex-shrink-0 px-5 pb-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-4">
          {SLIDES.map((_, index) => (
            <button
              key={index}
              onClick={() => handleDotClick(index)}
              disabled={isTransitioning}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? `w-8 ${slide.textColor === 'text-white' ? 'bg-white' : 'bg-gray-800'}`
                  : `w-2 ${
                      slide.textColor === 'text-white' ? 'bg-white/40' : 'bg-gray-800/30'
                    }`
              }`}
            />
          ))}
        </div>

        {/* Action button - min 44px height for tappability */}
        <button
          onClick={handleNext}
          disabled={isCheckingAuth || isTransitioning}
          className={`w-full font-semibold py-3.5 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] disabled:opacity-70 min-h-[44px] ${
            isLastSlide
              ? 'bg-gray-900 text-white hover:bg-gray-800'
              : slide.textColor === 'text-white'
              ? 'bg-white text-gray-800 hover:bg-white/90'
              : 'bg-gray-800 text-white hover:bg-gray-700'
          }`}
        >
          {isCheckingAuth ? (
            <AppIcon name="spinner" className="w-5 h-5 animate-spin" />
          ) : isLastSlide ? (
            dict.onboarding.startJourney
          ) : (
            dict.onboarding.next
          )}
        </button>
      </div>
    </div>
  )
}
