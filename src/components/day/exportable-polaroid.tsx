'use client'

import { forwardRef } from 'react'
import type { StickerState } from '@/types/database'

/**
 * Data required for export rendering.
 * All images must be pre-converted to data URLs or blob URLs.
 */
export interface ExportData {
  /** Photo as data URL (not remote URL) */
  photoDataUrl: string | null
  /** Stamp image as data URL */
  stampDataUrl: string | null
  /** Caption/praise text */
  praise: string | null
  /** Stickers with their image data URLs pre-loaded */
  stickers: Array<StickerState & { dataUrl?: string }>
  /** Whether to show the stamp */
  showStamp: boolean
  /** Created at timestamp */
  createdAt: string | null
}

interface ExportablePolaroidProps {
  data: ExportData
}

/**
 * Static, export-only polaroid component.
 *
 * This component renders a clean, static version of the polaroid card
 * specifically designed for image capture. It:
 * - Uses only data URLs (no remote images)
 * - Has no animations, lazy loading, or dynamic elements
 * - Renders all elements in the same DOM subtree
 * - Uses inline styles for reliable capture
 */
export const ExportablePolaroid = forwardRef<HTMLDivElement, ExportablePolaroidProps>(
  function ExportablePolaroid({ data }, ref) {
    const { photoDataUrl, stampDataUrl, praise, stickers, showStamp, createdAt } = data

    const formattedTime = createdAt
      ? new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : ''

    return (
      <div
        ref={ref}
        style={{
          width: '340px',
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          transform: 'rotate(-1deg)',
          fontFamily: "'Inter', 'Noto Sans KR', system-ui, sans-serif",
        }}
      >
        {/* Photo area */}
        <div
          style={{
            backgroundColor: '#f3f4f6',
            borderRadius: '12px',
            overflow: 'hidden',
            marginBottom: '12px',
            position: 'relative',
            width: '100%',
            height: '280px',
          }}
        >
          {/* Photo */}
          {photoDataUrl && (
            <img
              src={photoDataUrl}
              alt="Day photo"
              style={{
                width: '100%',
                height: '280px',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          )}

          {/* Stickers overlay */}
          {stickers.map((sticker, index) => {
            const isImageSticker = sticker.src.startsWith('/')
            return (
              <div
                key={sticker.id || index}
                style={{
                  position: 'absolute',
                  left: `${sticker.x * 100}%`,
                  top: `${sticker.y * 100}%`,
                  transform: `translate(-50%, -50%) scale(${sticker.scale}) rotate(${sticker.rotation}deg)`,
                  zIndex: 10 + index,
                  filter: 'drop-shadow(0 4px 3px rgb(0 0 0 / 0.07)) drop-shadow(0 2px 2px rgb(0 0 0 / 0.06))',
                }}
              >
                {isImageSticker ? (
                  <img
                    src={sticker.dataUrl || sticker.src}
                    alt="sticker"
                    style={{
                      width: '80px',
                      height: '80px',
                      objectFit: 'contain',
                      pointerEvents: 'none',
                    }}
                  />
                ) : (
                  <span style={{ fontSize: '30px', lineHeight: 1 }}>{sticker.src}</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Caption */}
        <div style={{ padding: '0 8px' }}>
          <p
            style={{
              textAlign: 'center',
              fontWeight: 500,
              lineHeight: 1.625,
              marginBottom: '12px',
              minHeight: '24px',
              color: praise ? '#374151' : '#9ca3af',
              fontSize: '16px',
            }}
          >
            {praise || 'Give your day a pat.'}
          </p>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: '#9ca3af',
            }}
          >
            <span>{formattedTime}</span>
            <span></span>
          </div>
        </div>

        {/* Stamp overlay */}
        {showStamp && stampDataUrl && (
          <div
            style={{
              position: 'absolute',
              bottom: '48px',
              right: '16px',
              zIndex: 30,
              pointerEvents: 'none',
            }}
          >
            <img
              src={stampDataUrl}
              alt="Compliment seal"
              style={{
                width: '88px',
                height: '88px',
                objectFit: 'contain',
                borderRadius: '50%',
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
              }}
            />
          </div>
        )}
      </div>
    )
  }
)
