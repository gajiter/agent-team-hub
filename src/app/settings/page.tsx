'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTheme } from 'next-themes'
import { Topbar } from '@/components/layout/topbar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useProject } from '@/hooks/use-project'
import { useI18n, type Locale } from '@/lib/i18n'
import ProjectList from '@/components/settings/project-list'
import AddProjectDialog from '@/components/settings/add-project-dialog'
import type { Project } from '@/types/project'
import { settingsService } from '@/lib/services/settings-service'
import { projectService } from '@/lib/services/project-service'
import { initService } from '@/lib/services/init-service'

export default function SettingsPage() {
  const { projects, currentProject, setCurrentProject, refreshProjects } = useProject()
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const { t, locale, setLocale } = useI18n()

  const { theme, setTheme: setNextTheme } = useTheme()

  // Settings state
  const [language, setLanguage] = useState<string>(locale)
  const [port, setPort] = useState(3000)
  const [settingsLoading, setSettingsLoading] = useState(true)

  // Load settings
  useEffect(() => {
    settingsService.getSettings()
      .then(data => {
        if (data.language) setLanguage(data.language)
        if (data.port) setPort(data.port)
      })
      .catch(() => {})
      .finally(() => setSettingsLoading(false))
  }, [])

  // Sync language state with locale from i18n
  useEffect(() => {
    setLanguage(locale)
  }, [locale])

  // Save settings
  const saveSettings = useCallback(async (updates: Record<string, unknown>) => {
    try {
      await settingsService.updateSettings(updates)
    } catch {
      // ignore
    }
  }, [])

  const handleThemeChange = (newTheme: string) => {
    setNextTheme(newTheme)
    saveSettings({ theme: newTheme })
  }

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang)
    setLocale(newLang as Locale)
    saveSettings({ language: newLang })
  }

  const handlePortChange = (newPort: number) => {
    setPort(newPort)
    saveSettings({ port: newPort })
  }

  const handleAddProject = async (data: { name: string; path: string; initialize: boolean }) => {
    try {
      const project = await projectService.addProject(data.name, data.path)

      if (data.initialize && project) {
        try {
          await initService.init(project.id)
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : t('settings.unknownError')
          alert(`${t('settings.addedButInitFailed')}: ${message}`)
        }
      }

      await refreshProjects()
    } catch {
      alert(t('settings.addFailed'))
    }
  }

  const handleOpenProject = (project: Project) => {
    setCurrentProject(project)
  }

  const handleInitializeProject = async (project: Project): Promise<boolean> => {
    try {
      await initService.init(project.id)
      return true
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('settings.unknownError')
      alert(`${t('settings.initFailed')}: ${message}`)
      return false
    }
  }

  const handleRemoveProject = async (project: Project) => {
    await projectService.deleteProject(project.id)
    await refreshProjects()
  }

  return (
    <>
      <Topbar title={t('settings.title')} />
      <ScrollArea className="flex-1">
        <div className="p-6 max-w-4xl space-y-6">
          {/* Projects section */}
          <Card>
            <CardHeader className="border-b border-border/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t('settings.projectManagement')}</CardTitle>
                <Button size="sm" onClick={() => setAddDialogOpen(true)}>
                  + {t('settings.addProject')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <ProjectList
                projects={projects}
                currentProjectId={currentProject?.id ?? null}
                onOpen={handleOpenProject}
                onInitialize={handleInitializeProject}
                onRemove={handleRemoveProject}
              />
            </CardContent>
          </Card>

          {/* Settings section */}
          <Card>
            <CardHeader className="border-b border-border/50">
              <CardTitle className="text-base">{t('settings.appSettings')}</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-6">
              {settingsLoading ? (
                <div className="text-sm text-muted-foreground py-4 text-center">{t('settings.settingsLoading')}</div>
              ) : (
                <>
                  {/* Theme */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-foreground">{t('settings.theme')}</div>
                      <div className="text-xs text-muted-foreground">{t('settings.themeDescription')}</div>
                    </div>
                    <Select value={theme} onValueChange={handleThemeChange}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">{t('settings.light')}</SelectItem>
                        <SelectItem value="dark">{t('settings.dark')}</SelectItem>
                        <SelectItem value="system">{t('settings.system')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Language */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-foreground">{t('settings.language')}</div>
                      <div className="text-xs text-muted-foreground">{t('settings.languageDescription')}</div>
                    </div>
                    <Select value={language} onValueChange={handleLanguageChange}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ko">한국어</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Port */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-foreground">{t('settings.port')}</div>
                      <div className="text-xs text-muted-foreground">{t('settings.portDescription')}</div>
                    </div>
                    <Input
                      type="number"
                      value={port}
                      onChange={(e) => handlePortChange(parseInt(e.target.value) || 3000)}
                      className="w-32"
                      min={1024}
                      max={65535}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>

      <AddProjectDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSubmit={handleAddProject}
      />
    </>
  )
}
