import { getProject } from '@/lib/config'

/**
 * Resolve a projectId to the project's filesystem path.
 * Throws if the project is not found in global config.
 */
export async function resolveProjectPath(projectId: string): Promise<string> {
  const project = await getProject(projectId)
  if (!project) throw new Error('Project not found')
  return project.path
}
