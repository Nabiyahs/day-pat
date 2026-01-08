'use client'

import stickersCatalog from '@/data/stickersCatalog.json'

interface CatalogSticker {
  id: string
  src: string
  defaultScale: number
  defaultRotation: number
}

interface StickerBottomSheetProps {
  onStickerSelect: (sticker: CatalogSticker) => void
}

export function StickerBottomSheet({ onStickerSelect }: StickerBottomSheetProps) {
  const stickers = stickersCatalog as CatalogSticker[]

  return (
    <div className="bg-white rounded-t-2xl shadow-lg border border-gray-100 p-4">
      {/* Header with drag handle indicator */}
      <div className="flex justify-center mb-2">
        <div className="w-10 h-1 bg-gray-300 rounded-full" />
      </div>
      <p className="text-xs text-gray-500 mb-3 px-1">Add sticker</p>

      {/* Vertical scrolling grid - approximately 40% viewport height */}
      <div
        className="overflow-y-auto overscroll-contain"
        style={{ maxHeight: '40vh' }}
      >
        <div className="grid grid-cols-5 gap-2 pb-2">
          {stickers.map((sticker) => (
            <button
              key={sticker.id}
              onClick={() => onStickerSelect(sticker)}
              className="aspect-square flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 rounded-xl transition-colors p-1"
            >
              <img
                src={sticker.src}
                alt={sticker.id}
                className="w-full h-full object-contain"
                draggable={false}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export type { CatalogSticker }
