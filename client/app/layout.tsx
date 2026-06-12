import React from "react"
import type { Metadata, Viewport } from 'next'
import { Inter, Space_Mono } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider } from '@/components/auth-provider'
import { LanguageProvider } from '@/components/language-provider'

import './globals.css'

const _inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const _spaceMono = Space_Mono({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-space-mono' })

export const metadata: Metadata = {
  title: 'EthioHelperAI - Your Ethiopian Services Assistant',
  description:
    'AI-powered platform helping the Ethiopian community get accurate information about government services, education, health, jobs, and business processes.',
  keywords: [
    'EthioHelp',
    'EthioHelper',
    'EthioHelperAI',
    'Ethiopian government services',
    'Ethiopian passport application',
    'Ethiopian national ID',
    'Ethiopia business registration',
    'Ethiopia visa requirements',
    'Ethiopian education guide',
    'Ethiopian health services',
    'Ethiopian jobs',
    'Ethiopia RAG AI assistant'
  ],
  authors: [{ name: 'EthioHelper Team' }],
  metadataBase: new URL('https://ethiohelp.vercel.app'),
  openGraph: {
    title: 'EthioHelperAI - Ethiopian Services Assistant',
    description: 'AI-powered guide for government, health, education, and business processes in Ethiopia.',
    url: 'https://ethiohelp.vercel.app',
    siteName: 'EthioHelperAI',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EthioHelperAI - Ethiopian Services Assistant',
    description: 'AI-powered guide for government, health, education, and business processes in Ethiopia.',
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon.png', type: 'image/png', sizes: '32x32' },
      { url: '/web-app-manifest-192x192.png', type: 'image/png', sizes: '192x192' },
      { url: '/web-app-manifest-512x512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export const viewport: Viewport = {
  themeColor: '#efefef',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased min-h-screen bg-background text-foreground overflow-x-hidden">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <LanguageProvider>
              {children}
            </LanguageProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
