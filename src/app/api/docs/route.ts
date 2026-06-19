import { NextRequest, NextResponse } from 'next/server'
import { resolveProjectPath } from '@/lib/api-utils'
import { parseFrontmatter } from '@/lib/parsers'
import { getServerStorage } from '@/lib/storage'
import type { StorageProvider, FileEntry } from '@/types/storage'

interface DocMeta {
  path: string
  title: string
  description: string
  author: string
  emoji: string
  type: string
  references: string[]
  createdAt: string
  category: string
  tokens: number
}

function estimateTokens(content: string): number {
  let tokens = 0
  const cjkRegex = /[\u3000-\u9fff\uac00-\ud7af\uf900-\ufaff]/
  for (const char of content) {
    if (/\s/.test(char)) {
      tokens += 0.15
    } else if (cjkRegex.test(char)) {
      tokens += 2.2
    } else {
      tokens += 0.3
    }
  }
  return Math.ceil(tokens)
}

/**
 * Recursively scan a directory for .md files using storage provider.
 */
async function scanDocsDirRecursive(
  storage: StorageProvider,
  projectPath: string,
  docsRelRoot: string,
  relDir: string
): Promise<DocMeta[]> {
  const dirPath = relDir ? `${docsRelRoot}/${relDir}` : docsRelRoot
  const results: DocMeta[] = []

  try {
    const entries: FileEntry[] = await storage.listDirectory(projectPath, dirPath)

    for (const entry of entries) {
      if (entry.isDirectory) {
        const childRelDir = relDir ? `${relDir}/${entry.name}` : entry.name
        const childDocs = await scanDocsDirRecursive(storage, projectPath, docsRelRoot, childRelDir)
        results.push(...childDocs)
      } else if (entry.name.endsWith('.md')) {
        const filePath = relDir ? `${docsRelRoot}/${relDir}/${entry.name}` : `${docsRelRoot}/${entry.name}`
        const content = await storage.readFile(projectPath, filePath)
        const fm = parseFrontmatter(content)
        const meta = fm.metadata
        const fallbackTitle = entry.name.replace('.md', '').replace(/-/g, ' ')

        results.push({
          path: relDir ? `docs/${relDir}/${entry.name}` : `docs/${entry.name}`,
          title: (meta.title as string) || fallbackTitle,
          description: (meta.description as string) || '',
          author: (meta.author as string) || '',
          emoji: (meta.emoji as string) || '',
          type: (meta.type as string) || relDir || 'general',
          references: Array.isArray(meta.references) ? meta.references as string[] : [],
          createdAt: (meta.createdAt as string) || '',
          category: relDir || 'general',
          tokens: estimateTokens(content),
        })
      }
    }
  } catch {
    // Directory does not exist — return empty
  }

  return results
}

/**
 * GET /api/docs?projectId=xxx
 */
export async function GET(req: NextRequest) {
  try {
    const projectId = req.nextUrl.searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    const projectPath = await resolveProjectPath(projectId)
    const storage = getServerStorage()

    const allDocs = await scanDocsDirRecursive(storage, projectPath, 'docs', '')

    const categorySet = new Set(allDocs.map(d => d.category))
    const categories = Array.from(categorySet).map(cat => ({
      id: cat,
      label: cat,
      count: allDocs.filter(d => d.category === cat).length,
    }))

    return NextResponse.json({ docs: allDocs, categories })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to read docs'
    const status = message === 'Project not found' ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
