import { isBrowserMode } from './mode'
import { getBrowserStorage } from '@/lib/storage/browser'
import { projectService } from './project-service'

type PlanningType = 'prd' | 'features' | 'userflow'

export const planningService = {
  async get(
    projectId: string,
    type: PlanningType
  ): Promise<{ data: any; exists: boolean }> {
    if (isBrowserMode()) {
      try {
        const projectPath = await projectService.getProjectPath(projectId)
        const content = await getBrowserStorage().readFile(
          projectPath,
          `data/${type}.json`
        )
        return { data: JSON.parse(content), exists: true }
      } catch {
        return { data: null, exists: false }
      }
    }
    const params = new URLSearchParams({
      projectId,
      path: `data/${type}.json`,
    })
    const res = await fetch(`/api/files?${params}`)
    if (!res.ok) {
      return { data: null, exists: false }
    }
    try {
      const fileData = await res.json()
      return { data: JSON.parse(fileData.content), exists: true }
    } catch {
      return { data: null, exists: false }
    }
  },

  async put(
    projectId: string,
    type: PlanningType,
    data: any
  ): Promise<void> {
    if (isBrowserMode()) {
      const projectPath = await projectService.getProjectPath(projectId)
      await getBrowserStorage().writeFile(
        projectPath,
        `data/${type}.json`,
        JSON.stringify(data, null, 2)
      )
      return
    }
    await fetch('/api/planning', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, type, data }),
    })
  },
}
