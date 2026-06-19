'use client'

import { usePathname } from 'next/navigation'
import { ProjectProvider } from '@/hooks/use-project'
import { I18nProvider } from '@/lib/i18n'
import { LNB } from '@/components/layout/lnb'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'

  if (isLoginPage) {
    return (
      <I18nProvider>
        {children}
      </I18nProvider>
    )
  }

  return (
    <I18nProvider>
      <ProjectProvider>
        <LNB />
        <main className="flex-1 flex flex-col overflow-hidden">
          {children}
        </main>
      </ProjectProvider>
    </I18nProvider>
  )
}
