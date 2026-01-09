'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'

/**
 * DateWheelPicker - A wheel/scroll-style date picker with Year/Month/Day columns.
 * Each column uses snap scrolling for a native wheel picker feel.
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

// Wheel Column Component
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

  // Scroll to the selected value
  const scrollToValue = useCallback((val: number, smooth = false) => {
    const container = containerRef.current
    if (!container) return

    const index = items.indexOf(val)
    if (index === -1) return

    const scrollTop = index * itemHeight
    container.scrollTo({
      top: scrollTop,
      behavior: smooth ? 'smooth' : 'auto',
    })
  }, [items, itemHeight])

  // Initial scroll on mount
  useEffect(() => {
    scrollToValue(value, false)
  }, [])

  // Scroll when value changes externally
  useEffect(() => {
    scrollToValue(value, true)
  }, [value, scrollToValue])

  // Handle scroll end - snap to nearest item
  const handleScroll = useCallback(() => {
    const container = containerRef.current
    if (!container || disabled) return

    // Debounce scroll handling
    const timeoutId = setTimeout(() => {
      const scrollTop = container.scrollTop
      const index = Math.round(scrollTop / itemHeight)
      const clampedIndex = Math.max(0, Math.min(items.length - 1, index))
      const newValue = items[clampedIndex]

      if (newValue !== value) {
        onChange(newValue)
      }

      // Snap to position
      container.scrollTo({
        top: clampedIndex * itemHeight,
        behavior: 'smooth',
      })
    }, 100)

    return () => clearTimeout(timeoutId)
  }, [items, value, onChange, disabled, itemHeight])

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
        onScroll={handleScroll}
        className={cn(
          'overflow-y-auto scrollbar-hide relative z-10',
          disabled && 'opacity-50 pointer-events-none'
        )}
        style={{
          height: visibleItems * itemHeight,
          scrollSnapType: 'y mandatory',
        }}
      >
        {/* Top padding */}
        <div style={{ height: paddingItems * itemHeight }} />

        {/* Items */}
        {items.map((item) => (
          <div
            key={item}
            onClick={() => !disabled && onChange(item)}
            className={cn(
              'flex items-center justify-center cursor-pointer transition-all',
              'text-sm font-medium',
              item === value ? 'text-gray-900' : 'text-gray-400'
            )}
            style={{
              height: itemHeight,
              scrollSnapAlign: 'start',
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
