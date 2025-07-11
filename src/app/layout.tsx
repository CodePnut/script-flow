import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import { Navbar } from '@/components/Navbar'
import { PageTransition } from '@/components/PageTransition'
import { ParticleBackground } from '@/components/ParticleBackground'
import { ThemeProvider } from '@/components/ThemeProvider'

import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'ScriptFlow - YouTube Video Transcription',
  description:
    'Convert any YouTube video into an interactive, searchable transcript with AI-powered summaries and chapter navigation.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-bg text-fg antialiased`}
      >
        <ThemeProvider defaultTheme="dark">
          <ParticleBackground />
          <div className="relative flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">
              <PageTransition>{children}</PageTransition>
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
