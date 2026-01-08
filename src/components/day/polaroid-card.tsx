'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { startOfDay } from 'date-fns'
import Moveable from 'react-moveable'
import { AppIcon } from '@/components/ui/app-icon'
import { cn, parseDateString } from '@/lib/utils'
import { uploadPhoto } from '@/lib/image-upload'
import { StampOverlay } from './stamp-overlay'
import { StickerBottomSheet, type CatalogSticker } from './sticker-bottom-sheet'
import type { DayCard, StickerState } from '@/types/database'

const DEBUG = process.env.NODE_ENV === 'development'

interface PolaroidCardProps {
  dayCard: (DayCard & { is_liked?: boolean }) | null
  photoSignedUrl: string | null
  date: string
  onSave: (updates: { photo_url?: string | null; caption?: string | null }) => Promise<{ success: boolean; error?: string; refreshError?: string }>
  onStickersChange: (stickers: StickerState[]) => Promise<void>
  onToggleLike?: () => Promise<{ success: boolean; error?: string }>
  saving?: boolean
  saveError?: string | null
  onEditingChange?: (editing: boolean) => void
}

const PLACEHOLDER_TEXT = "Give your day a pat."

export function PolaroidCard({
  dayCard,
  photoSignedUrl,
  date,
  onSave,
  onStickersChange,
  onToggleLike,
  saving,
  saveError,
  onEditingChange,
}: PolaroidCardProps) {
  const placeholder = PLACEHOLDER_TEXT

  // Check if the selected date is in the future (no editing allowed)
  const isFutureDate = useMemo(() => {
    const selectedDate = startOfDay(parseDateString(date))
    const today = startOfDay(new Date())
    return selectedDate > today
  }, [date])

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false)

  // Pending changes (only applied on save)
  const [pendingPhotoPath, setPendingPhotoPath] = useState<string | null>(null)
  const [pendingPhotoPreview, setPendingPhotoPreview] = useState<string | null>(null)
  const [praiseDraft, setPraiseDraft] = useState(dayCard?.praise || '')

  // Upload state
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // UI state
  const [playStampAnimation, setPlayStampAnimation] = useState(false)
  const [selectedStickerIndex, setSelectedStickerIndex] = useState<number | null>(null)
  const [localStickers, setLocalStickers] = useState<StickerState[]>(dayCard?.sticker_state || [])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const photoAreaRef = useRef<HTMLDivElement>(null)
  const stickerRefs = useRef<(HTMLDivElement | null)[]>([])

  // Sync local stickers with dayCard when it changes (e.g., date navigation, server refresh)
  useEffect(() => {
    setLocalStickers(dayCard?.sticker_state || [])
  }, [dayCard?.sticker_state])

  // Use local stickers for rendering (optimistic updates)
  const stickers = localStickers

  // Clear selection when exiting edit mode
  useEffect(() => {
    if (!isEditing) {
      setSelectedStickerIndex(null)
    }
  }, [isEditing])

  // Show stamp if entry has a photo (saved entry) AND not in edit mode
  // Stamp hides when editing, reappears with animation on save success
  const showStamp = Boolean(dayCard?.photo_path) && !isEditing

  // Sync praise draft when dayCard changes (e.g., date navigation)
  useEffect(() => {
    if (DEBUG) console.log('[PolaroidCard] dayCard changed, resetting state. entry_date:', dayCard?.entry_date)
    setPraiseDraft(dayCard?.praise || '')
    // Reset pending photo when dayCard changes
    setPendingPhotoPath(null)
    setPendingPhotoPreview(null)
    setIsEditing(false)
    setPlayStampAnimation(false)
    onEditingChange?.(false)
  }, [dayCard?.praise, dayCard?.entry_date, onEditingChange])

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
    // Block editing for future dates
    if (isFutureDate) return

    if (!isEditing) {
      // Enter edit mode
      if (DEBUG) console.log('[PolaroidCard] Entering edit mode')
      setIsEditing(true)
      onEditingChange?.(true)
      setPraiseDraft(dayCard?.praise || '')
    }
    // If already editing, pencil click does nothing (prevent confusion)
  }

  const handleSaveClick = async () => {
    if (!isEditing || saving) {
      if (DEBUG) console.log('[PolaroidCard] Save blocked - isEditing:', isEditing, 'saving:', saving)
      return
    }

    if (DEBUG) console.log('[PolaroidCard] Save clicked - starting save flow')

    // Determine the effective photo path (pending new photo or existing photo)
    const effectivePhotoPath = pendingPhotoPath || dayCard?.photo_path

    // REQUIRED: Photo must exist to save entry
    if (!effectivePhotoPath) {
      setUploadError('Please add a photo first')
      setTimeout(() => setUploadError(null), 3000)
      if (DEBUG) console.log('[PolaroidCard] Save blocked - no photo')
      return
    }

    const updates: { photo_url?: string | null; caption?: string | null } = {}

    // Check if photo changed
    if (pendingPhotoPath) {
      updates.photo_url = pendingPhotoPath
      if (DEBUG) console.log('[PolaroidCard] Will save new photo path:', pendingPhotoPath)
    }

    // Check if praise changed
    if (praiseDraft !== (dayCard?.praise || '')) {
      updates.caption = praiseDraft
      if (DEBUG) console.log('[PolaroidCard] Will save new praise')
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

    if (DEBUG) console.log('[PolaroidCard] Calling onSave with updates:', {
      photo_url: updates.photo_url ? `${updates.photo_url.substring(0, 40)}...` : undefined,
      caption: updates.caption !== undefined ? `(${(updates.caption as string)?.length || 0} chars)` : undefined,
    })

    const result = await onSave(updates)

    if (DEBUG) console.log('[PolaroidCard] onSave result:', result)

    if (result.success) {
      if (DEBUG) console.log('[PolaroidCard] Save successful, exiting edit mode')
      // Clear pending state and exit edit mode
      setPendingPhotoPath(null)
      setPendingPhotoPreview(null)
      setIsEditing(false)
      onEditingChange?.(false)

      // Trigger stamp animation after successful save
      setPlayStampAnimation(true)

      // Handle refresh warning separately (not a save failure)
      if (result.refreshError) {
        if (DEBUG) console.log('[PolaroidCard] Refresh warning:', result.refreshError)
        // Show as a warning, not an error - save succeeded
        setUploadError(result.refreshError)
        setTimeout(() => setUploadError(null), 5000)
      }
    } else {
      if (DEBUG) console.log('[PolaroidCard] Save failed, staying in edit mode')
    }
    // On failure, stay in edit mode (saveError will be shown)
  }

  const handleCameraClick = () => {
    if (!isEditing) return // Camera only works in edit mode
    fileInputRef.current?.click()
  }

  const addSticker = async (catalogSticker: CatalogSticker) => {
    const newSticker: StickerState = {
      emoji: catalogSticker.src, // Store sticker path in emoji field
      x: 0.5, // Center horizontally
      y: 0.4, // Slightly above center
      scale: catalogSticker.defaultScale,
      rotate: catalogSticker.defaultRotation,
      z: stickers.length + 1,
    }
    const newStickers = [...stickers, newSticker]
    setLocalStickers(newStickers) // Optimistic update for immediate visibility
    await onStickersChange(newStickers)
  }

  const deleteSticker = async (index: number) => {
    const newStickers = stickers.filter((_, i) => i !== index)
    setSelectedStickerIndex(null)
    setLocalStickers(newStickers) // Optimistic update for immediate removal
    await onStickersChange(newStickers)
  }

  const handleStickerClick = (index: number, e: React.MouseEvent) => {
    if (!isEditing) return
    e.stopPropagation()
    setSelectedStickerIndex(index)
  }

  const handlePhotoAreaClick = (e: React.MouseEvent) => {
    // Deselect if clicking on the photo area background (not on a sticker)
    if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'IMG') {
      setSelectedStickerIndex(null)
    }
  }

  // Update sticker transform from Moveable
  const updateStickerTransform = useCallback(
    (index: number, updates: Partial<StickerState>) => {
      const newStickers = stickers.map((s, i) =>
        i === index ? { ...s, ...updates } : s
      )
      setLocalStickers(newStickers) // Optimistic update for immediate feedback
      onStickersChange(newStickers)
    },
    [stickers, onStickersChange]
  )

  return (
    <div className="w-full max-w-[340px] mx-auto relative">
      {/* Polaroid frame - constrained width with balanced padding */}
      <div
        className="bg-white rounded-2xl shadow-xl p-4 mb-4 relative"
        style={{ transform: 'rotate(-1deg)' }}
      >
        {/* Photo area - slightly reduced height */}
        <div
          ref={photoAreaRef}
          className="bg-gray-100 rounded-xl overflow-hidden mb-3 relative"
          onClick={handlePhotoAreaClick}
        >
          {displayPhotoUrl ? (
            <>
              <img
                src={displayPhotoUrl}
                alt="Day photo"
                className="w-full h-[280px] object-cover relative z-0"
              />
              {/* Change photo button - only clickable in edit mode */}
              <button
                onClick={handleCameraClick}
                disabled={uploading || !isEditing}
                className={cn(
                  'absolute bottom-3 right-3 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow transition-colors z-20',
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
                'w-full h-[280px] flex flex-col items-center justify-center gap-2 transition-colors',
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
            <div className="absolute bottom-3 left-3 right-3 bg-red-500/90 text-white text-xs px-3 py-2 rounded-lg flex items-center gap-2 z-30">
              <AppIcon name="alert-circle" className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{uploadError}</span>
            </div>
          )}

          {/* Save error message */}
          {saveError && !uploadError && (
            <div className="absolute bottom-3 left-3 right-3 bg-red-500/90 text-white text-xs px-3 py-2 rounded-lg flex items-center gap-2 z-30">
              <AppIcon name="alert-circle" className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{saveError}</span>
            </div>
          )}

          {/* Stickers overlay - positioned absolutely within photo area */}
          {stickers.map((sticker, index) => {
            const isImageSticker = sticker.emoji.startsWith('/')
            const isSelected = isEditing && selectedStickerIndex === index
            return (
              <div
                key={index}
                ref={(el) => { stickerRefs.current[index] = el }}
                className={cn(
                  'absolute select-none drop-shadow-md',
                  isEditing && 'cursor-pointer',
                  isSelected && 'ring-2 ring-blue-400 ring-offset-1 rounded-lg'
                )}
                style={{
                  left: `${sticker.x * 100}%`,
                  top: `${sticker.y * 100}%`,
                  transform: `translate(-50%, -50%) scale(${sticker.scale}) rotate(${sticker.rotate}deg)`,
                  zIndex: isSelected ? 50 : 10 + sticker.z,
                }}
                onClick={(e) => handleStickerClick(index, e)}
              >
                {isImageSticker ? (
                  <img
                    src={sticker.emoji}
                    alt="sticker"
                    className="w-16 h-16 object-contain pointer-events-none"
                    draggable={false}
                  />
                ) : (
                  <span className="text-3xl">{sticker.emoji}</span>
                )}
                {/* Delete button - only shown for selected sticker in edit mode */}
                {isSelected && (
                  <button
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md z-10"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteSticker(index)
                    }}
                    aria-label="Delete sticker"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            )
          })}

          {/* Moveable for selected sticker */}
          {isEditing && selectedStickerIndex !== null && stickerRefs.current[selectedStickerIndex] && (
            <Moveable
              target={stickerRefs.current[selectedStickerIndex]}
              container={photoAreaRef.current}
              draggable={true}
              scalable={true}
              rotatable={true}
              keepRatio={true}
              throttleDrag={0}
              throttleScale={0}
              throttleRotate={0}
              renderDirections={["nw", "ne", "sw", "se"]}
              rotationPosition="top"
              origin={false}
              padding={{ left: 0, top: 0, right: 0, bottom: 0 }}
              onDrag={({ target, left, top }) => {
                const photoArea = photoAreaRef.current
                if (!photoArea) return
                const rect = photoArea.getBoundingClientRect()
                const stickerRect = target.getBoundingClientRect()

                // Calculate center position as normalized coordinates
                const centerX = (left + stickerRect.width / 2) / rect.width
                const centerY = (top + stickerRect.height / 2) / rect.height

                // Clamp within bounds
                const x = Math.max(0.1, Math.min(0.9, centerX))
                const y = Math.max(0.1, Math.min(0.9, centerY))

                updateStickerTransform(selectedStickerIndex, { x, y })
              }}
              onScale={({ target, scale, drag }) => {
                const currentSticker = stickers[selectedStickerIndex]
                if (!currentSticker) return

                // Calculate new scale with limits
                const newScale = Math.max(0.4, Math.min(2.0, currentSticker.scale * scale[0]))

                // Apply transform directly for smooth visual feedback
                target.style.transform = `translate(-50%, -50%) scale(${newScale}) rotate(${currentSticker.rotate}deg)`
              }}
              onScaleEnd={({ target }) => {
                const currentSticker = stickers[selectedStickerIndex]
                if (!currentSticker) return

                // Parse the final scale from transform
                const transform = target.style.transform
                const scaleMatch = transform.match(/scale\(([^)]+)\)/)
                if (scaleMatch) {
                  const newScale = Math.max(0.4, Math.min(2.0, parseFloat(scaleMatch[1])))
                  updateStickerTransform(selectedStickerIndex, { scale: newScale })
                }
              }}
              onRotate={({ target, rotate }) => {
                const currentSticker = stickers[selectedStickerIndex]
                if (!currentSticker) return

                // Apply transform directly for smooth visual feedback
                target.style.transform = `translate(-50%, -50%) scale(${currentSticker.scale}) rotate(${rotate}deg)`
              }}
              onRotateEnd={({ target }) => {
                // Parse the final rotation from transform
                const transform = target.style.transform
                const rotateMatch = transform.match(/rotate\(([^)]+)deg\)/)
                if (rotateMatch) {
                  const rotate = parseFloat(rotateMatch[1])
                  updateStickerTransform(selectedStickerIndex, { rotate })
                }
              }}
            />
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
              value={praiseDraft}
              onChange={(e) => setPraiseDraft(e.target.value)}
              placeholder={placeholder}
              className="w-full text-center text-gray-700 font-medium leading-relaxed mb-3 bg-transparent border-b border-gray-200 focus:border-pink-400 outline-none py-1"
              maxLength={150}
            />
          ) : (
            <p
              className={cn(
                'text-center font-medium leading-relaxed mb-3 min-h-[24px]',
                dayCard?.praise ? 'text-gray-700' : 'text-gray-400'
              )}
            >
              {dayCard?.praise || placeholder}
            </p>
          )}

          {/* Footer actions - matches reference: time + edit/like/save buttons */}
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>{dayCard?.created_at ? new Date(dayCard.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
            <div className="flex gap-3">
              {/* Edit (pencil) button - hidden for future dates */}
              {!isFutureDate && (
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
              )}

              {/* Heart (like) button - only show if entry exists */}
              {dayCard?.id && onToggleLike && (
                <button
                  onClick={onToggleLike}
                  className={cn(
                    'transition-colors p-1',
                    dayCard.is_liked ? 'text-red-500' : 'hover:text-[#F27430]'
                  )}
                  aria-label={dayCard.is_liked ? 'Remove from favorites' : 'Add to favorites'}
                  title={dayCard.is_liked ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <AppIcon
                    name="heart"
                    className={cn('w-3.5 h-3.5', dayCard.is_liked && 'fill-current')}
                  />
                </button>
              )}

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

        {/* Stamp overlay - Day View only */}
        <StampOverlay
          show={showStamp}
          playAnimation={playStampAnimation}
          onAnimationComplete={() => setPlayStampAnimation(false)}
        />
      </div>

      {/* Sticker picker bottom sheet - visible in edit mode */}
      {isEditing && (
        <StickerBottomSheet onStickerSelect={addSticker} />
      )}
    </div>
  )
}
