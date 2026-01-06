export const i18n = {
  defaultLocale: 'ko',
  locales: ['ko', 'en'],
} as const

export type Locale = (typeof i18n)['locales'][number]

export const localeNames: Record<Locale, string> = {
  ko: '한국어',
  en: 'English',
}

export const appTitles: Record<Locale, string> = {
  ko: '하루꾹',
  en: 'DayPat',
}

export function isValidLocale(locale: string): locale is Locale {
  return i18n.locales.includes(locale as Locale)
}
