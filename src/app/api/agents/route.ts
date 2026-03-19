import { NextRequest, NextResponse } from 'next/server'
import { readdir, readFile, writeFile, unlink, mkdir, stat } from 'fs/promises'
import { join, resolve } from 'path'
import { resolveProjectPath } from '@/lib/api-utils'
import { parseFrontmatter } from '@/lib/parsers'

const AGENTS_DIR = '.claude/agents'

function agentsDir(projectPath: string): string {
  return join(projectPath, AGENTS_DIR)
}

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
    // Default agent template with workflow binding section
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
    const dir = agentsDir(projectPath)

    let files: string[] = []
    try {
      files = (await readdir(dir)).filter((f) => f.endsWith('.md')).sort()
    } catch {
      // Directory doesn't exist yet — return empty list
      return NextResponse.json({ agents: [] })
    }

    const agents = await Promise.all(
      files.map(async (filename) => {
        const filePath = join(dir, filename)
        const content = await readFile(filePath, 'utf-8')
        const fm = parseFrontmatter(content)
        const meta = fm.metadata
        const name = (meta.name as string) || filename.replace(/\.md$/, '')

        return {
          fileName: filename,
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
 * body: { projectId, name, description?, model?, color?, emoji?, role?, responsibilities? }
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
    const dir = agentsDir(projectPath)
    await mkdir(dir, { recursive: true })

    // Generate filename from name (kebab-case)
    const fileName = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '.md'

    const filePath = join(dir, fileName)

    // Check if file already exists
    try {
      await stat(filePath)
      return NextResponse.json({ error: 'Agent with this name already exists' }, { status: 409 })
    } catch {
      // File doesn't exist — proceed
    }

    const content = buildAgentContent({ name, description, model, color, emoji, role, responsibilities })
    await writeFile(filePath, content, 'utf-8')

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
 * body: { projectId, fileName, name?, description?, model?, color?, emoji?, role?, responsibilities?, body? }
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

    const projectPath = await resolveProjectPath(projectId)
    const dir = agentsDir(projectPath)
    const filePath = join(dir, fileName)

    // Validate path (prevent traversal)
    const resolved = resolve(filePath)
    if (!resolved.startsWith(resolve(dir))) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 403 })
    }

    // Read existing file
    let existingContent: string
    try {
      existingContent = await readFile(filePath, 'utf-8')
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
    await writeFile(filePath, newContent, 'utf-8')

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
 * body: { projectId, fileName }
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

    const projectPath = await resolveProjectPath(projectId)
    const dir = agentsDir(projectPath)
    const filePath = join(dir, fileName)

    // Validate path (prevent traversal)
    const resolved = resolve(filePath)
    if (!resolved.startsWith(resolve(dir))) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 403 })
    }

    try {
      await unlink(filePath)
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
