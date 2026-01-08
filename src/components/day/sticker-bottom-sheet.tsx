'use client'

import stickersCatalog from '@/data/stickersCatalog.json'

interface CatalogSticker {
  id: string
  src: string
  name: string
  defaultScale: number
  defaultRotation: number
}

interface StickerBottomSheetProps {
  onStickerSelect: (sticker: CatalogSticker) => void
}

export function StickerBottomSheet({ onStickerSelect }: StickerBottomSheetProps) {
  const stickers = stickersCatalog as CatalogSticker[]

  return (
    <div className="bg-white rounded-t-2xl shadow-lg border border-gray-100 p-3">
      <p className="text-xs text-gray-500 mb-2 px-1">Add sticker</p>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {stickers.map((sticker) => (
          <button
            key={sticker.id}
            onClick={() => onStickerSelect(sticker)}
            className="flex-shrink-0 w-12 h-12 flex items-center justify-center hover:bg-gray-50 rounded-lg transition-colors"
            title={sticker.name}
          >
            <img
              src={sticker.src}
              alt={sticker.name}
              className="w-10 h-10 object-contain"
              draggable={false}
            />
          </button>
        ))}
      </div>
    </div>
  )
}

export type { CatalogSticker }
