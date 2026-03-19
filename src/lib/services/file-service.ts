import { isBrowserMode } from './mode'
import { getBrowserStorage } from '@/lib/storage/browser'
import { projectService } from './project-service'

export const fileService = {
  async readFile(
    projectId: string,
    path: string
  ): Promise<{ content: string; exists: boolean }> {
    if (isBrowserMode()) {
      try {
        const projectPath = await projectService.getProjectPath(projectId)
        const content = await getBrowserStorage().readFile(projectPath, path)
        return { content, exists: true }
      } catch {
        return { content: '', exists: false }
      }
    }
    const params = new URLSearchParams({ projectId, path })
    const res = await fetch(`/api/files?${params}`)
    if (!res.ok) {
      return { content: '', exists: false }
    }
    const data = await res.json()
    return { content: data.content, exists: true }
  },
}
