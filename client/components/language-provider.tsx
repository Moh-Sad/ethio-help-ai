'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import en from '@/locales/en.json'
import am from '@/locales/am.json'
import ar from '@/locales/ar.json'

export type Language = 'en' | 'am' | 'ar'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
  isRTL: boolean
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const translations: Record<Language, Record<string, string>> = {
  en: en as Record<string, string>,
  am: am as Record<string, string>,
  ar: ar as Record<string, string>,
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en')
  const [mounted, setMounted] = useState(false)

  // Load saved language on mount
  useEffect(() => {
    const saved = localStorage.getItem('ethiohelp-language') as Language | null
    if (saved && ['en', 'am', 'ar'].includes(saved)) {
      setLanguageState(saved)
    }
    setMounted(true)
  }, [])

  // Persist language & set document direction
  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('ethiohelp-language', lang)
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
  }, [])

  // Set dir on mount
  useEffect(() => {
    if (mounted) {
      document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
      document.documentElement.lang = language
    }
  }, [language, mounted])

  const t = useCallback(
    (key: string): string => {
      return translations[language]?.[key] || translations.en[key] || key
    },
    [language]
  )

  const isRTL = language === 'ar'

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
