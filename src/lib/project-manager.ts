import { LocalStorageProvider } from './storage/local'
import type { ProjectConfig } from '@/types/project'

const storage = new LocalStorageProvider()

export async function getProjectConfig(projectPath: string): Promise<ProjectConfig | null> {
  try {
    const content = await storage.readFile(projectPath, '.hub/config.json')
    return JSON.parse(content)
  } catch { return null }
}

export async function isProjectInitialized(projectPath: string): Promise<boolean> {
  return storage.exists(projectPath, '.hub/config.json')
}
