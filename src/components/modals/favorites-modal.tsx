'use client'

import { useEffect } from 'react'
import { AppIcon } from '@/components/ui/app-icon'
import { cn } from '@/lib/utils'

interface FavoriteEntry {
  id: string
  date: string
  caption: string
  photoUrl: string
}

interface FavoritesModalProps {
  isOpen: boolean
  onClose: () => void
  favorites?: FavoriteEntry[]
}

// Sample data matching main.html exactly
const SAMPLE_FAVORITES: FavoriteEntry[] = [
  {
    id: '1',
    date: 'Jan 4, 2025',
    caption: 'Peaceful sunset at the beach 🌅',
    photoUrl: '/image/06c4d59883-ce5ce94d6ad46c42ee8e.png',
  },
  {
    id: '2',
    date: 'Jan 6, 2025',
    caption: 'Cozy reading time ☕📚',
    photoUrl: '/image/5ec6adb291-19a4f27becd9bf81891a.png',
  },
  {
    id: '3',
    date: 'Jan 8, 2025',
    caption: 'Fresh flowers brighten my day 🌸',
    photoUrl: '/image/7d5f2711ea-308301cb34fc01259450.png',
  },
  {
    id: '4',
    date: 'Jan 10, 2025',
    caption: 'Mountain adventure 🏔️',
    photoUrl: '/image/bbd9a37480-db910cb1c5c32661b40c.png',
  },
  {
    id: '5',
    date: 'Jan 12, 2025',
    caption: 'Homemade comfort food 🍲',
    photoUrl: '/image/3fef0312cc-ac35f49b2c70e143e772.png',
  },
  {
    id: '6',
    date: 'Jan 13, 2025',
    caption: 'Morning yoga session 🧘‍♀️',
    photoUrl: '/image/ea32fb5053-f4123dab51535d78b2ac.png',
  },
]

// Rotation patterns matching main.html
const ROTATIONS = [
  'rotate-[-2deg]',
  'rotate-[2deg] mt-6',
  'rotate-[1deg]',
  'rotate-[-1deg] mt-4',
  'rotate-[-2deg]',
  'rotate-[2deg] mt-8',
]

// Matches main.html favoritesModal exactly - slides up from bottom
export function FavoritesModal({
  isOpen,
  onClose,
  favorites,
}: FavoritesModalProps) {
  // Use sample data if no favorites provided
  const displayFavorites = favorites && favorites.length > 0 ? favorites : SAMPLE_FAVORITES

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

  return (
    <div
      className={cn(
        'fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity duration-300 flex items-start justify-center overflow-y-auto',
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
      onClick={onClose}
    >
      <div
        className={cn(
          'bg-white rounded-t-3xl shadow-2xl w-full min-h-screen transform transition-transform duration-300 pt-6 pb-24',
          isOpen ? 'translate-y-0' : 'translate-y-full'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Favorite Moments</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100"
          >
            <AppIcon name="x" className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="px-4">
          <div className="flex items-center justify-between mb-4 px-2">
            <p className="text-sm text-gray-600">{displayFavorites.length} saved memories</p>
            <AppIcon name="heart" className="w-5 h-5 text-orange-500" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {displayFavorites.map((entry, index) => (
              <div
                key={entry.id}
                className={cn(
                  'relative bg-white rounded-2xl shadow-md overflow-hidden hover:rotate-0 transition-transform duration-300 transform',
                  ROTATIONS[index % ROTATIONS.length]
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={entry.photoUrl}
                  alt={entry.caption}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-2 right-2">
                  <AppIcon name="heart" className="w-5 h-5 text-red-500 drop-shadow-lg fill-current" />
                </div>
                <div className="p-3 bg-white">
                  <p className="text-xs text-gray-500 mb-1">{entry.date}</p>
                  <p className="text-sm text-gray-700 line-clamp-2">{entry.caption}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
