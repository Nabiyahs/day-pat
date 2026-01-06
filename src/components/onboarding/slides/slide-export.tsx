'use client'

import { AppIcon } from '@/components/ui/app-icon'

/**
 * Slide 3: Export & Share
 * Design based on intro-3.txt reference
 * Visual: Two circular icons (PDF and Share) with descriptive text below
 * Optimized for mobile: fits on 6.3-inch screen without scrolling
 */
export function SlideExport() {
  return (
    <div className="flex flex-col items-center justify-center w-full">
      {/* Upper visual - inspired by intro-3.txt reference */}
      <div className="bg-white rounded-3xl p-6 shadow-lg max-w-[280px] w-full">
        {/* Two circular icons side by side */}
        <div className="flex items-center justify-center gap-6 mb-6">
          {/* PDF icon circle */}
          <div className="w-20 h-20 rounded-full bg-[#F2B949] flex items-center justify-center shadow-lg">
            <AppIcon name="file-pdf" className="w-8 h-8 text-white" />
          </div>
          {/* Share icon circle */}
          <div className="w-20 h-20 rounded-full bg-[#F2E829] flex items-center justify-center shadow-lg">
            <AppIcon name="share" className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Descriptive text - inspired by reference */}
        <div className="space-y-3">
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-800">PDF로 저장하고</p>
            <p className="text-xs text-gray-500">한 달 기록을 문서로</p>
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-800">소중한 순간을 공유해요</p>
            <p className="text-xs text-gray-500">친구들과 함께 나눠요</p>
          </div>
        </div>
      </div>
    </div>
  )
}
