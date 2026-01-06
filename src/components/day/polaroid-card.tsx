'use client'

import { useState, useRef, useCallback } from 'react'
import { AppIcon } from '@/components/ui/app-icon'
import { cn } from '@/lib/utils'
import { uploadPhoto } from '@/lib/image-upload'
import type { DayCard, StickerState } from '@/types/database'

interface PolaroidCardProps {
  dayCard: DayCard | null
  date: string
  onPhotoChange: (url: string) => Promise<void>
  onCaptionChange: (caption: string) => Promise<void>
  onStickersChange: (stickers: StickerState[]) => Promise<void>
  saving?: boolean
}

const EMOJI_PALETTE = ['☕', '✨', '💛', '⭐', '🌟', '💖', '🎉', '🌸', '🍀', '🔥', '💪', '🧘‍♀️', '🥗', '💚', '😊', '🥰']

export function PolaroidCard({
  dayCard,
  date,
  onPhotoChange,
  onCaptionChange,
  onStickersChange,
  saving,
}: PolaroidCardProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [editingCaption, setEditingCaption] = useState(false)
  const [captionDraft, setCaptionDraft] = useState(dayCard?.caption || '')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const photoAreaRef = useRef<HTMLDivElement>(null)

  const stickers = dayCard?.sticker_state || []

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadError(null)
    try {
      const url = await uploadPhoto(file, date)
      if (url) {
        await onPhotoChange(url)
      }
    } catch (error) {
      console.error('Upload failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      setUploadError(errorMessage)
      // Clear error after 5 seconds
      setTimeout(() => setUploadError(null), 5000)
    } finally {
      setUploading(false)
      // Reset file input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleCaptionBlur = async () => {
    setEditingCaption(false)
    if (captionDraft !== (dayCard?.caption || '')) {
      await onCaptionChange(captionDraft)
    }
  }

  const addSticker = async (emoji: string) => {
    const newSticker: StickerState = {
      emoji,
      x: 0.85 + (stickers.length * 0.05),
      y: 0.08,
      scale: 1,
      rotate: 0,
      z: stickers.length + 1,
    }
    await onStickersChange([...stickers, newSticker])
    setShowEmojiPicker(false)
  }

  const handleStickerDrag = useCallback(
    (index: number, e: React.MouseEvent | React.TouchEvent) => {
      const photoArea = photoAreaRef.current
      if (!photoArea) return

      e.preventDefault()
      const rect = photoArea.getBoundingClientRect()

      const getCoords = (event: MouseEvent | TouchEvent) => {
        if ('touches' in event) {
          return { clientX: event.touches[0].clientX, clientY: event.touches[0].clientY }
        }
        return { clientX: event.clientX, clientY: event.clientY }
      }

      const handleMove = async (moveEvent: MouseEvent | TouchEvent) => {
        const { clientX, clientY } = getCoords(moveEvent)
        const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
        const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
        const newStickers = stickers.map((s, i) =>
          i === index ? { ...s, x, y } : s
        )
        await onStickersChange(newStickers)
      }

      const handleUp = () => {
        document.removeEventListener('mousemove', handleMove)
        document.removeEventListener('mouseup', handleUp)
        document.removeEventListener('touchmove', handleMove)
        document.removeEventListener('touchend', handleUp)
      }

      document.addEventListener('mousemove', handleMove)
      document.addEventListener('mouseup', handleUp)
      document.addEventListener('touchmove', handleMove)
      document.addEventListener('touchend', handleUp)
    },
    [stickers, onStickersChange]
  )

  const deleteSticker = async (index: number) => {
    const newStickers = stickers.filter((_, i) => i !== index)
    await onStickersChange(newStickers)
  }

  return (
    <div className="w-full relative">
      {/* Polaroid frame - matches reference: rounded-3xl shadow-xl p-5 rotate-[-1deg] */}
      <div
        className="bg-white rounded-3xl shadow-xl p-5 mb-6 relative"
        style={{ transform: 'rotate(-1deg)' }}
      >
        {/* Photo area - matches reference: bg-gray-100 rounded-2xl h-[340px] */}
        <div
          ref={photoAreaRef}
          className="bg-gray-100 rounded-2xl overflow-hidden mb-4 relative"
        >
          {dayCard?.photo_url ? (
            <>
              <img
                src={dayCard.photo_url}
                alt="Day photo"
                className="w-full h-[340px] object-cover"
              />
              {/* Change photo button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-3 right-3 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow hover:bg-white transition-colors"
              >
                {uploading ? (
                  <AppIcon name="spinner" className="w-4 h-4 animate-spin text-gray-600" />
                ) : (
                  <AppIcon name="camera" className="w-4 h-4 text-gray-600" />
                )}
              </button>
            </>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full h-[340px] flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-gray-500 transition-colors"
            >
              {uploading ? (
                <AppIcon name="spinner" className="w-10 h-10 animate-spin" />
              ) : (
                <AppIcon name="camera" className="w-10 h-10" />
              )}
            </button>
          )}

          {/* Upload error message */}
          {uploadError && (
            <div className="absolute bottom-3 left-3 right-3 bg-red-500/90 text-white text-xs px-3 py-2 rounded-lg flex items-center gap-2">
              <AppIcon name="alert-circle" className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{uploadError}</span>
            </div>
          )}

          {/* Stickers overlay - matches reference: absolute top-3 right-3 flex gap-2 text-3xl */}
          {stickers.length > 0 && (
            <div className="absolute top-3 right-3 flex gap-2">
              {stickers.map((sticker, index) => (
                <span
                  key={index}
                  className="text-3xl cursor-move select-none drop-shadow-sm"
                  style={{
                    transform: `scale(${sticker.scale}) rotate(${sticker.rotate}deg)`,
                  }}
                  onMouseDown={(e) => handleStickerDrag(index, e)}
                  onTouchStart={(e) => handleStickerDrag(index, e)}
                  onDoubleClick={() => deleteSticker(index)}
                >
                  {sticker.emoji}
                </span>
              ))}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Caption and footer - matches reference layout */}
        <div className="px-2">
          {editingCaption ? (
            <input
              type="text"
              value={captionDraft}
              onChange={(e) => setCaptionDraft(e.target.value)}
              onBlur={handleCaptionBlur}
              onKeyDown={(e) => e.key === 'Enter' && handleCaptionBlur()}
              autoFocus
              placeholder="오늘의 칭찬 하나"
              className="w-full text-center text-gray-700 font-medium leading-relaxed mb-3 bg-transparent border-b border-gray-200 focus:border-pink-400 outline-none py-1"
              maxLength={150}
            />
          ) : (
            <p
              onClick={() => {
                setCaptionDraft(dayCard?.caption || '')
                setEditingCaption(true)
              }}
              className={cn(
                'text-center font-medium leading-relaxed mb-3 cursor-pointer min-h-[24px]',
                dayCard?.caption ? 'text-gray-700' : 'text-gray-400'
              )}
            >
              {dayCard?.caption || '오늘의 칭찬 하나'}
            </p>
          )}

          {/* Footer actions - matches reference: time + sticker button */}
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>{dayCard?.updated_at ? new Date(dayCard.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="hover:text-[#F27430] transition-colors p-1"
                aria-label="Add sticker"
                title="Add sticker"
              >
                <AppIcon name="edit" className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Saving indicator */}
        {saving && (
          <div className="absolute top-2 right-2">
            <AppIcon name="spinner" className="w-4 h-4 animate-spin text-pink-500" />
          </div>
        )}
      </div>

      {/* Emoji picker popup */}
      {showEmojiPicker && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 mb-4">
          <p className="text-xs text-gray-500 mb-3">Add sticker (double-click to remove)</p>
          <div className="grid grid-cols-8 gap-2">
            {EMOJI_PALETTE.map((emoji) => (
              <button
                key={emoji}
                onClick={() => addSticker(emoji)}
                className="w-9 h-9 flex items-center justify-center text-xl hover:bg-pink-50 rounded-lg transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
