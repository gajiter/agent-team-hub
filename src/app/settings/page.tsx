'use client'

import { useState, useEffect, useCallback } from 'react'
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
import ProjectList from '@/components/settings/project-list'
import AddProjectDialog from '@/components/settings/add-project-dialog'
import type { Project } from '@/types/project'

export default function SettingsPage() {
  const { projects, currentProject, setCurrentProject, refreshProjects } = useProject()
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  // Settings state
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [language, setLanguage] = useState('ko')
  const [port, setPort] = useState(3000)
  const [settingsLoading, setSettingsLoading] = useState(true)

  // Load settings
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        if (data.theme) setTheme(data.theme)
        if (data.language) setLanguage(data.language)
        if (data.port) setPort(data.port)
      })
      .catch(() => {})
      .finally(() => setSettingsLoading(false))
  }, [])

  // Save settings
  const saveSettings = useCallback(async (updates: Record<string, unknown>) => {
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
    } catch {
      // ignore
    }
  }, [])

  const handleThemeChange = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme)
    document.documentElement.className = newTheme
    saveSettings({ theme: newTheme })
  }

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang)
    saveSettings({ language: newLang })
  }

  const handlePortChange = (newPort: number) => {
    setPort(newPort)
    saveSettings({ port: newPort })
  }

  const handleAddProject = async (data: { name: string; path: string; initialize: boolean }) => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: data.name, path: data.path }),
    })
    const result = await res.json()

    if (data.initialize && result.project) {
      await fetch('/api/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: result.project.id }),
      })
    }

    await refreshProjects()
  }

  const handleOpenProject = (project: Project) => {
    setCurrentProject(project)
  }

  const handleInitializeProject = async (project: Project) => {
    await fetch('/api/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: project.id }),
    })
  }

  const handleRemoveProject = async (project: Project) => {
    await fetch(`/api/projects?id=${project.id}`, { method: 'DELETE' })
    await refreshProjects()
  }

  return (
    <>
      <Topbar title="설정" />
      <ScrollArea className="flex-1">
        <div className="p-6 max-w-4xl space-y-6">
          {/* Projects section */}
          <Card>
            <CardHeader className="border-b border-border/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">프로젝트 관리</CardTitle>
                <Button size="sm" onClick={() => setAddDialogOpen(true)}>
                  + 프로젝트 추가
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
              <CardTitle className="text-base">앱 설정</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-6">
              {settingsLoading ? (
                <div className="text-sm text-muted-foreground py-4 text-center">설정 로딩 중...</div>
              ) : (
                <>
                  {/* Theme */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-foreground">테마</div>
                      <div className="text-xs text-muted-foreground">다크/라이트 모드 전환</div>
                    </div>
                    <Select value={theme} onValueChange={(v) => handleThemeChange(v as 'dark' | 'light')}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dark">다크</SelectItem>
                        <SelectItem value="light">라이트</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Language */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-foreground">언어</div>
                      <div className="text-xs text-muted-foreground">인터페이스 언어 설정</div>
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
                      <div className="text-sm font-medium text-foreground">포트</div>
                      <div className="text-xs text-muted-foreground">개발 서버 포트 (재시작 필요)</div>
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
