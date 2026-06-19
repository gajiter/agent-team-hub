'use client'
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { Project } from '@/types/project'
import { projectService } from '@/lib/services/project-service'

interface ProjectContextValue {
  currentProject: Project | null
  projects: Project[]
  setCurrentProject: (project: Project) => void
  loading: boolean
  refreshProjects: () => Promise<void>
}

const ProjectContext = createContext<ProjectContextValue>({
  currentProject: null,
  projects: [],
  setCurrentProject: () => {},
  loading: true,
  refreshProjects: async () => {}
})

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [currentProject, setCurrentProjectState] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshProjects = useCallback(async () => {
    try {
      const fetched = await projectService.getProjects()
      if (fetched.length > 0) {
        setProjects(fetched)
      } else {
        const fallback: Project = { id: 'default', name: 'Rhymix Layout', path: '', createdAt: new Date().toISOString() }
        setProjects([fallback])
        setCurrentProjectState(fallback)
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err)
      const fallback: Project = { id: 'default', name: 'Rhymix Layout', path: '', createdAt: new Date().toISOString() }
      setProjects([fallback])
      setCurrentProjectState(fallback)
    }
  }, [])

  useEffect(() => {
    refreshProjects().then(() => {
      setLoading(false)
    })
  }, [refreshProjects])

  // Restore last selected project from localStorage once projects are loaded
  useEffect(() => {
    if (projects.length === 0) return
    if (currentProject) return

    const savedId = localStorage.getItem('agent-team-hub:currentProjectId')
    if (savedId) {
      const found = projects.find((p) => p.id === savedId)
      if (found) {
        setCurrentProjectState(found)
        return
      }
    }
    // Default to first project if no saved selection
    setCurrentProjectState(projects[0])
  }, [projects, currentProject])

  const setCurrentProject = useCallback((project: Project) => {
    setCurrentProjectState(project)
    localStorage.setItem('agent-team-hub:currentProjectId', project.id)
  }, [])

  return (
    <ProjectContext.Provider value={{ currentProject, projects, setCurrentProject, loading, refreshProjects }}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() { return useContext(ProjectContext) }
