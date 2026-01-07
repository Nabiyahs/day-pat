'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { AppIcon } from '@/components/ui/app-icon'
import { cn } from '@/lib/utils'
import { uploadPhoto } from '@/lib/image-upload'
import type { DayCard, StickerState } from '@/types/database'

const DEBUG = process.env.NODE_ENV === 'development'

interface PolaroidCardProps {
  dayCard: DayCard | null
  photoSignedUrl: string | null
  date: string
  onSave: (updates: { photo_url?: string | null; caption?: string | null }) => Promise<{ success: boolean; error?: string }>
  onStickersChange: (stickers: StickerState[]) => Promise<void>
  saving?: boolean
  saveError?: string | null
  onEditingChange?: (editing: boolean) => void
}

const EMOJI_PALETTE = ['☕', '✨', '💛', '⭐', '🌟', '💖', '🎉', '🌸', '🍀', '🔥', '💪', '🧘‍♀️', '🥗', '💚', '😊', '🥰']

const PLACEHOLDER_TEXT = "What made today special?"

export function PolaroidCard({
  dayCard,
  photoSignedUrl,
  date,
  onSave,
  onStickersChange,
  saving,
  saveError,
  onEditingChange,
}: PolaroidCardProps) {
  const placeholder = PLACEHOLDER_TEXT
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false)

  // Pending changes (only applied on save)
  const [pendingPhotoPath, setPendingPhotoPath] = useState<string | null>(null)
  const [pendingPhotoPreview, setPendingPhotoPreview] = useState<string | null>(null)
  const [captionDraft, setCaptionDraft] = useState(dayCard?.caption || '')

  // Upload state
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // UI state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const photoAreaRef = useRef<HTMLDivElement>(null)

  const stickers = dayCard?.sticker_state || []

  // Sync caption draft when dayCard changes (e.g., date navigation)
  useEffect(() => {
    if (DEBUG) console.log('[PolaroidCard] dayCard changed, resetting state. card_date:', dayCard?.card_date)
    setCaptionDraft(dayCard?.caption || '')
    // Reset pending photo when dayCard changes
    setPendingPhotoPath(null)
    setPendingPhotoPreview(null)
    setIsEditing(false)
    onEditingChange?.(false)
  }, [dayCard?.caption, dayCard?.card_date, onEditingChange])

  // Determine what photo to display
  // Priority: pendingPhotoPreview (local) > photoSignedUrl (server)
  const displayPhotoUrl = pendingPhotoPreview || photoSignedUrl

  if (DEBUG && !displayPhotoUrl && (pendingPhotoPreview !== null || photoSignedUrl !== null)) {
    console.log('[PolaroidCard] Photo display state:', {
      pendingPhotoPreview: pendingPhotoPreview ? 'set' : 'null',
      photoSignedUrl: photoSignedUrl ? 'set' : 'null',
      displayPhotoUrl: displayPhotoUrl ? 'set' : 'null'
    })
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !isEditing) {
      if (DEBUG) console.log('[PolaroidCard] File change ignored - no file or not editing')
      return
    }

    if (DEBUG) console.log('[PolaroidCard] File selected:', { name: file.name, size: file.size, type: file.type })

    setUploading(true)
    setUploadError(null)

    // Create local preview immediately
    const localPreviewUrl = URL.createObjectURL(file)
    setPendingPhotoPreview(localPreviewUrl)
    if (DEBUG) console.log('[PolaroidCard] Local preview created')

    try {
      if (DEBUG) console.log('[PolaroidCard] Starting upload to Storage...')
      const path = await uploadPhoto(file, date)
      if (path) {
        if (DEBUG) console.log('[PolaroidCard] Upload successful, path:', path)
        setPendingPhotoPath(path)
        // Keep the local preview until save
      } else {
        // Upload returned null - clear preview and show error
        if (DEBUG) console.log('[PolaroidCard] Upload returned null')
        setPendingPhotoPreview(null)
        setUploadError('Upload failed. Please try again.')
        setTimeout(() => setUploadError(null), 5000)
      }
    } catch (error) {
      console.error('[PolaroidCard] Upload failed:', error)
      // Clear preview on error - BUT keep existing photo visible
      setPendingPhotoPreview(null)
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      setUploadError(errorMessage)
      setTimeout(() => setUploadError(null), 5000)
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleEditClick = () => {
    if (!isEditing) {
      // Enter edit mode
      if (DEBUG) console.log('[PolaroidCard] Entering edit mode')
      setIsEditing(true)
      onEditingChange?.(true)
      setCaptionDraft(dayCard?.caption || '')
    }
    // If already editing, pencil click does nothing (prevent confusion)
  }

  const handleSaveClick = async () => {
    if (!isEditing || saving) return

    if (DEBUG) console.log('[PolaroidCard] Save clicked')

    const updates: { photo_url?: string | null; caption?: string | null } = {}

    // Check if photo changed
    if (pendingPhotoPath) {
      updates.photo_url = pendingPhotoPath
      if (DEBUG) console.log('[PolaroidCard] Will save new photo path:', pendingPhotoPath)
    }

    // Check if caption changed
    if (captionDraft !== (dayCard?.caption || '')) {
      updates.caption = captionDraft
      if (DEBUG) console.log('[PolaroidCard] Will save new caption')
    }

    // Only save if there are changes
    if (Object.keys(updates).length === 0) {
      // No changes, just exit edit mode
      if (DEBUG) console.log('[PolaroidCard] No changes, exiting edit mode')
      setIsEditing(false)
      onEditingChange?.(false)
      setPendingPhotoPath(null)
      setPendingPhotoPreview(null)
      return
    }

    const result = await onSave(updates)

    if (result.success) {
      if (DEBUG) console.log('[PolaroidCard] Save successful, exiting edit mode')
      // Clear pending state and exit edit mode
      setPendingPhotoPath(null)
      setPendingPhotoPreview(null)
      setIsEditing(false)
      onEditingChange?.(false)
    } else {
      if (DEBUG) console.log('[PolaroidCard] Save failed, staying in edit mode')
    }
    // On failure, stay in edit mode (saveError will be shown)
  }

  const handleCameraClick = () => {
    if (!isEditing) return // Camera only works in edit mode
    fileInputRef.current?.click()
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
          {displayPhotoUrl ? (
            <>
              <img
                src={displayPhotoUrl}
                alt="Day photo"
                className="w-full h-[340px] object-cover"
              />
              {/* Change photo button - only clickable in edit mode */}
              <button
                onClick={handleCameraClick}
                disabled={uploading || !isEditing}
                className={cn(
                  'absolute bottom-3 right-3 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow transition-colors',
                  isEditing ? 'hover:bg-white cursor-pointer' : 'opacity-50 cursor-not-allowed'
                )}
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
              onClick={handleCameraClick}
              disabled={uploading || !isEditing}
              className={cn(
                'w-full h-[340px] flex flex-col items-center justify-center gap-2 transition-colors',
                isEditing
                  ? 'text-gray-400 hover:text-gray-500 cursor-pointer'
                  : 'text-gray-300 cursor-not-allowed'
              )}
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

          {/* Save error message */}
          {saveError && !uploadError && (
            <div className="absolute bottom-3 left-3 right-3 bg-red-500/90 text-white text-xs px-3 py-2 rounded-lg flex items-center gap-2">
              <AppIcon name="alert-circle" className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{saveError}</span>
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
          {isEditing ? (
            <input
              type="text"
              value={captionDraft}
              onChange={(e) => setCaptionDraft(e.target.value)}
              placeholder={placeholder}
              className="w-full text-center text-gray-700 font-medium leading-relaxed mb-3 bg-transparent border-b border-gray-200 focus:border-pink-400 outline-none py-1"
              maxLength={150}
            />
          ) : (
            <p
              className={cn(
                'text-center font-medium leading-relaxed mb-3 min-h-[24px]',
                dayCard?.caption ? 'text-gray-700' : 'text-gray-400'
              )}
            >
              {dayCard?.caption || placeholder}
            </p>
          )}

          {/* Footer actions - matches reference: time + edit/save buttons */}
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>{dayCard?.updated_at ? new Date(dayCard.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
            <div className="flex gap-3">
              {/* Edit (pencil) button */}
              <button
                onClick={handleEditClick}
                className={cn(
                  'transition-colors p-1',
                  isEditing ? 'text-[#F27430]' : 'hover:text-[#F27430]'
                )}
                aria-label="Edit"
                title="Edit"
              >
                <AppIcon name="edit" className="w-3.5 h-3.5" />
              </button>

              {/* Save (check) button - only shown in edit mode */}
              {isEditing && (
                <button
                  onClick={handleSaveClick}
                  disabled={saving || uploading}
                  className={cn(
                    'transition-colors p-1',
                    saving || uploading ? 'text-gray-300' : 'text-[#F27430] hover:text-[#E06320]'
                  )}
                  aria-label="Save"
                  title="Save"
                >
                  {saving ? (
                    <AppIcon name="spinner" className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <AppIcon name="check" className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
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
