'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

export type Theme = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'light' | 'dark'
  mounted: boolean
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const STORAGE_KEY = 'theme'
const MEDIA = '(prefers-color-scheme: dark)'

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia(MEDIA).matches ? 'dark' : 'light'
}

function disableTransitions() {
  const style = document.createElement('style')
  style.appendChild(
    document.createTextNode(
      '*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}'
    )
  )
  document.head.appendChild(style)
  return () => {
    window.getComputedStyle(document.body)
    setTimeout(() => document.head.removeChild(style), 1)
  }
}

function applyTheme(resolved: 'light' | 'dark') {
  const d = document.documentElement
  d.classList.remove('light', 'dark')
  d.classList.add(resolved)
  d.style.colorScheme = resolved
}

export function ThemeProvider({
  children,
  defaultTheme = 'dark',
  disableTransitionOnChange = false,
}: {
  children: React.ReactNode
  defaultTheme?: Theme
  disableTransitionOnChange?: boolean
}) {
  // Always start with defaultTheme on server and client initial render
  const [theme, setThemeState] = useState<Theme>(defaultTheme)
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('dark')
  const [mounted, setMounted] = useState(false)

  const resolvedTheme = theme === 'system' ? systemTheme : theme

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    try {
      localStorage.setItem(STORAGE_KEY, newTheme)
    } catch {}
  }, [])

  // On mount: read localStorage and system theme (client-only)
  useEffect(() => {
    setSystemTheme(getSystemTheme())
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
      if (stored) setThemeState(stored)
    } catch {}
    setMounted(true)
  }, [])

  // Apply theme to DOM whenever resolvedTheme changes
  useEffect(() => {
    if (!mounted) return
    const restore = disableTransitionOnChange ? disableTransitions() : undefined
    applyTheme(resolvedTheme)
    restore?.()
  }, [resolvedTheme, mounted, disableTransitionOnChange])

  // Listen for system theme changes
  useEffect(() => {
    const mq = window.matchMedia(MEDIA)
    const handler = (e: MediaQueryListEvent) => setSystemTheme(e.matches ? 'dark' : 'light')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Cross-tab sync
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        setThemeState(e.newValue as Theme)
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  const value = useMemo(
    () => ({ theme, setTheme, resolvedTheme, mounted }),
    [theme, setTheme, resolvedTheme, mounted]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
