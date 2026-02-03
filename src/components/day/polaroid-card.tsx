'use client'

import { useState, useRef, useCallback, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react'
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
  loading?: boolean
  onSave: (updates: { photo_url?: string | null; caption?: string | null; sticker_state?: StickerState[] }) => Promise<{ success: boolean; error?: string; refreshError?: string }>
  onToggleLike?: () => Promise<{ success: boolean; error?: string }>
  onShare?: () => Promise<void>
  saving?: boolean
  sharing?: boolean
  saveError?: string | null
  onEditingChange?: (editing: boolean) => void
  /** When true, shows slogan instead of timestamp (for export) */
  isExporting?: boolean
}

// Expose methods for parent components (e.g., export)
export interface PolaroidCardRef {
  getExportElement: () => HTMLDivElement | null
}

const PLACEHOLDER_TEXT = "Give your day a pat."

export const PolaroidCard = forwardRef<PolaroidCardRef, PolaroidCardProps>(function PolaroidCard({
  dayCard,
  photoSignedUrl,
  date,
  loading,
  onSave,
  onToggleLike,
  onShare,
  saving,
  sharing,
  saveError,
  onEditingChange,
  isExporting = false,
}, ref) {
  const placeholder = PLACEHOLDER_TEXT
  const polaroidContainerRef = useRef<HTMLDivElement>(null)

  // Expose the polaroid container for export
  useImperativeHandle(ref, () => ({
    getExportElement: () => polaroidContainerRef.current,
  }))

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
  const [pendingPhotoDelete, setPendingPhotoDelete] = useState(false) // Track draft deletion of existing photo

  // Upload state
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // UI state
  const [playStampAnimation, setPlayStampAnimation] = useState(false)
  const [selectedStickerIndex, setSelectedStickerIndex] = useState<number | null>(null)
  const [showPhotoSourceModal, setShowPhotoSourceModal] = useState(false)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const photoAreaRef = useRef<HTMLDivElement>(null)
  const stickerRefs = useRef<(HTMLDivElement | null)[]>([])
  const prevDateRef = useRef<string>(date) // Track previous date for animation reset logic

  // Sticker state: savedStickers (source of truth) vs draftStickers (edit-only working copy)
  const savedStickers = dayCard?.sticker_state || []
  const [draftStickers, setDraftStickers] = useState<StickerState[]>([])

  // Render savedStickers in view mode, draftStickers in edit mode
  const stickers = isEditing ? draftStickers : savedStickers

  // Initialize draft when entering edit mode
  useEffect(() => {
    if (isEditing) {
      // Clone savedStickers to draftStickers when entering edit mode
      setDraftStickers([...savedStickers])
    } else {
      // Clear selection when exiting edit mode
      setSelectedStickerIndex(null)
    }
  }, [isEditing]) // Note: savedStickers intentionally not in deps to avoid re-cloning during edit

  // Show stamp if entry exists (saved entry) AND not in edit mode
  // Now shows for text-only entries as well as photo entries
  // Stamp hides when editing, reappears with animation on save success
  const showStamp = Boolean(dayCard?.id) && !isEditing
  // Center the stamp when there's no photo (text-only entries)
  const stampCentered = showStamp && !dayCard?.photo_path

  // Sync praise draft when dayCard changes (e.g., date navigation)
  // Only reset playStampAnimation when DATE changes (navigation), not when dayCard refreshes after save
  useEffect(() => {
    const dateChanged = prevDateRef.current !== date
    if (DEBUG) console.log('[PolaroidCard] dayCard/date changed, dateChanged:', dateChanged, 'entry_date:', dayCard?.entry_date)

    setPraiseDraft(dayCard?.praise || '')
    // Reset pending photo when dayCard changes
    setPendingPhotoPath(null)
    setPendingPhotoPreview(null)
    setPendingPhotoDelete(false)
    setIsEditing(false)
    onEditingChange?.(false)

    // Only reset stamp animation when navigating to a different date
    // NOT when dayCard refreshes after save on the same date
    if (dateChanged) {
      setPlayStampAnimation(false)
      prevDateRef.current = date
    }
  }, [date, dayCard?.praise, dayCard?.entry_date, onEditingChange])

  // Determine what photo to display
  // Priority: pendingPhotoPreview (local) > photoSignedUrl (server)
  // If pendingPhotoDelete is true, don't show the existing photo (draft deletion)
  const displayPhotoUrl = pendingPhotoPreview || (pendingPhotoDelete ? null : photoSignedUrl)

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
    setPendingPhotoDelete(false) // Reset delete flag when new photo is selected
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
      // Reset all file inputs to allow re-selecting the same file
      if (cameraInputRef.current) cameraInputRef.current.value = ''
      if (galleryInputRef.current) galleryInputRef.current.value = ''
      if (fileInputRef.current) fileInputRef.current.value = ''
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
    const effectivePhotoPath = pendingPhotoPath || (pendingPhotoDelete ? null : dayCard?.photo_path)

    // Photo is now OPTIONAL - can save with just caption
    // But require at least something to save (photo or caption)
    const effectiveCaption = praiseDraft.trim()
    if (!effectivePhotoPath && !effectiveCaption) {
      setUploadError('Please add a photo or text')
      setTimeout(() => setUploadError(null), 3000)
      if (DEBUG) console.log('[PolaroidCard] Save blocked - no photo and no caption')
      return
    }

    const updates: { photo_url?: string | null; caption?: string | null; sticker_state?: StickerState[] } = {}

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

    // Check if stickers changed (compare draft to saved)
    const stickersChanged = JSON.stringify(draftStickers) !== JSON.stringify(savedStickers)
    if (stickersChanged) {
      updates.sticker_state = draftStickers
      if (DEBUG) console.log('[PolaroidCard] Will save stickers:', draftStickers.length, 'items')
    }

    // Only save if there are changes (photo, caption, or stickers)
    if (Object.keys(updates).length === 0) {
      // No changes, just exit edit mode but still play stamp animation
      if (DEBUG) console.log('[PolaroidCard] No changes, exiting edit mode with stamp animation')
      setIsEditing(false)
      onEditingChange?.(false)
      setPendingPhotoPath(null)
      setPendingPhotoPreview(null)
      // Trigger stamp animation even without changes
      setPlayStampAnimation(true)
      return
    }

    // Save all changes in a single call
    if (DEBUG) console.log('[PolaroidCard] Calling onSave with updates:', {
      photo_url: updates.photo_url ? `${updates.photo_url.substring(0, 40)}...` : undefined,
      caption: updates.caption !== undefined ? `(${(updates.caption as string)?.length || 0} chars)` : undefined,
      sticker_state: updates.sticker_state ? `(${updates.sticker_state.length} stickers)` : undefined,
    })

    const result = await onSave(updates)

    if (DEBUG) console.log('[PolaroidCard] onSave result:', result)

    if (!result.success) {
      if (DEBUG) console.log('[PolaroidCard] Save failed, staying in edit mode')
      return // Stay in edit mode on failure
    }

    // Handle refresh warning separately (not a save failure)
    if (result.refreshError) {
      if (DEBUG) console.log('[PolaroidCard] Refresh warning:', result.refreshError)
      setUploadError(result.refreshError)
      setTimeout(() => setUploadError(null), 5000)
    }

    // Success - exit edit mode
    if (DEBUG) console.log('[PolaroidCard] Save successful, exiting edit mode')
    setPendingPhotoPath(null)
    setPendingPhotoPreview(null)
    setIsEditing(false)
    onEditingChange?.(false)

    // Trigger stamp animation after successful save
    setPlayStampAnimation(true)
  }

  // Open photo source selection modal (only in edit mode)
  const handlePhotoAreaClickForUpload = () => {
    if (!isEditing) return
    setShowPhotoSourceModal(true)
  }

  // Photo source selection handlers
  const handleCameraSelect = () => {
    setShowPhotoSourceModal(false)
    cameraInputRef.current?.click()
  }

  const handleGallerySelect = () => {
    setShowPhotoSourceModal(false)
    galleryInputRef.current?.click()
  }

  const handleFileSelect = () => {
    setShowPhotoSourceModal(false)
    fileInputRef.current?.click()
  }

  // Delete photo from draft (no server save - only clears local state)
  // The photo will be removed from DB only when user saves with no photo
  const handleDeletePhoto = () => {
    if (!isEditing) return
    // Clear pending photo preview and path
    setPendingPhotoPreview(null)
    setPendingPhotoPath(null)
    // Mark that we want to delete the existing photo
    // This hides the existing photo in the UI (draft deletion)
    setPendingPhotoDelete(true)
  }

  // Delete comment from draft (no server save - only clears local state)
  const handleDeleteComment = () => {
    if (!isEditing) return
    setPraiseDraft('')
  }

  // Add sticker to draft (no server save - saved only on explicit Save action)
  const addSticker = (catalogSticker: CatalogSticker) => {
    const newSticker: StickerState = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      src: catalogSticker.src,
      x: 0.5, // Center horizontally
      y: 0.4, // Slightly above center
      scale: catalogSticker.defaultScale,
      rotation: catalogSticker.defaultRotation,
    }
    setDraftStickers(prev => [...prev, newSticker])
  }

  // Delete sticker from draft (no server save - saved only on explicit Save action)
  const deleteSticker = (index: number) => {
    setSelectedStickerIndex(null)
    setDraftStickers(prev => prev.filter((_, i) => i !== index))
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

  // Update sticker transform from Moveable (draft only - no server save)
  const updateStickerTransform = useCallback(
    (index: number, updates: Partial<StickerState>) => {
      setDraftStickers(prev => prev.map((s, i) =>
        i === index ? { ...s, ...updates } : s
      ))
      // NOTE: Do NOT call onStickersChange here - that triggers server save
      // Stickers are saved when user explicitly presses Save button
    },
    []
  )

  return (
    <div className="w-full max-w-[340px] mx-auto relative">
      {/* Polaroid frame - constrained width with balanced padding, square corners */}
      <div
        ref={polaroidContainerRef}
        data-polaroid="true"
        className="bg-white shadow-xl p-4 mb-4 relative"
        style={{ transform: 'rotate(-1deg)' }}
      >
        {/* Photo area - slightly reduced height, square corners */}
        <div
          ref={photoAreaRef}
          className="bg-gray-100 overflow-hidden mb-3 relative"
          onClick={handlePhotoAreaClick}
        >
          {loading ? (
            // Loading state - data is being fetched
            <div className="w-full h-[280px] flex items-center justify-center bg-gray-100 animate-pulse">
              <AppIcon name="spinner" className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : displayPhotoUrl ? (
            // Photo display - local preview or remote image
            <>
              <img
                src={displayPhotoUrl}
                alt="Day photo"
                className="w-full h-[280px] object-cover"
                crossOrigin={pendingPhotoPreview ? undefined : "anonymous"}
                onClick={isEditing ? handlePhotoAreaClickForUpload : undefined}
                style={{ cursor: isEditing ? 'pointer' : 'default' }}
              />
              {/* DayPat watermark - only visible during export (controlled by CSS) */}
              <span className="daypat-watermark">DayPat</span>
            </>
          ) : dayCard?.photo_path && !pendingPhotoDelete ? (
            // Skeleton loader - photo exists but signed URL still loading
            <div className="w-full h-[280px] flex items-center justify-center bg-gray-100 animate-pulse">
              <AppIcon name="spinner" className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : (
            // Empty state - camera icon CTA centered in photo area
            // Clickable to show photo source selection (enters edit mode if needed)
            <button
              onClick={() => {
                if (!isEditing && !isFutureDate) {
                  // Enter edit mode first
                  setIsEditing(true)
                  onEditingChange?.(true)
                  setPraiseDraft(dayCard?.praise || '')
                }
                // Show photo source selection modal after a brief delay
                setTimeout(() => setShowPhotoSourceModal(true), 50)
              }}
              disabled={uploading || isFutureDate}
              className={cn(
                'w-full h-[280px] flex items-center justify-center',
                !uploading && !isFutureDate && 'cursor-pointer hover:bg-gray-200/50 transition-colors'
              )}
              style={{ minWidth: '44px', minHeight: '44px' }}
              aria-label="Add photo"
            >
              {uploading ? (
                <AppIcon name="spinner" className="w-10 h-10 animate-spin text-gray-400" />
              ) : (
                <AppIcon name="camera" className="w-12 h-12 text-gray-400" />
              )}
            </button>
          )}

          {/* Photo delete X button - only in edit mode when photo exists */}
          {isEditing && displayPhotoUrl && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDeletePhoto()
              }}
              className="absolute top-2 right-2 w-9 h-9 flex items-center justify-center transition-colors"
              style={{
                zIndex: 100, // Above stamp and stickers
                minWidth: '36px',
                minHeight: '36px',
              }}
              aria-label="Delete photo"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                style={{
                  color: '#C45A20', // Darker orange for visibility
                  filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.8))', // Subtle white outline for contrast on bright photos
                }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
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
            const isImageSticker = sticker.src.startsWith('/')
            const isSelected = isEditing && selectedStickerIndex === index
            return (
              <div
                key={sticker.id}
                data-sticker="true"
                ref={(el) => { stickerRefs.current[index] = el }}
                className={cn(
                  'absolute select-none drop-shadow-md',
                  isEditing && 'cursor-pointer',
                  isSelected && 'ring-2 ring-blue-400 ring-offset-1 rounded-lg'
                )}
                style={{
                  left: `${sticker.x * 100}%`,
                  top: `${sticker.y * 100}%`,
                  transform: `translate(-50%, -50%) scale(${sticker.scale}) rotate(${sticker.rotation}deg)`,
                  zIndex: isSelected ? 50 : 10 + index,
                }}
                onClick={(e) => handleStickerClick(index, e)}
              >
                {isImageSticker ? (
                  <img
                    src={sticker.src}
                    alt="sticker"
                    className="w-20 h-20 object-contain pointer-events-none"
                    style={{ imageRendering: 'auto' }}
                    draggable={false}
                  />
                ) : (
                  <span className="text-3xl">{sticker.src}</span>
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
                target.style.transform = `translate(-50%, -50%) scale(${newScale}) rotate(${currentSticker.rotation}deg)`
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
                  const rotation = parseFloat(rotateMatch[1])
                  updateStickerTransform(selectedStickerIndex, { rotation })
                }
              }}
            />
          )}

          {/* Delete button - rendered separately to avoid Moveable blocking clicks */}
          {isEditing && selectedStickerIndex !== null && stickers[selectedStickerIndex] && (
            <button
              className="absolute w-7 h-7 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white rounded-full flex items-center justify-center shadow-lg"
              style={{
                left: `calc(${stickers[selectedStickerIndex].x * 100}% + 30px)`,
                top: `calc(${stickers[selectedStickerIndex].y * 100}% - 30px)`,
                transform: 'translate(-50%, -50%)',
                zIndex: 100,
              }}
              onClick={(e) => {
                e.stopPropagation()
                deleteSticker(selectedStickerIndex)
              }}
              aria-label="Delete sticker"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {/* Stamp overlay - positioned inside photo area (bottom-right, or centered if no photo) */}
          <StampOverlay
            show={showStamp}
            playAnimation={playStampAnimation}
            onAnimationComplete={() => setPlayStampAnimation(false)}
            centered={stampCentered}
          />

          {/* Hidden file inputs for different sources */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
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
            <div className="relative mb-3">
              <textarea
                value={praiseDraft}
                onChange={(e) => setPraiseDraft(e.target.value)}
                placeholder={placeholder}
                className="w-full text-center text-gray-700 font-medium leading-relaxed bg-transparent border-b border-gray-200 focus:border-pink-400 outline-none py-1 pr-8 resize-none whitespace-pre-wrap break-words"
                maxLength={300}
                rows={3}
              />
              {/* Comment delete X button - aligned to top-right */}
              {praiseDraft && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteComment()
                  }}
                  className="absolute right-0 top-1 w-7 h-7 flex items-center justify-center transition-colors"
                  style={{
                    minWidth: '32px',
                    minHeight: '32px',
                  }}
                  aria-label="Clear comment"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    style={{
                      color: '#C45A20', // Darker orange for visibility
                      filter: 'drop-shadow(0 0 1px rgba(255,255,255,0.6))', // Subtle outline
                    }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ) : (
            <p
              className={cn(
                'text-center font-medium leading-relaxed mb-3 min-h-[24px] whitespace-pre-wrap break-words',
                dayCard?.praise ? 'text-gray-700' : 'text-gray-400'
              )}
            >
              {dayCard?.praise || placeholder}
            </p>
          )}

          {/* Footer actions - slogan on left, icons aligned right with tight spacing */}
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span
              style={{ fontFamily: "'Open Sans', sans-serif", color: '#F27430', fontWeight: 500, fontSize: '11px' }}
            >
              EVERY DAY DESERVES A PAT.
            </span>
            <div className="flex items-center gap-0">
              {/* Edit (pencil) button - hidden for future dates, excluded from export */}
              {!isFutureDate && (
                <button
                  onClick={handleEditClick}
                  data-export-exclude="true"
                  className={cn(
                    'w-9 h-9 flex items-center justify-center rounded-lg transition-colors',
                    isEditing ? 'text-[#F27430]' : 'text-gray-400 hover:text-[#F27430] hover:bg-gray-100'
                  )}
                  aria-label="Edit diary entry"
                  title="Edit"
                >
                  <AppIcon name="edit" className="w-4 h-4" />
                </button>
              )}

              {/* Share (paper plane) button - only show if entry has saved photo, excluded from export */}
              {dayCard?.photo_path && !isEditing && (
                <button
                  onClick={onShare}
                  disabled={sharing}
                  data-export-exclude="true"
                  className={cn(
                    'w-9 h-9 flex items-center justify-center rounded-lg transition-colors',
                    sharing
                      ? 'text-gray-300 cursor-wait'
                      : 'text-gray-400 hover:text-[#F27430] hover:bg-gray-100'
                  )}
                  aria-label="Share diary as image"
                  title="Share"
                >
                  {sharing ? (
                    <AppIcon name="spinner" className="w-4 h-4 animate-spin" />
                  ) : (
                    <AppIcon name="paper-plane" className="w-4 h-4" />
                  )}
                </button>
              )}

              {/* Heart (like) button - only show if entry exists (visible in both view and edit mode) */}
              {dayCard?.id && onToggleLike && (
                <button
                  onClick={onToggleLike}
                  className={cn(
                    'w-9 h-9 flex items-center justify-center rounded-lg transition-colors',
                    dayCard.is_liked
                      ? 'text-red-500'
                      : 'text-gray-400 hover:text-[#F27430] hover:bg-gray-100'
                  )}
                  aria-label={dayCard.is_liked ? 'Remove from favorites' : 'Add to favorites'}
                  title={dayCard.is_liked ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <AppIcon
                    name="heart"
                    className={cn('w-4 h-4', dayCard.is_liked && 'fill-current')}
                  />
                </button>
              )}

              {/* Save (check) button - only shown in edit mode */}
              {isEditing && (
                <button
                  onClick={handleSaveClick}
                  disabled={saving || uploading}
                  className={cn(
                    'w-9 h-9 flex items-center justify-center rounded-lg transition-colors',
                    saving || uploading
                      ? 'text-gray-300'
                      : 'text-[#F27430] hover:text-[#E06320] hover:bg-orange-50'
                  )}
                  aria-label="Save changes"
                  title="Save"
                >
                  {saving ? (
                    <AppIcon name="spinner" className="w-4 h-4 animate-spin" />
                  ) : (
                    <AppIcon name="check" className="w-4 h-4" />
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

      {/* Sticker picker bottom sheet - visible in edit mode */}
      {isEditing && (
        <StickerBottomSheet onStickerSelect={addSticker} />
      )}

      {/* Photo source selection modal - action sheet style */}
      {showPhotoSourceModal && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center"
          onClick={() => setShowPhotoSourceModal(false)}
        >
          <div
            className="bg-white w-full max-w-md rounded-t-2xl pb-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 space-y-2">
              <button
                onClick={handleCameraSelect}
                className="w-full py-4 text-center text-lg font-medium text-gray-800 hover:bg-gray-50 rounded-xl transition-colors"
              >
                사진 촬영
              </button>
              <button
                onClick={handleGallerySelect}
                className="w-full py-4 text-center text-lg font-medium text-gray-800 hover:bg-gray-50 rounded-xl transition-colors"
              >
                사진 보관함
              </button>
              <button
                onClick={handleFileSelect}
                className="w-full py-4 text-center text-lg font-medium text-gray-800 hover:bg-gray-50 rounded-xl transition-colors"
              >
                파일 보관함
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})
