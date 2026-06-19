import { getProject } from '@/lib/config'

/**
 * Resolve a projectId to the project's filesystem path.
 * Falls back to process.cwd() (repo root) when project is not found in config,
 * which allows Vercel deployments to read data from the repo itself.
 */
export async function resolveProjectPath(projectId: string): Promise<string> {
  const project = await getProject(projectId)
  if (project) return project.path
  return process.cwd()
}
