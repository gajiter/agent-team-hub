import type { Project } from '@/types/project'
import { isBrowserMode } from './mode'
import { readConfig, writeConfig } from './config-store'

export const projectService = {
  async getProjects(): Promise<Project[]> {
    if (isBrowserMode()) {
      const config = await readConfig()
      return config.projects
    }
    const res = await fetch('/api/projects')
    const data = await res.json()
    return data.projects
  },

  async addProject(name: string, path: string): Promise<Project> {
    if (isBrowserMode()) {
      const config = await readConfig()
      const project: Project = {
        id: crypto.randomUUID(),
        name,
        path,
        createdAt: new Date().toISOString(),
      }
      config.projects.push(project)
      await writeConfig(config)
      return project
    }
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, path }),
    })
    const data = await res.json()
    return data
  },

  async deleteProject(id: string): Promise<void> {
    if (isBrowserMode()) {
      const config = await readConfig()
      config.projects = config.projects.filter((p) => p.id !== id)
      await writeConfig(config)
      return
    }
    await fetch('/api/projects', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
  },

  async getProject(id: string): Promise<Project | undefined> {
    const projects = await this.getProjects()
    return projects.find((p) => p.id === id)
  },

  async getProjectPath(projectId: string): Promise<string> {
    const project = await this.getProject(projectId)
    if (!project) {
      throw new Error(`Project not found: ${projectId}`)
    }
    return project.path
  },
}
