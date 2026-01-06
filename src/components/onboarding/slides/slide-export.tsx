'use client'

import { FileText, Share2 } from 'lucide-react'

/**
 * Slide 3: Result & Export
 * Background: #F2B949 (hopeful gold)
 * Visual: Document and Share icons
 */
export function SlideExport() {
  return (
    <div className="flex flex-col items-center justify-center w-full">
      {/* Icons container */}
      <div className="relative flex items-center justify-center gap-6">
        {/* Glow effect */}
        <div className="absolute inset-0 blur-3xl bg-white/30 rounded-full scale-150" />

        {/* PDF/Document icon */}
        <div className="relative">
          <div className="w-28 h-28 bg-white rounded-2xl shadow-xl flex items-center justify-center transform -rotate-6">
            <FileText className="w-14 h-14 text-[#F27430]" strokeWidth={1.5} />
          </div>
          {/* PDF label */}
          <div className="absolute -bottom-2 -right-2 bg-[#F27430] text-white text-xs font-bold px-2 py-1 rounded-md shadow-md">
            PDF
          </div>
        </div>

        {/* Share icon */}
        <div className="relative">
          <div className="w-28 h-28 bg-white rounded-2xl shadow-xl flex items-center justify-center transform rotate-6">
            <Share2 className="w-14 h-14 text-[#F2B949]" strokeWidth={1.5} />
          </div>
          {/* SNS label */}
          <div className="absolute -bottom-2 -left-2 bg-[#EDD377] text-gray-700 text-xs font-bold px-2 py-1 rounded-md shadow-md">
            SNS
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-3xl opacity-70">
          📤
        </div>
      </div>
    </div>
  )
}
