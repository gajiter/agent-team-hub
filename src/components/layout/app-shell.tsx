'use client'

import { ProjectProvider } from '@/hooks/use-project'
import { LNB } from '@/components/layout/lnb'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ProjectProvider>
      <LNB />
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </ProjectProvider>
  )
}
