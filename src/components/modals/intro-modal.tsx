'use client'

import { useState, useEffect } from 'react'
import { AppIcon } from '@/components/ui/app-icon'
import { cn } from '@/lib/utils'

interface IntroModalProps {
  isOpen: boolean
  onClose: () => void
}

// Matches main.html introModal exactly - 4 slides with images
export function IntroModal({ isOpen, onClose }: IntroModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const totalSlides = 4

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  // Reset to first slide when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentSlide(0)
    }
  }, [isOpen])

  const handleNext = () => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide(currentSlide + 1)
    } else {
      onClose()
    }
  }

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1)
    }
  }

  return (
    <div
      className={cn(
        'fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity duration-300 flex items-center justify-center p-5',
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
      onClick={onClose}
    >
      <div
        className={cn(
          'bg-white rounded-3xl shadow-2xl w-full max-w-sm transform transition-transform duration-300 overflow-hidden',
          isOpen ? 'scale-100' : 'scale-95'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">Guide</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100"
          >
            <AppIcon name="x" className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Slider */}
        <div className="relative overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {/* Slide 1: Day View */}
            <div className="min-w-full p-6">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                  <AppIcon name="calendar" className="w-8 h-8 text-orange-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Day View</h3>
                <p className="text-gray-600 text-center text-sm mb-4">Your daily Polaroid card</p>
                <div className="w-full bg-white rounded-2xl shadow-lg p-4 transform rotate-[-1deg]">
                  <div className="bg-gray-100 rounded-xl overflow-hidden mb-3 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/image/9848b97d68-29d8f31e7e5b8dcb9f5d.png"
                      alt="example day view"
                      className="w-full h-40 object-cover"
                    />
                    <div className="absolute top-2 right-2 flex gap-1">
                      <span className="text-xl">☕</span>
                      <span className="text-xl">✨</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 text-center leading-relaxed">One beautiful memory per day with photo and caption</p>
                </div>
              </div>
            </div>

            {/* Slide 2: Week View */}
            <div className="min-w-full p-6">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                  <AppIcon name="calendar" className="w-8 h-8 text-amber-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Week View</h3>
                <p className="text-gray-600 text-center text-sm mb-4">Monday to Sunday overview</p>
                <div className="w-full space-y-2">
                  <div className="bg-white rounded-xl p-2 shadow-md flex items-center gap-2">
                    <div className="text-center w-10">
                      <p className="text-[10px] text-gray-500 font-bold">MON</p>
                      <p className="text-lg font-bold text-gray-800">13</p>
                    </div>
                    <div className="flex-1 h-16 rounded-lg overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/image/df82fafb81-e691c7ae868ff48609ca.png" alt="week example" className="w-full h-full object-cover" />
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-2 shadow-md flex items-center gap-2">
                    <div className="text-center w-10">
                      <p className="text-[10px] text-gray-500 font-bold">TUE</p>
                      <p className="text-lg font-bold text-gray-800">14</p>
                    </div>
                    <div className="flex-1 h-16 rounded-lg overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/image/67c9033525-e71831b512ea2e428637.png" alt="week example" className="w-full h-full object-cover" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 text-center pt-2">Track your weekly progress</p>
                </div>
              </div>
            </div>

            {/* Slide 3: Month View */}
            <div className="min-w-full p-6">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                  <AppIcon name="calendar" className="w-8 h-8 text-yellow-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Month View</h3>
                <p className="text-gray-600 text-center text-sm mb-4">Calendar with thumbnails</p>
                <div className="w-full bg-white/90 rounded-xl p-3 shadow-lg">
                  <div className="grid grid-cols-7 gap-0.5 mb-1">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                      <div key={i} className="text-center text-[9px] font-bold text-gray-500 py-1">{day}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-0.5">
                    <div className="aspect-square bg-gray-100 rounded"></div>
                    <div className="aspect-square bg-gray-100 rounded"></div>
                    <div className="aspect-square bg-gray-100 rounded"></div>
                    <div className="aspect-square rounded overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/image/06c4d59883-ce5ce94d6ad46c42ee8e.png" alt="month" className="w-full h-full object-cover" />
                    </div>
                    <div className="aspect-square bg-gray-100 rounded"></div>
                    <div className="aspect-square rounded overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/image/5ec6adb291-19a4f27becd9bf81891a.png" alt="month" className="w-full h-full object-cover" />
                    </div>
                    <div className="aspect-square bg-gray-100 rounded"></div>
                    <div className="aspect-square rounded overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/image/7d5f2711ea-308301cb34fc01259450.png" alt="month" className="w-full h-full object-cover" />
                    </div>
                    <div className="aspect-square bg-gray-100 rounded"></div>
                    <div className="aspect-square rounded overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/image/bbd9a37480-db910cb1c5c32661b40c.png" alt="month" className="w-full h-full object-cover" />
                    </div>
                    <div className="aspect-square bg-gray-100 rounded"></div>
                    <div className="aspect-square rounded overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/image/3fef0312cc-ac35f49b2c70e143e772.png" alt="month" className="w-full h-full object-cover" />
                    </div>
                    <div className="aspect-square rounded overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/image/ea32fb5053-f4123dab51535d78b2ac.png" alt="month" className="w-full h-full object-cover" />
                    </div>
                    <div className="aspect-square rounded overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/image/011a105c86-64ea07166049e1017e9a.png" alt="month" className="w-full h-full object-cover" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 text-center pt-2">Monthly memory gallery</p>
                </div>
              </div>
            </div>

            {/* Slide 4: Favorites */}
            <div className="min-w-full p-6">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <AppIcon name="heart" className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Favorites</h3>
                <p className="text-gray-600 text-center text-sm mb-4">Your cherished moments</p>
                <div className="w-full grid grid-cols-2 gap-2">
                  <div className="relative bg-white rounded-xl shadow-md overflow-hidden transform rotate-[-2deg] h-32">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/image/06c4d59883-ce5ce94d6ad46c42ee8e.png" alt="favorite" className="w-full h-full object-cover" />
                    <AppIcon name="heart" className="w-4 h-4 text-red-500 absolute top-1 right-1 drop-shadow-lg fill-current" />
                  </div>
                  <div className="relative bg-white rounded-xl shadow-md overflow-hidden transform rotate-[2deg] h-32 mt-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/image/5ec6adb291-19a4f27becd9bf81891a.png" alt="favorite" className="w-full h-full object-cover" />
                    <AppIcon name="heart" className="w-4 h-4 text-red-500 absolute top-1 right-1 drop-shadow-lg fill-current" />
                  </div>
                  <div className="relative bg-white rounded-xl shadow-md overflow-hidden transform rotate-[1deg] h-32">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/image/7d5f2711ea-308301cb34fc01259450.png" alt="favorite" className="w-full h-full object-cover" />
                    <AppIcon name="heart" className="w-4 h-4 text-red-500 absolute top-1 right-1 drop-shadow-lg fill-current" />
                  </div>
                  <div className="relative bg-white rounded-xl shadow-md overflow-hidden transform rotate-[-1deg] h-32 mt-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/image/bbd9a37480-db910cb1c5c32661b40c.png" alt="favorite" className="w-full h-full object-cover" />
                    <AppIcon name="heart" className="w-4 h-4 text-red-500 absolute top-1 right-1 drop-shadow-lg fill-current" />
                  </div>
                </div>
                <p className="text-xs text-gray-600 text-center pt-3">Collage of loved memories</p>
              </div>
            </div>
          </div>
        </div>

        {/* Dots */}
        <div className="flex items-center justify-center gap-2 py-3">
          {[0, 1, 2, 3].map((index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={cn(
                'w-2 h-2 rounded-full transition-colors',
                currentSlide === index ? 'bg-orange-500' : 'bg-gray-300'
              )}
            />
          ))}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between px-6 pb-6">
          <button
            onClick={handlePrev}
            disabled={currentSlide === 0}
            className={cn(
              'px-4 py-2 text-gray-400 font-semibold rounded-lg hover:bg-gray-100',
              currentSlide === 0 ? 'opacity-0' : ''
            )}
          >
            <AppIcon name="chevron-left" className="w-4 h-4 inline mr-2" />
            Back
          </button>
          <button
            onClick={handleNext}
            className="px-6 py-2 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600"
          >
            {currentSlide === totalSlides - 1 ? (
              <>
                Get Started
                <AppIcon name="check" className="w-4 h-4 inline ml-2" />
              </>
            ) : (
              <>
                Next
                <AppIcon name="chevron-right" className="w-4 h-4 inline ml-2" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
