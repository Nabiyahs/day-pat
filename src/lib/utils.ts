import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format date to YYYY-MM-DD string (user local date)
// IMPORTANT: Uses local timezone, NOT UTC, to prevent date drift
export function formatDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Parse YYYY-MM-DD string to Date object
export function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// Get today's date as YYYY-MM-DD string
export function getTodayString(): string {
  return formatDateString(new Date())
}

// Check if two dates are the same day
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

// Get start and end dates for a month
export function getMonthRange(year: number, month: number): { start: string; end: string } {
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  return {
    start: formatDateString(start),
    end: formatDateString(end),
  }
}

// Get start and end dates for a week (Monday to Sunday)
export function getWeekRange(date: Date): { start: string; end: string } {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
  const monday = new Date(d.setDate(diff))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    start: formatDateString(monday),
    end: formatDateString(sunday),
  }
}

// Generate array of dates for a month calendar grid (includes padding days)
export function getCalendarDays(year: number, month: number): Date[] {
  const days: Date[] = []
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // Get the day of week for the first day (0 = Sunday, 1 = Monday, etc.)
  let startPadding = firstDay.getDay()

  // Add padding days from previous month
  for (let i = startPadding - 1; i >= 0; i--) {
    const d = new Date(year, month, -i)
    days.push(d)
  }

  // Add days of current month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i))
  }

  // Add padding days for next month to complete the grid
  const endPadding = 7 - (days.length % 7)
  if (endPadding < 7) {
    for (let i = 1; i <= endPadding; i++) {
      days.push(new Date(year, month + 1, i))
    }
  }

  return days
}

// Generate array of dates for a week (Monday to Sunday)
export function getWeekDays(date: Date): Date[] {
  const days: Date[] = []
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday

  for (let i = 0; i < 7; i++) {
    const weekDay = new Date(d)
    weekDay.setDate(diff + i)
    days.push(weekDay)
  }

  return days
}
