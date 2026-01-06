'use client'

import { AppIcon } from '@/components/ui/app-icon'
import { useRouter, usePathname } from 'next/navigation'
import { type Locale, appTitles } from '@/lib/i18n/config'

interface HeaderProps {
  locale: Locale
  onMenuClick: () => void
  onAddClick?: () => void
}

export function Header({ locale, onMenuClick, onAddClick }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()

  const toggleLocale = () => {
    // Get the other locale
    const newLocale: Locale = locale === 'ko' ? 'en' : 'ko'

    // Replace the locale in the current path
    const pathWithoutLocale = pathname.replace(`/${locale}`, '')
    const newPath = `/${newLocale}${pathWithoutLocale || ''}`

    // Set cookie for persistence
    document.cookie = `locale=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}`

    router.push(newPath)
  }

  return (
    <div className="flex items-center justify-between px-5 py-4">
      <button
        onClick={onMenuClick}
        className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-amber-50 transition-colors"
        aria-label="Open menu"
      >
        <AppIcon name="menu" className="w-5 h-5 text-[#F27430]" />
      </button>

      <div className="flex items-center gap-2">
        <h1 className="text-lg font-bold text-gray-800">{appTitles[locale]}</h1>
      </div>

      <div className="flex items-center gap-1">
        {/* Language Toggle */}
        <button
          onClick={toggleLocale}
          className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-amber-50 transition-colors"
          aria-label="Change language"
          title={locale === 'ko' ? 'Switch to English' : '한국어로 변경'}
        >
          <span className="text-xs font-bold text-[#F27430]">
            {locale === 'ko' ? 'EN' : 'KO'}
          </span>
        </button>

        {/* Add Button */}
        <button
          onClick={onAddClick}
          className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-amber-50 transition-colors"
          aria-label="Add entry"
        >
          <AppIcon name="plus" className="w-5 h-5 text-[#F27430]" />
        </button>
      </div>
    </div>
  )
}
