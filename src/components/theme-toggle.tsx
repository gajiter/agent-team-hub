'use client'

import { useTheme, type Theme } from '@/components/theme-provider'
import { Moon, Sun, Monitor, Check } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n'

const THEME_OPTIONS = [
  { value: 'light', i18nKey: 'settings.light', icon: Sun },
  { value: 'dark', i18nKey: 'settings.dark', icon: Moon },
  { value: 'system', i18nKey: 'settings.system', icon: Monitor },
] as const

export function ThemeToggle() {
  const { theme, setTheme, mounted } = useTheme()
  const { t } = useI18n()

  // Use defaultTheme (dark) icon on server to match SSR, then real theme after mount
  const displayTheme = mounted ? theme : 'dark'
  const current = THEME_OPTIONS.find((o) => o.value === displayTheme) ?? THEME_OPTIONS[1]
  const CurrentIcon = current.icon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <CurrentIcon className="h-4 w-4" />
          <span className="sr-only">{t('meta.toggleTheme')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {THEME_OPTIONS.map(({ value, i18nKey, icon: Icon }) => (
          <DropdownMenuItem key={value} onClick={() => setTheme(value as Theme)}>
            <Icon className="mr-2 h-4 w-4" />
            {t(i18nKey)}
            {theme === value && <Check className="ml-auto h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
