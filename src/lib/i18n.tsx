'use client'
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import en from '@/locales/en.json'
import ko from '@/locales/ko.json'

type Messages = typeof en
type Locale = 'en' | 'ko'

const locales: Record<Locale, Messages> = { en, ko }

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'en',
  setLocale: () => {},
  t: (key) => key
})

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const result = path.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && acc !== null) {
      return (acc as Record<string, unknown>)[part]
    }
    return undefined
  }, obj)
  return typeof result === 'string' ? result : path
}

export function I18nProvider({ children, initialLocale = 'en' }: { children: ReactNode, initialLocale?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)

  useEffect(() => {
    const saved = localStorage.getItem('agent-team-hub:locale') as Locale
    if (saved && locales[saved]) setLocaleState(saved)
  }, [])

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem('agent-team-hub:locale', newLocale)
  }, [])

  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    let value = getNestedValue(locales[locale] as unknown as Record<string, unknown>, key)
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        value = value.replace(`{${k}}`, String(v))
      })
    }
    return value
  }, [locale])

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() { return useContext(I18nContext) }
export type { Locale }
