'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Sparkles, Camera, Heart } from 'lucide-react'

const ONBOARDING_KEY = 'onboarding_completed'

interface OnboardingStep {
  title: string
  description: string
  icon: React.ReactNode
}

const STEPS: OnboardingStep[] = [
  {
    title: 'Welcome to Praise Journal',
    description: 'Capture your daily wins and celebrate the small moments that make life beautiful.',
    icon: <Sparkles className="w-16 h-16 text-pink-500" />,
  },
  {
    title: 'Polaroid Memories',
    description: 'Create beautiful polaroid-style cards with photos, stickers, and captions to preserve your favorite moments.',
    icon: <Camera className="w-16 h-16 text-purple-500" />,
  },
  {
    title: 'Build Your Gratitude Practice',
    description: 'Track your streak, look back on happy memories, and cultivate a daily habit of self-appreciation.',
    icon: <Heart className="w-16 h-16 text-rose-500" />,
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
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex flex-col">
      {/* Skip button - only on first step */}
      {isFirstStep && (
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={handleSkip}
            className="text-gray-500 hover:text-gray-700 text-sm font-medium px-3 py-2 transition-colors"
          >
            Skip
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 pb-32">
        <div
          className={`transition-all duration-150 ${
            isTransitioning ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
          }`}
        >
          {/* Icon */}
          <div className="flex justify-center mb-8">
            <div className="w-32 h-32 rounded-full bg-white shadow-lg flex items-center justify-center">
              {step.icon}
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-800 text-center mb-4">
            {step.title}
          </h1>

          {/* Description */}
          <p className="text-gray-600 text-center leading-relaxed max-w-sm mx-auto">
            {step.description}
          </p>
        </div>
      </div>

      {/* Bottom section */}
      <div className="absolute bottom-0 left-0 right-0 p-8 pb-12">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {STEPS.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentStep
                  ? 'w-6 bg-pink-500'
                  : index < currentStep
                  ? 'bg-pink-300'
                  : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Action button */}
        <button
          onClick={handleNext}
          className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-semibold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg"
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
