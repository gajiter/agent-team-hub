import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { randomUUID } from 'crypto'
import type { GlobalConfig, Project } from '@/types/project'

const CONFIG_DIR = path.join(os.homedir(), '.agent-team-hub')
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json')

const DEFAULT_CONFIG: GlobalConfig = {
  projects: [],
  settings: { theme: 'dark', language: 'en', port: 3100 }
}

export async function readGlobalConfig(): Promise<GlobalConfig> {
  try {
    const content = await fs.readFile(CONFIG_PATH, 'utf-8')
    const config = JSON.parse(content) as GlobalConfig
    if (config.projects.length === 0) {
      return ensureDefaultProject(config)
    }
    return config
  } catch {
    return ensureDefaultProject(DEFAULT_CONFIG)
  }
}

async function ensureDefaultProject(config: GlobalConfig): Promise<GlobalConfig> {
  const cwd = process.cwd()
  const defaultProject: Project = {
    id: 'default',
    name: 'Rhymix Layout',
    path: cwd,
    createdAt: new Date().toISOString()
  }
  config.projects = [defaultProject]
  return config
}

export async function writeGlobalConfig(config: GlobalConfig): Promise<void> {
  await fs.mkdir(CONFIG_DIR, { recursive: true })
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
}

export async function addProject(name: string, projectPath: string): Promise<Project> {
  const config = await readGlobalConfig()
  const project: Project = {
    id: randomUUID(),
    name,
    path: projectPath,
    createdAt: new Date().toISOString()
  }
  config.projects.push(project)
  await writeGlobalConfig(config)
  return project
}

export async function removeProject(projectId: string): Promise<void> {
  const config = await readGlobalConfig()
  config.projects = config.projects.filter(p => p.id !== projectId)
  await writeGlobalConfig(config)
}

export async function getProject(projectId: string): Promise<Project | null> {
  const config = await readGlobalConfig()
  return config.projects.find(p => p.id === projectId) || null
}

export async function updateProject(projectId: string, updates: Partial<Pick<Project, 'name' | 'path'>>): Promise<Project | null> {
  const config = await readGlobalConfig()
  const project = config.projects.find(p => p.id === projectId)
  if (!project) return null
  if (updates.name) project.name = updates.name
  if (updates.path) project.path = updates.path
  await writeGlobalConfig(config)
  return project
}

export async function updateSettings(settings: Partial<GlobalConfig['settings']>): Promise<void> {
  const config = await readGlobalConfig()
  config.settings = { ...config.settings, ...settings }
  await writeGlobalConfig(config)
}
