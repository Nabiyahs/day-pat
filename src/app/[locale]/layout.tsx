import type { Metadata } from 'next'
import { i18n, isValidLocale, type Locale, appTitles } from '@/lib/i18n/config'
import { ClientProviders } from '@/components/providers/client-providers'

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export async function generateStaticParams() {
  return i18n.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: localeParam } = await params
  const locale: Locale = isValidLocale(localeParam) ? localeParam : i18n.defaultLocale
  const title = appTitles[locale]
  const description = locale === 'ko'
    ? '매일의 작은 칭찬을 기록하는 폴라로이드 일기'
    : 'Your daily praise journal with polaroid memories'

  return {
    title: {
      default: title,
      template: `%s | ${title}`,
    },
    description,
    keywords: ['praise', 'journal', 'diary', 'polaroid', 'self-care', 'gratitude', 'streak'],
    authors: [{ name: title }],
    openGraph: {
      title,
      description,
      type: 'website',
    },
  }
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale: localeParam } = await params
  const locale: Locale = isValidLocale(localeParam) ? localeParam : i18n.defaultLocale

  return (
    <html lang={locale}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Nanum+Pen+Script&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  )
}
