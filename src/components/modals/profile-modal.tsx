'use client'

import { useEffect } from 'react'
import { AppIcon } from '@/components/ui/app-icon'
import { cn } from '@/lib/utils'

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  onLogout?: () => void
  onMyProfile?: () => void
  onExportPdf?: () => void
  userName?: string
  userEmail?: string
  totalEntries?: number
  currentStreak?: number
  totalFavorites?: number
}

// Matches main.html profileModal exactly (without user photo per request)
export function ProfileModal({
  isOpen,
  onClose,
  onLogout,
  onMyProfile,
  onExportPdf,
  userName = '',
  userEmail = '',
  totalEntries = 0,
  currentStreak = 0,
  totalFavorites = 0,
}: ProfileModalProps) {
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

  const displayName = userName || userEmail?.split('@')[0] || 'User'

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
          <h2 className="text-xl font-bold text-gray-800">Profile</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100"
          >
            <AppIcon name="x" className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6">
          {/* Profile Info */}
          <div className="flex flex-col items-center mb-6">
            {/* Avatar - gradient circle instead of user photo */}
            <div className="w-24 h-24 rounded-full overflow-hidden mb-4 border-4 border-orange-200 bg-gradient-to-br from-orange-400 to-amber-400 flex items-center justify-center">
              <AppIcon name="user" className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-1">{displayName}</h3>
            <p className="text-sm text-gray-500">{userEmail || 'guest@example.com'}</p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* My Profile */}
            <button
              onClick={onMyProfile}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-xl bg-amber-50 hover:bg-amber-100 transition-colors text-left"
            >
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                <AppIcon name="user" className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800">My Profile</p>
                <p className="text-xs text-gray-500">View and edit your information</p>
              </div>
              <AppIcon name="chevron-right" className="w-5 h-5 text-gray-400" />
            </button>

            {/* Export to PDF */}
            <button
              onClick={onExportPdf}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                <AppIcon name="file-text" className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800">Export to PDF</p>
                <p className="text-xs text-gray-500">Download your journal entries</p>
              </div>
              <AppIcon name="chevron-right" className="w-5 h-5 text-gray-400" />
            </button>

            {/* Logout */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-4 px-5 py-4 rounded-xl bg-red-50 hover:bg-red-100 transition-colors text-left"
              >
                <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                  <AppIcon name="logout" className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-red-600">Logout</p>
                  <p className="text-xs text-gray-500">Sign out of your account</p>
                </div>
                <AppIcon name="chevron-right" className="w-5 h-5 text-gray-400" />
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-800">{totalEntries}</p>
                <p className="text-xs text-gray-500">Entries</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{currentStreak}</p>
                <p className="text-xs text-gray-500">Streak</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{totalFavorites}</p>
                <p className="text-xs text-gray-500">Favorites</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
