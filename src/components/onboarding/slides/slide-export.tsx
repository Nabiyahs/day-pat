'use client'

import { FileText, Share2, Download } from 'lucide-react'

/**
 * Slide 3: Export & Share
 * Design based on daily.html reference - stats and share options
 * Visual: Month stats card with export options
 */
export function SlideExport() {
  return (
    <div className="flex flex-col items-center justify-center w-full">
      {/* Stats Card - matches daily.html month stats design */}
      <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-5 w-full max-w-xs mb-6">
        <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span>📊</span> 1월 기록
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center bg-white/60 rounded-xl p-3">
            <p className="text-2xl font-bold text-[#F2B949]">12</p>
            <p className="text-[10px] text-gray-600 mt-1">칭찬</p>
          </div>
          <div className="text-center bg-white/60 rounded-xl p-3">
            <p className="text-2xl font-bold text-[#F27430]">8</p>
            <p className="text-[10px] text-gray-600 mt-1">연속</p>
          </div>
          <div className="text-center bg-white/60 rounded-xl p-3">
            <p className="text-2xl">😊</p>
            <p className="text-[10px] text-gray-600 mt-1">최다 기분</p>
          </div>
        </div>
      </div>

      {/* Export options - floating cards */}
      <div className="relative flex items-center justify-center gap-4">
        {/* Glow effect */}
        <div className="absolute inset-0 blur-3xl bg-white/20 rounded-full scale-150" />

        {/* PDF Export */}
        <div className="relative group">
          <div className="w-24 h-24 bg-white rounded-2xl shadow-xl flex flex-col items-center justify-center transform -rotate-6 transition-transform group-hover:rotate-0">
            <FileText className="w-10 h-10 text-[#F27430]" strokeWidth={1.5} />
            <span className="text-xs font-bold text-gray-600 mt-2">PDF</span>
          </div>
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#F27430] rounded-full flex items-center justify-center shadow-md">
            <Download className="w-3 h-3 text-white" />
          </div>
        </div>

        {/* Share */}
        <div className="relative group">
          <div className="w-24 h-24 bg-white rounded-2xl shadow-xl flex flex-col items-center justify-center transform rotate-6 transition-transform group-hover:rotate-0">
            <Share2 className="w-10 h-10 text-[#EDD377]" strokeWidth={1.5} />
            <span className="text-xs font-bold text-gray-600 mt-2">공유</span>
          </div>
          <div className="absolute -top-2 -left-2 w-6 h-6 bg-[#EDD377] rounded-full flex items-center justify-center shadow-md">
            <span className="text-xs">📤</span>
          </div>
        </div>
      </div>

      {/* Social icons */}
      <div className="flex gap-3 mt-6">
        <div className="w-10 h-10 bg-white/30 rounded-full flex items-center justify-center">
          <span className="text-lg">📱</span>
        </div>
        <div className="w-10 h-10 bg-white/30 rounded-full flex items-center justify-center">
          <span className="text-lg">💬</span>
        </div>
        <div className="w-10 h-10 bg-white/30 rounded-full flex items-center justify-center">
          <span className="text-lg">📧</span>
        </div>
      </div>
    </div>
  )
}
