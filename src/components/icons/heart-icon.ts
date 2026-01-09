/**
 * DayPat Heart Icon - Single Source of Truth
 *
 * This module provides the heart icon path data used throughout the app.
 * Both Day View (via FontAwesome) and Canvas exports use this same source
 * to ensure 100% visual consistency.
 *
 * Source: @fortawesome/free-solid-svg-icons faHeart (v7.1.0)
 * ViewBox: 512x512
 */

// Font Awesome Solid Heart SVG path data
// Extracted from: faHeart.icon[4] (@fortawesome/free-solid-svg-icons@7.1.0)
export const HEART_PATH_D =
  'M241 87.1l15 20.7 15-20.7C296 52.5 336.2 32 378.9 32 452.4 32 512 91.6 512 165.1l0 2.6c0 112.2-139.9 242.5-212.9 298.2-12.4 9.4-27.6 14.1-43.1 14.1s-30.8-4.6-43.1-14.1C139.9 410.2 0 279.9 0 167.7l0-2.6C0 91.6 59.6 32 133.1 32 175.8 32 216 52.5 241 87.1z'

// ViewBox dimensions (Font Awesome standard)
export const HEART_VIEWBOX = 512

// Colors from Day View (Tailwind CSS values)
export const HEART_COLOR_LIKED = '#ef4444' // text-red-500
export const HEART_COLOR_DEFAULT = '#9ca3af' // text-gray-400

/**
 * Get heart color based on liked state
 */
export function getHeartColor(isLiked: boolean): string {
  return isLiked ? HEART_COLOR_LIKED : HEART_COLOR_DEFAULT
}

/**
 * Draw heart icon on canvas context.
 * Uses the exact same SVG path as Day View's AppIcon component.
 *
 * @param ctx - Canvas 2D rendering context
 * @param centerX - Center X position
 * @param centerY - Center Y position
 * @param size - Icon size (width & height)
 * @param isLiked - Whether the heart is in "liked" state
 */
export function drawHeartIcon(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  size: number,
  isLiked: boolean
): void {
  ctx.save()

  // Scale factor to convert from 512x512 viewbox to target size
  const scale = size / HEART_VIEWBOX

  // Position at center, offset to draw from top-left of scaled icon
  ctx.translate(centerX - size / 2, centerY - size / 2)
  ctx.scale(scale, scale)

  // Create path from Font Awesome SVG path data
  const path = new Path2D(HEART_PATH_D)

  // Fill with appropriate color (Day View always shows filled heart)
  ctx.fillStyle = getHeartColor(isLiked)
  ctx.fill(path)

  ctx.restore()
}
