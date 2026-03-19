'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Project } from '@/types/project'

interface ProjectListProps {
  projects: Project[]
  currentProjectId: string | null
  onOpen: (project: Project) => void
  onInitialize: (project: Project) => void
  onRemove: (project: Project) => void
}

export default function ProjectList({
  projects,
  currentProjectId,
  onOpen,
  onInitialize,
  onRemove,
}: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        등록된 프로젝트가 없습니다
      </div>
    )
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 border-b border-border">
            <th className="text-left py-3 px-4 font-medium text-muted-foreground">이름</th>
            <th className="text-left py-3 px-4 font-medium text-muted-foreground">경로</th>
            <th className="text-left py-3 px-4 font-medium text-muted-foreground">상태</th>
            <th className="text-right py-3 px-4 font-medium text-muted-foreground">작업</th>
          </tr>
        </thead>
        <tbody>
          {projects.map(project => {
            const isCurrent = project.id === currentProjectId
            return (
              <tr key={project.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{project.name}</span>
                    {isCurrent && (
                      <Badge variant="default" className="text-[10px]">현재</Badge>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="text-xs font-mono text-muted-foreground">{project.path}</span>
                </td>
                <td className="py-3 px-4">
                  <Badge variant="outline" className="text-xs">등록됨</Badge>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {!isCurrent && (
                      <Button size="sm" variant="outline" onClick={() => onOpen(project)}>
                        열기
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => onInitialize(project)}>
                      초기화
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => onRemove(project)}>
                      삭제
                    </Button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
