import type { AgentInfo } from '@/types/agents'
import { isBrowserMode } from './mode'
import { projectService } from './project-service'
import { getBrowserStorage } from '@/lib/storage/browser'
import { parseFrontmatter } from '@/lib/parsers'

function toKebabCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function buildAgentContent(
  meta: { name: string; description: string; model: string; color: string; emoji: string; role: string; responsibilities?: string[] },
  body?: string
): string {
  const lines = [
    '---',
    `name: ${meta.name}`,
    `description: ${meta.description}`,
    `model: ${meta.model}`,
    `color: ${meta.color}`,
    `emoji: ${meta.emoji}`,
    `role: ${meta.role}`,
  ]
  if (meta.responsibilities && meta.responsibilities.length > 0) {
    lines.push('responsibilities:')
    for (const r of meta.responsibilities) {
      lines.push(`  - ${r}`)
    }
  }
  lines.push('---')
  lines.push('')
  lines.push(body ?? `# ${meta.name}\n`)
  return lines.join('\n')
}

function parseAgentFile(fileName: string, content: string): AgentInfo {
  const { metadata, body } = parseFrontmatter(content)
  return {
    name: metadata.name ?? '',
    description: metadata.description ?? '',
    model: metadata.model ?? '',
    color: metadata.color ?? '',
    emoji: metadata.emoji ?? '',
    role: metadata.role ?? '',
    responsibilities: Array.isArray(metadata.responsibilities) ? metadata.responsibilities : undefined,
    content,
    fileName,
  }
}

export const agentService = {
  async getAll(projectId: string): Promise<AgentInfo[]> {
    if (isBrowserMode()) {
      const projectPath = await projectService.getProjectPath(projectId)
      const storage = getBrowserStorage()
      const agentsDir = '.claude/agents'

      try {
        const entries = await storage.listDirectory(projectPath, agentsDir)
        const mdFiles = entries.filter((e) => !e.isDirectory && e.name.endsWith('.md'))
        const agents: AgentInfo[] = []

        for (const file of mdFiles) {
          try {
            const content = await storage.readFile(projectPath, `${agentsDir}/${file.name}`)
            agents.push(parseAgentFile(file.name, content))
          } catch {
            // Skip files that cannot be read
          }
        }
        return agents
      } catch {
        return []
      }
    }

    const res = await fetch(`/api/agents?projectId=${encodeURIComponent(projectId)}`)
    const data = await res.json()
    return data.agents ?? []
  },

  async create(
    projectId: string,
    data: { name: string; description: string; model: string; color: string; emoji: string; role: string; responsibilities?: string[] },
    body?: string
  ): Promise<AgentInfo> {
    if (isBrowserMode()) {
      const projectPath = await projectService.getProjectPath(projectId)
      const storage = getBrowserStorage()
      const fileName = `${toKebabCase(data.name)}.md`
      const filePath = `.claude/agents/${fileName}`

      const fileExists = await storage.exists(projectPath, filePath)
      if (fileExists) {
        throw new Error(`Agent file already exists: ${fileName}`)
      }

      const content = buildAgentContent(data, body)
      await storage.writeFile(projectPath, filePath, content)

      return {
        ...data,
        content,
        fileName,
      }
    }

    const res = await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, ...data, body }),
    })
    const result = await res.json()
    return result
  },

  async update(
    projectId: string,
    fileName: string,
    updates: Partial<{ name: string; description: string; model: string; color: string; emoji: string; role: string; responsibilities: string[] }>,
    agentBody?: string
  ): Promise<AgentInfo> {
    if (isBrowserMode()) {
      const projectPath = await projectService.getProjectPath(projectId)
      const storage = getBrowserStorage()
      const filePath = `.claude/agents/${fileName}`

      const existing = await storage.readFile(projectPath, filePath)
      const parsed = parseAgentFile(fileName, existing)

      const merged = {
        name: updates.name ?? parsed.name,
        description: updates.description ?? parsed.description,
        model: updates.model ?? parsed.model,
        color: updates.color ?? parsed.color,
        emoji: updates.emoji ?? parsed.emoji,
        role: updates.role ?? parsed.role,
        responsibilities: updates.responsibilities ?? parsed.responsibilities,
      }

      const { body: existingBody } = parseFrontmatter(existing)
      const content = buildAgentContent(merged, agentBody ?? existingBody)
      await storage.writeFile(projectPath, filePath, content)

      return {
        ...merged,
        content,
        fileName,
      }
    }

    const res = await fetch('/api/agents', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, fileName, ...updates, body: agentBody }),
    })
    const result = await res.json()
    return result
  },

  async delete(projectId: string, fileName: string): Promise<void> {
    if (isBrowserMode()) {
      const projectPath = await projectService.getProjectPath(projectId)
      const storage = getBrowserStorage()
      await storage.deleteFile(projectPath, `.claude/agents/${fileName}`)
      return
    }

    await fetch('/api/agents', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, fileName }),
    })
  },
}
