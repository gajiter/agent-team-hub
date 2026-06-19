import { getProject } from '@/lib/config'
import { isGitHubStorageMode } from '@/lib/storage'

/**
 * Resolve a projectId to the project's filesystem path.
 * In GitHub storage mode (Vercel), returns empty string since paths are
 * relative to repo root and handled by GitHubStorageProvider.
 * In local mode, returns the project's filesystem path.
 */
export async function resolveProjectPath(projectId: string): Promise<string> {
  if (isGitHubStorageMode()) return ''
  const project = await getProject(projectId)
  if (project) return project.path
  return process.cwd()
}
