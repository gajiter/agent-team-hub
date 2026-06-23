import { NextRequest, NextResponse } from 'next/server'
import { resolveProjectPath } from '@/lib/api-utils'
import { parseFrontmatter } from '@/lib/parsers'
import { getServerStorage } from '@/lib/storage'

const AGENTS_DIR = '.claude/agents'

function buildAgentContent(meta: {
  name: string
  description?: string
  model?: string
  color?: string
  emoji?: string
  role?: string
  responsibilities?: string[]
}, body?: string): string {
  const lines: string[] = ['---']
  lines.push(`name: ${meta.name}`)
  if (meta.description) lines.push(`description: ${meta.description}`)
  if (meta.model) lines.push(`model: ${meta.model}`)
  if (meta.color) lines.push(`color: ${meta.color}`)
  if (meta.emoji) lines.push(`emoji: ${meta.emoji}`)
  if (meta.role) lines.push(`role: ${meta.role}`)
  if (meta.responsibilities && meta.responsibilities.length > 0) {
    lines.push('responsibilities:')
    for (const r of meta.responsibilities) {
      lines.push(`  - ${r}`)
    }
  }
  lines.push('---')
  lines.push('')

  if (body) {
    lines.push(body)
  } else {
    lines.push(`# ${meta.name}`)
    lines.push('')
    if (meta.description) {
      lines.push(meta.description)
      lines.push('')
    }
    lines.push('## Workflow')
    lines.push('')
    lines.push('1. Read assigned issues from `issues/` directory')
    lines.push('2. Update issue status to `in-progress` when starting work')
    lines.push('3. Implement changes according to issue description')
    lines.push('4. Update issue status to `resolved` when complete')
    lines.push('5. Add a comment summarizing what was done')
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * GET /api/agents?projectId=xxx
 * List all agent definitions from .claude/agents/*.md
 */
export async function GET(req: NextRequest) {
  try {
    const projectId = req.nextUrl.searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    const projectPath = await resolveProjectPath(projectId)
    const storage = getServerStorage()

    let entries: { name: string; isDirectory: boolean; path: string }[] = []
    try {
      entries = await storage.listDirectory(projectPath, AGENTS_DIR)
    } catch {
      return NextResponse.json({ agents: [] })
    }

    const mdFiles = entries.filter((e) => !e.isDirectory && e.name.endsWith('.md')).sort((a, b) => a.name.localeCompare(b.name))

    const agents = await Promise.all(
      mdFiles.map(async (entry) => {
        const filePath = `${AGENTS_DIR}/${entry.name}`
        const content = await storage.readFile(projectPath, filePath)
        const fm = parseFrontmatter(content)
        const meta = fm.metadata
        const name = (meta.name as string) || entry.name.replace(/\.md$/, '')

        return {
          fileName: entry.name,
          name,
          description: (meta.description as string) || '',
          model: (meta.model as string) || '',
          color: (meta.color as string) || '',
          emoji: (meta.emoji as string) || '',
          role: (meta.role as string) || '',
          responsibilities: Array.isArray(meta.responsibilities) ? meta.responsibilities : [],
          content,
        }
      })
    )

    return NextResponse.json({ agents })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load agents'
    const status = message === 'Project not found' ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

/**
 * POST /api/agents
 * Create a new agent .md file.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { projectId, name, description, model, color, emoji, role, responsibilities } = body

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }
    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const projectPath = await resolveProjectPath(projectId)
    const storage = getServerStorage()

    const fileName = name
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, '-')
      .replace(/^-|-$/g, '') + '.md'

    const filePath = `${AGENTS_DIR}/${fileName}`

    // Check if file already exists
    const exists = await storage.exists(projectPath, filePath)
    if (exists) {
      return NextResponse.json({ error: 'Agent with this name already exists' }, { status: 409 })
    }

    const content = buildAgentContent({ name, description, model, color, emoji, role, responsibilities })
    await storage.writeFile(projectPath, filePath, content)

    return NextResponse.json({
      fileName,
      name,
      description: description || '',
      model: model || '',
      color: color || '',
      emoji: emoji || '',
      role: role || '',
      responsibilities: responsibilities || [],
      content,
    }, { status: 201 })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to create agent'
    const status = message === 'Project not found' ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

/**
 * PUT /api/agents
 * Update an existing agent .md file.
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { projectId, fileName, body: agentBody, ...updates } = body

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }
    if (!fileName) {
      return NextResponse.json({ error: 'fileName is required' }, { status: 400 })
    }

    // Validate path (prevent traversal)
    if (fileName.includes('/') || fileName.includes('\\') || fileName.includes('..')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 403 })
    }

    const projectPath = await resolveProjectPath(projectId)
    const storage = getServerStorage()
    const filePath = `${AGENTS_DIR}/${fileName}`

    // Read existing file
    let existingContent: string
    try {
      existingContent = await storage.readFile(projectPath, filePath)
    } catch {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    const existing = parseFrontmatter(existingContent)
    const existingMeta = existing.metadata

    const mergedMeta = {
      name: updates.name || (existingMeta.name as string) || fileName.replace(/\.md$/, ''),
      description: updates.description ?? (existingMeta.description as string) ?? '',
      model: updates.model ?? (existingMeta.model as string) ?? '',
      color: updates.color ?? (existingMeta.color as string) ?? '',
      emoji: updates.emoji ?? (existingMeta.emoji as string) ?? '',
      role: updates.role ?? (existingMeta.role as string) ?? '',
      responsibilities: updates.responsibilities ?? (existingMeta.responsibilities as string[]) ?? [],
    }

    const newContent = buildAgentContent(mergedMeta, agentBody ?? existing.body)
    await storage.writeFile(projectPath, filePath, newContent)

    return NextResponse.json({
      fileName,
      ...mergedMeta,
      content: newContent,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to update agent'
    const status = message === 'Project not found' ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

/**
 * DELETE /api/agents
 * Delete an agent .md file.
 */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const { projectId, fileName } = body

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }
    if (!fileName) {
      return NextResponse.json({ error: 'fileName is required' }, { status: 400 })
    }

    // Validate path (prevent traversal)
    if (fileName.includes('/') || fileName.includes('\\') || fileName.includes('..')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 403 })
    }

    const projectPath = await resolveProjectPath(projectId)
    const storage = getServerStorage()
    const filePath = `${AGENTS_DIR}/${fileName}`

    try {
      await storage.deleteFile(projectPath, filePath)
      return NextResponse.json({ success: true })
    } catch {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to delete agent'
    const status = message === 'Project not found' ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
