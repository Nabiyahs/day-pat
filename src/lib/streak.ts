import { formatDateString } from './utils'

/**
 * Compute streak ending at anchor date
 * A day counts as "success" if it has an entry for that date
 * Streak revives when users backfill missing dates
 *
 * @param entryDates - Set of date strings in YYYY-MM-DD format
 * @param anchorDate - Date to start counting backwards from (default: today)
 * @returns The number of consecutive days with entries ending at anchorDate
 */
export function computeStreak(
  entryDates: Set<string>,
  anchorDate: Date = new Date()
): number {
  let streak = 0
  const current = new Date(anchorDate)

  // Start from anchor date and go backwards
  while (true) {
    const dateStr = formatDateString(current)

    if (entryDates.has(dateStr)) {
      streak++
      current.setDate(current.getDate() - 1)
    } else {
      break
    }
  }

  return streak
}

/**
 * Compute current streak from an array of entry objects.
 * Starts from the MOST RECENT entry date and counts consecutive days backwards.
 *
 * Example: entries on [Jan 10, Jan 9, Jan 8, Jan 5] → streak = 3 (Jan 8-10)
 *
 * @param entries - Array of objects with entry_date field (YYYY-MM-DD format)
 * @returns The number of consecutive days ending at the most recent entry
 */
export function computeStreakFromEntries(
  entries: Array<{ entry_date: string }>
): number {
  if (entries.length === 0) return 0

  const entryDates = new Set(entries.map((e) => e.entry_date))

  // Find the most recent entry date
  const sortedDates = Array.from(entryDates).sort().reverse()
  const mostRecentDateStr = sortedDates[0]

  // Parse most recent date and start counting from there
  const [year, month, day] = mostRecentDateStr.split('-').map(Number)
  const anchorDate = new Date(year, month - 1, day)

  return computeStreak(entryDates, anchorDate)
}

/**
 * Get all unique entry dates from a list of entries
 */
export function getEntryDatesSet(
  entries: Array<{ entry_date: string }>
): Set<string> {
  return new Set(entries.map((e) => e.entry_date))
}

/**
 * Calculate streak info for display
 */
export interface StreakInfo {
  currentStreak: number // streak ending today
  selectedStreak: number // streak ending at selected date
}

export function getStreakInfo(
  entryDates: Set<string>,
  selectedDate: Date
): StreakInfo {
  const today = new Date()
  return {
    currentStreak: computeStreak(entryDates, today),
    selectedStreak: computeStreak(entryDates, selectedDate),
  }
}
