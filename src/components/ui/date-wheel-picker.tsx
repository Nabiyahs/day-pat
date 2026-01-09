'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

/**
 * DateWheelPicker - A wheel/scroll-style date picker with Year/Month/Day columns.
 * Features smooth inertial scrolling with velocity tracking, friction, and snap-to-item.
 */

interface DateWheelPickerProps {
  value: string // YYYY-MM-DD format
  onChange: (date: string) => void
  disabled?: boolean
  minYear?: number
  maxYear?: number
}

// Get days in a specific month
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

// Generate year range
function generateYears(min: number, max: number): number[] {
  const years: number[] = []
  for (let y = min; y <= max; y++) {
    years.push(y)
  }
  return years
}

// Generate months (1-12)
function generateMonths(): number[] {
  return Array.from({ length: 12 }, (_, i) => i + 1)
}

// Generate days for a specific year/month
function generateDays(year: number, month: number): number[] {
  const daysCount = getDaysInMonth(year, month - 1)
  return Array.from({ length: daysCount }, (_, i) => i + 1)
}

// Physics constants for inertial scrolling
const FRICTION = 0.92 // Deceleration factor (0-1, higher = slower deceleration)
const MIN_VELOCITY = 0.5 // Stop animation when velocity drops below this
const SNAP_DURATION = 200 // Duration of snap animation in ms

// Wheel Column Component with Inertial Scrolling
interface WheelColumnProps {
  items: number[]
  value: number
  onChange: (value: number) => void
  disabled?: boolean
  formatValue?: (value: number) => string
}

