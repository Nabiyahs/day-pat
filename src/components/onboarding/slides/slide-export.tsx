'use client'

import { FileText, Share2, Download } from 'lucide-react'

/**
 * Slide 3: Export & Share
 * Design based on daily.html reference - stats and share options
 * Visual: Month stats card with export options
 * Removed: 최다기분 box, social icons (phone/chat/SNS)
 * Optimized for mobile: fits on 6.3-inch screen without scrolling
 */
export function SlideExport() {
  return (
    <div className="flex flex-col items-center justify-center w-full">
      {/* Stats Card - simplified, removed 최다기분 */}
      <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 w-full max-w-[260px] mb-5">
        <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
          <span>📊</span> 1월 기록
        </h3>
        {/* Only 2 columns now - removed 최다기분 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center bg-white/60 rounded-xl p-3">
            <p className="text-2xl font-bold text-[#F2B949]">12</p>
            <p className="text-[10px] text-gray-600 mt-1">칭찬</p>
          </div>
          <div className="text-center bg-white/60 rounded-xl p-3">
            <p className="text-2xl font-bold text-[#F27430]">8</p>
            <p className="text-[10px] text-gray-600 mt-1">연속</p>
          </div>
        </div>
      </div>

      {/* Export options - floating cards - compact */}
      <div className="relative flex items-center justify-center gap-3">
        {/* Glow effect */}
        <div className="absolute inset-0 blur-3xl bg-white/20 rounded-full scale-150" />

        {/* PDF Export */}
        <div className="relative group">
          <div className="w-20 h-20 bg-white rounded-xl shadow-lg flex flex-col items-center justify-center transform -rotate-6 transition-transform group-hover:rotate-0">
            <FileText className="w-8 h-8 text-[#F27430]" strokeWidth={1.5} />
            <span className="text-[10px] font-bold text-gray-600 mt-1">PDF</span>
          </div>
          <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#F27430] rounded-full flex items-center justify-center shadow">
            <Download className="w-2.5 h-2.5 text-white" />
          </div>
        </div>

        {/* Share */}
        <div className="relative group">
          <div className="w-20 h-20 bg-white rounded-xl shadow-lg flex flex-col items-center justify-center transform rotate-6 transition-transform group-hover:rotate-0">
            <Share2 className="w-8 h-8 text-[#EDD377]" strokeWidth={1.5} />
            <span className="text-[10px] font-bold text-gray-600 mt-1">공유</span>
          </div>
          <div className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-[#EDD377] rounded-full flex items-center justify-center shadow">
            <span className="text-[10px]">📤</span>
          </div>
        </div>
      </div>

      {/* Social icons removed as per requirements */}
    </div>
  )
}
