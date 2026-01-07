import type { Metadata } from 'next'
import { ClientProviders } from '@/components/providers/client-providers'

export async function generateStaticParams() {
  return [{ locale: 'en' }]
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: {
      default: 'DayPat',
      template: '%s | DayPat',
    },
    description: 'Your daily praise journal with polaroid memories',
    keywords: ['praise', 'journal', 'diary', 'polaroid', 'self-care', 'gratitude', 'streak'],
    authors: [{ name: 'DayPat' }],
    openGraph: {
      title: 'DayPat',
      description: 'Your daily praise journal with polaroid memories',
      type: 'website',
    },
  }
}

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function LocaleLayout({ children }: Props) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=Inter:wght@300;400;500;600;700&family=Noto+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased font-sans" style={{ fontFamily: "'Noto Sans', 'Inter', sans-serif" }}>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  )
}
