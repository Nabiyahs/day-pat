import { Locale, i18n, appTitles } from './config'

// Type-safe dictionary structure
export type Dictionary = typeof import('./dictionaries/en.json')

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  ko: () => import('./dictionaries/ko.json').then((mod) => mod.default),
  en: () => import('./dictionaries/en.json').then((mod) => mod.default),
}

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]()
}

// Synchronous dictionary loading for client components
import koDict from './dictionaries/ko.json'
import enDict from './dictionaries/en.json'

const dictionariesSync: Record<Locale, Dictionary> = {
  ko: koDict as Dictionary,
  en: enDict as Dictionary,
}

export function getDictionarySync(locale: Locale): Dictionary {
  return dictionariesSync[locale]
}

// Helper to build locale-aware paths
export function localePath(locale: Locale, path: string): string {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `/${locale}${normalizedPath}`
}

// Get app title for locale
export function getAppTitle(locale: Locale): string {
  return appTitles[locale]
}

// Cookie name for locale preference
export const LOCALE_COOKIE = 'locale'

// Helper to get locale from cookie value
export function getLocaleFromCookie(cookieValue: string | undefined): Locale {
  if (cookieValue && i18n.locales.includes(cookieValue as Locale)) {
    return cookieValue as Locale
  }
  return i18n.defaultLocale
}

// =============================================
// Date formatting utilities
// =============================================

/**
 * Format date for day view header
 * KR: "1월 7일"
 * EN: "Jan 7"
 */
export function formatDateDisplay(date: Date, locale: Locale): string {
  const dict = getDictionarySync(locale)
  const month = dict.date.months[date.getMonth()]
  const day = date.getDate()

  if (locale === 'ko') {
    return `${month} ${day}일`
  }
  return `${month} ${day}`
}

/**
 * Format weekday and year for day view subheader
 * KR: "수요일, 2026"
 * EN: "Wed, 2026"
 */
export function formatWeekdayYear(date: Date, locale: Locale): string {
  const dict = getDictionarySync(locale)
  const year = date.getFullYear()

  if (locale === 'ko') {
    const weekday = dict.date.weekdays[date.getDay()]
    return `${weekday}, ${year}`
  }
  // EN uses short weekday names
  const weekdayShort = dict.date.weekdaysShort[date.getDay()]
  return `${weekdayShort}, ${year}`
}

/**
 * Get month name by locale
 */
export function getMonthName(monthIndex: number, locale: Locale): string {
  const dict = getDictionarySync(locale)
  return dict.date.months[monthIndex]
}

/**
 * Get weekday name by locale (full name)
 */
export function getWeekdayName(dayIndex: number, locale: Locale): string {
  const dict = getDictionarySync(locale)
  return dict.date.weekdays[dayIndex]
}

/**
 * Get weekday name by locale (short name)
 */
export function getWeekdayShort(dayIndex: number, locale: Locale): string {
  const dict = getDictionarySync(locale)
  return dict.date.weekdaysShort[dayIndex]
}

// Default app start date: 2025-01-01
export const DEFAULT_START_DATE = '2025-01-01'

export { i18n, appTitles, type Locale, isValidLocale } from './config'
