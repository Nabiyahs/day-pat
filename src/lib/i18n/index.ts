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

export { i18n, appTitles, type Locale, isValidLocale } from './config'
