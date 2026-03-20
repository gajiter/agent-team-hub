'use client'

import { ProjectProvider } from '@/hooks/use-project'
import { I18nProvider } from '@/lib/i18n'
import { LNB } from '@/components/layout/lnb'

export function AppShell({ children }: { children: React.ReactNode }) {
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
