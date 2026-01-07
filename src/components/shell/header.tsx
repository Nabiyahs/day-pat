'use client'

import Image from 'next/image'
import { AppIcon } from '@/components/ui/app-icon'
import { useRouter, usePathname } from 'next/navigation'
import { type Locale } from '@/lib/i18n/config'

interface HeaderProps {
  locale: Locale
}

export function Header({ locale }: HeaderProps) {
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
      {/* Spacer for centering */}
      <div className="w-11" />

      {/* Centered logo */}
      <Image
        src="/logo.jpg"
        alt="DayPat"
        width={100}
        height={32}
        className="h-8 w-auto object-contain"
        priority
      />

      {/* Language Toggle */}
      <button
        onClick={toggleLocale}
        className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-amber-50 transition-colors"
        aria-label="Change language"
        title={locale === 'ko' ? 'Switch to English' : '한국어로 변경'}
        data-testid="btn-lang-toggle"
      >
        <AppIcon name="globe" className="w-5 h-5 text-[#F27430]" />
      </button>
    </div>
  )
}