function WheelColumn({
  items,
  value,
  onChange,
  disabled,
  formatValue = (v) => v.toString(),
}: WheelColumnProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const itemHeight = 36
  const visibleItems = 5
  const paddingItems = Math.floor(visibleItems / 2)

  // Tracking refs for inertial scrolling
  const isDragging = useRef(false)
  const startY = useRef(0)
  const startScrollTop = useRef(0)
  const lastY = useRef(0)
  const lastTime = useRef(0)
  const velocity = useRef(0)
  const animationFrame = useRef<number | null>(null)
  const isAnimating = useRef(false)

  // Cancel any ongoing animation
  const cancelAnimation = useCallback(() => {
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current)
      animationFrame.current = null
    }
    isAnimating.current = false
  }, [])

  // Snap to nearest item with smooth animation
  const snapToNearest = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const scrollTop = container.scrollTop
    const index = Math.round(scrollTop / itemHeight)
    const clampedIndex = Math.max(0, Math.min(items.length - 1, index))
    const targetScrollTop = clampedIndex * itemHeight

    // Animate to target position
    const startPos = scrollTop
    const distance = targetScrollTop - startPos
    const startTime = performance.now()

    const animateSnap = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / SNAP_DURATION, 1)

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const newScrollTop = startPos + distance * eased

      container.scrollTop = newScrollTop

      if (progress < 1) {
        animationFrame.current = requestAnimationFrame(animateSnap)
      } else {
        container.scrollTop = targetScrollTop
        isAnimating.current = false
        animationFrame.current = null

        // Update value after snap completes
        const newValue = items[clampedIndex]
        if (newValue !== undefined && newValue !== value) {
          onChange(newValue)
        }
      }
    }

    isAnimating.current = true
    animationFrame.current = requestAnimationFrame(animateSnap)
  }, [items, value, onChange, itemHeight])

  // Inertial scrolling animation
  const animateInertia = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const animate = () => {
      velocity.current *= FRICTION

      if (Math.abs(velocity.current) < MIN_VELOCITY) {
        cancelAnimation()
        snapToNearest()
        return
      }

      const newScrollTop = container.scrollTop - velocity.current
      const maxScrollTop = (items.length - 1) * itemHeight

      // Bounce at boundaries
      if (newScrollTop < 0) {
        container.scrollTop = 0
        velocity.current = 0
        cancelAnimation()
        snapToNearest()
        return
      }
      if (newScrollTop > maxScrollTop) {
        container.scrollTop = maxScrollTop
        velocity.current = 0
        cancelAnimation()
        snapToNearest()
        return
      }

      container.scrollTop = newScrollTop
      animationFrame.current = requestAnimationFrame(animate)
    }

    isAnimating.current = true
    animationFrame.current = requestAnimationFrame(animate)
  }, [items, cancelAnimation, snapToNearest, itemHeight])

  // Scroll to the selected value (external change)
  const scrollToValue = useCallback((val: number, smooth = false) => {
    const container = containerRef.current
    if (!container || isAnimating.current) return

    const index = items.indexOf(val)
    if (index === -1) return

    const targetScrollTop = index * itemHeight

    if (smooth) {
      cancelAnimation()
      const startPos = container.scrollTop
      const distance = targetScrollTop - startPos
      const startTime = performance.now()

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / SNAP_DURATION, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        container.scrollTop = startPos + distance * eased

        if (progress < 1) {
          animationFrame.current = requestAnimationFrame(animate)
        } else {
          container.scrollTop = targetScrollTop
          isAnimating.current = false
          animationFrame.current = null
        }
      }

      isAnimating.current = true
      animationFrame.current = requestAnimationFrame(animate)
    } else {
      container.scrollTop = targetScrollTop
    }
  }, [items, itemHeight, cancelAnimation])

  // Initial scroll on mount
  useEffect(() => {
    scrollToValue(value, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Scroll when value changes externally
  useEffect(() => {
    if (!isDragging.current && !isAnimating.current) {
      scrollToValue(value, true)
    }
  }, [value, scrollToValue])

  // Touch/Mouse event handlers
  const handleDragStart = useCallback((clientY: number) => {
    if (disabled) return

    cancelAnimation()
    isDragging.current = true
    startY.current = clientY
    startScrollTop.current = containerRef.current?.scrollTop || 0
    lastY.current = clientY
    lastTime.current = performance.now()
    velocity.current = 0
  }, [disabled, cancelAnimation])

  const handleDragMove = useCallback((clientY: number) => {
    if (!isDragging.current || disabled) return

    const container = containerRef.current
    if (!container) return

    const deltaY = startY.current - clientY
    container.scrollTop = startScrollTop.current + deltaY

    // Calculate velocity
    const now = performance.now()
    const dt = now - lastTime.current
    if (dt > 0) {
      velocity.current = (lastY.current - clientY) / dt * 16 // Normalize to ~60fps
    }

    lastY.current = clientY
    lastTime.current = now
  }, [disabled])

  const handleDragEnd = useCallback(() => {
    if (!isDragging.current) return
    isDragging.current = false

    // Start inertial animation if velocity is high enough
    if (Math.abs(velocity.current) > MIN_VELOCITY) {
      animateInertia()
    } else {
      snapToNearest()
    }
  }, [animateInertia, snapToNearest])

  // Mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    handleDragStart(e.clientY)
  }, [handleDragStart])

  // Touch events
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientY)
  }, [handleDragStart])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    handleDragMove(e.touches[0].clientY)
  }, [handleDragMove])

  // Global mouse move/up handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientY)
    }

    const handleMouseUp = () => {
      handleDragEnd()
    }

    if (isDragging.current) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleDragMove, handleDragEnd])

  // Mouse wheel handler
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (disabled) return
    e.preventDefault()

    cancelAnimation()

    const container = containerRef.current
    if (!container) return

    // Add wheel delta to velocity (accumulative for smooth wheel scrolling)
    velocity.current += e.deltaY * 0.3

    // Start animation if not already animating
    if (!isAnimating.current) {
      animateInertia()
    }
  }, [disabled, cancelAnimation, animateInertia])

  // Click on item
  const handleItemClick = useCallback((item: number) => {
    if (disabled || isDragging.current) return
    cancelAnimation()
    onChange(item)
  }, [disabled, onChange, cancelAnimation])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimation()
    }
  }, [cancelAnimation])

  return (
    <div className="relative flex-1">
      {/* Highlight center row */}
      <div
        className="absolute left-0 right-0 bg-gray-100 rounded-lg pointer-events-none z-0"
        style={{
          top: paddingItems * itemHeight,
          height: itemHeight,
        }}
      />

      {/* Scroll container */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleDragEnd}
        onWheel={handleWheel}
        className={cn(
          'overflow-hidden relative z-10 select-none cursor-grab active:cursor-grabbing',
          disabled && 'opacity-50 pointer-events-none'
        )}
        style={{
          height: visibleItems * itemHeight,
          touchAction: 'none',
        }}
      >
        {/* Top padding */}
        <div style={{ height: paddingItems * itemHeight }} />

        {/* Items */}
        {items.map((item) => (
          <div
            key={item}
            onClick={() => handleItemClick(item)}
            className={cn(
              'flex items-center justify-center transition-colors',
              'text-sm font-medium',
              item === value ? 'text-gray-900' : 'text-gray-400'
            )}
            style={{
              height: itemHeight,
            }}
          >
            {formatValue(item)}
          </div>
        ))}

        {/* Bottom padding */}
        <div style={{ height: paddingItems * itemHeight }} />
      </div>
    </div>
  )
}

