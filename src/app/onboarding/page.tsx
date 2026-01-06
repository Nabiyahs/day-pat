'use client'

import { useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { DailyPreview, WeeklyPreview, MonthlyPreview } from '@/components/onboarding'

const ONBOARDING_KEY = 'onboarding_completed'

interface OnboardingStep {
  title: string
  description: string
  preview: ReactNode
}

const STEPS: OnboardingStep[] = [
  {
    title: 'Capture Daily Moments',
    description: 'Document your daily wins with beautiful polaroid-style cards. Add photos, stickers, and heartfelt captions.',
    preview: <DailyPreview />,
  },
  {
    title: 'Track Your Week',
    description: 'See your week at a glance. Each day shows your gratitude entry with photos and emotions.',
    preview: <WeeklyPreview />,
  },
  {
    title: 'Monthly Overview',
    description: 'Review your journey with a photo calendar. Track streaks, view stats, and celebrate your progress.',
    preview: <MonthlyPreview />,
  },
]

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const router = useRouter()

  // Check if already completed onboarding
  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_KEY)
    if (completed === 'true') {
      router.replace('/login')
    }
  }, [router])

  const completeOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true')
    router.replace('/login')
  }

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentStep(currentStep + 1)
        setIsTransitioning(false)
      }, 150)
    } else {
      // Final step - complete onboarding
      completeOnboarding()
    }
  }

  const handleSkip = () => {
    completeOnboarding()
  }

  const step = STEPS[currentStep]
  const isLastStep = currentStep === STEPS.length - 1
  const isFirstStep = currentStep === 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex flex-col overflow-hidden">
      {/* Skip button - only on first step */}
      {isFirstStep && (
        <div className="absolute top-4 right-4 z-10 safe-area-inset-top">
          <button
            onClick={handleSkip}
            className="text-gray-500 hover:text-gray-700 text-sm font-medium px-3 py-2 transition-colors"
          >
            Skip
          </button>
        </div>
      )}

      {/* Main content - scrollable area for preview */}
      <div className="flex-1 flex flex-col items-center pt-8 pb-4 px-4 overflow-y-auto">
        <div
          className={`transition-all duration-150 w-full ${
            isTransitioning ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
          }`}
        >
          {/* Preview - the actual reference design */}
          <div className="flex justify-center mb-6">
            {step.preview}
          </div>

          {/* Title */}
          <h1 className="text-xl font-bold text-gray-800 text-center mb-2">
            {step.title}
          </h1>

          {/* Description */}
          <p className="text-gray-600 text-center text-sm leading-relaxed max-w-xs mx-auto">
            {step.description}
          </p>
        </div>
      </div>

      {/* Bottom section - fixed to bottom */}
      <div className="flex-shrink-0 p-6 pb-8 safe-area-inset-bottom bg-gradient-to-t from-pink-50 via-pink-50/80 to-transparent">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-6">
          {STEPS.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentStep
                  ? 'w-6 bg-pink-500'
                  : index < currentStep
                  ? 'w-2 bg-pink-300'
                  : 'w-2 bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Action button */}
        <button
          onClick={handleNext}
          className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-semibold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg active:scale-[0.98]"
        >
          {isLastStep ? (
            'Start Your Journey'
          ) : (
            <>
              Next
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