export function DateWheelPicker({
  value,
  onChange,
  disabled = false,
  minYear = 2020,
  maxYear = 2035,
}: DateWheelPickerProps) {
  // Parse current value
  const parseDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1, // 1-12
      day: date.getDate(),
    }
  }, [])

  const { year, month, day } = parseDate(value)

  // Generate column data
  const years = generateYears(minYear, maxYear)
  const months = generateMonths()
  const days = generateDays(year, month)

  // Update date with validation
  const updateDate = useCallback(
    (newYear: number, newMonth: number, newDay: number) => {
      // Clamp day to valid range for the new year/month
      const maxDay = getDaysInMonth(newYear, newMonth - 1)
      const clampedDay = Math.min(newDay, maxDay)

      // Format as YYYY-MM-DD
      const dateStr = `${newYear}-${String(newMonth).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`
      onChange(dateStr)
    },
    [onChange]
  )

  return (
    <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-2">
      {/* Year column */}
      <WheelColumn
        items={years}
        value={year}
        onChange={(newYear) => updateDate(newYear, month, day)}
        disabled={disabled}
      />

      <div className="flex items-center text-gray-300 text-sm">/</div>

      {/* Month column */}
      <WheelColumn
        items={months}
        value={month}
        onChange={(newMonth) => updateDate(year, newMonth, day)}
        disabled={disabled}
      />

      <div className="flex items-center text-gray-300 text-sm">/</div>

      {/* Day column */}
      <WheelColumn
        items={days}
        value={day}
        onChange={(newDay) => updateDate(year, month, newDay)}
        disabled={disabled}
      />
    </div>
  )
}

// ============================================================
// DATE RANGE PICKER (Two separate From/To boxes)
// ============================================================

interface DateRangePickerProps {
  fromDate: string // YYYY-MM-DD
  toDate: string // YYYY-MM-DD
  onFromChange: (date: string) => void
  onToChange: (date: string) => void
  disabled?: boolean
  minYear?: number
  maxYear?: number
}

/**
 * DateRangePicker - Two separate From/To date selection boxes.
 * Each box shows the date and expands to show the wheel picker when clicked.
 */
export function DateRangePicker({
  fromDate,
  toDate,
  onFromChange,
  onToChange,
  disabled = false,
  minYear = 2020,
  maxYear = 2035,
}: DateRangePickerProps) {
  const [activeBox, setActiveBox] = useState<'from' | 'to' | null>(null)

  // Handle date change with auto-correction for invalid ranges
  const handleFromChange = useCallback(
    (newDate: string) => {
      // If from > to, adjust to = from
      if (newDate > toDate) {
        onFromChange(newDate)
        onToChange(newDate)
      } else {
        onFromChange(newDate)
      }
    },
    [toDate, onFromChange, onToChange]
  )

  const handleToChange = useCallback(
    (newDate: string) => {
      // If to < from, adjust from = to
      if (newDate < fromDate) {
        onFromChange(newDate)
        onToChange(newDate)
      } else {
        onToChange(newDate)
      }
    },
    [fromDate, onFromChange, onToChange]
  )

  // Format date for display (YYYY/M/D)
  const formatDateDisplay = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00')
    return format(date, 'yyyy/M/d')
  }

  return (
    <div className="space-y-3">
      {/* From Date Box */}
      <div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setActiveBox(activeBox === 'from' ? null : 'from')}
          className={cn(
            'w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between',
            activeBox === 'from'
              ? 'border-[#F27430] bg-orange-50'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          )}
        >
          <span className="text-sm text-gray-500">From</span>
          <span className="font-medium text-gray-800">{formatDateDisplay(fromDate)}</span>
        </button>

        {activeBox === 'from' && (
          <div className="mt-2">
            <DateWheelPicker
              value={fromDate}
              onChange={handleFromChange}
              disabled={disabled}
              minYear={minYear}
              maxYear={maxYear}
            />
          </div>
        )}
      </div>

      {/* To Date Box */}
      <div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setActiveBox(activeBox === 'to' ? null : 'to')}
          className={cn(
            'w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between',
            activeBox === 'to'
              ? 'border-[#F27430] bg-orange-50'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          )}
        >
          <span className="text-sm text-gray-500">To</span>
          <span className="font-medium text-gray-800">{formatDateDisplay(toDate)}</span>
        </button>

        {activeBox === 'to' && (
          <div className="mt-2">
            <DateWheelPicker
              value={toDate}
              onChange={handleToChange}
              disabled={disabled}
              minYear={minYear}
              maxYear={maxYear}
            />
          </div>
        )}
      </div>
    </div>
  )
}
