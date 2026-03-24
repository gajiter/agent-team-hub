import { NextRequest, NextResponse } from 'next/server'
import { readdir, readFile, stat } from 'fs/promises'
import { join } from 'path'
import { resolveProjectPath } from '@/lib/api-utils'
import { parseFrontmatter } from '@/lib/parsers'

interface DocMeta {
  /** Relative path from project root (e.g. docs/plans/prd.md) */
  path: string
  /** Title extracted from frontmatter */
  title: string
  /** Description from frontmatter */
  description: string
  /** Author from frontmatter */
  author: string
  /** Emoji from frontmatter */
  emoji: string
  /** Document type from frontmatter */
  type: string
  /** References from frontmatter */
  references: string[]
  /** Creation date from frontmatter */
  createdAt: string
  /** Category (directory name) */
  category: string
  /** Estimated token count */
  tokens: number
}

/**
 * Estimate Claude token count for document content.
 * Based on BPE tokenizer measurements:
 * - CJK characters: ~2.2 tokens/char
 * - English/digits/symbols: ~0.3 tokens/char
 * - Whitespace/newlines: ~0.15 tokens/char
 */
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
 * Recursively scan a directory for .md files.
 * `relDir` is the path relative to docsRoot (e.g. "plans", "superpowers/plans").
 */
async function scanDocsDirRecursive(docsRoot: string, relDir: string): Promise<DocMeta[]> {
  const dirPath = join(docsRoot, relDir)
  const results: DocMeta[] = []

  try {
    const entries = await readdir(dirPath)
    for (const entry of entries) {
      const entryPath = join(dirPath, entry)
      const entryStat = await stat(entryPath)

      if (entryStat.isDirectory()) {
        // Recurse into subdirectory
        const childRelDir = relDir ? `${relDir}/${entry}` : entry
        const childDocs = await scanDocsDirRecursive(docsRoot, childRelDir)
        results.push(...childDocs)
      } else if (entryStat.isFile() && entry.endsWith('.md')) {
        const content = await readFile(entryPath, 'utf-8')
        const fm = parseFrontmatter(content)
        const meta = fm.metadata
        const fallbackTitle = entry.replace('.md', '').replace(/-/g, ' ')

        results.push({
          path: relDir ? `docs/${relDir}/${entry}` : `docs/${entry}`,
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
 * Scan docs/ directory in project, parse frontmatter, group by category.
 */
export async function GET(req: NextRequest) {
  try {
    const projectId = req.nextUrl.searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    const projectPath = await resolveProjectPath(projectId)
    const docsRoot = join(projectPath, 'docs')

    // Recursively scan all files and directories under docs/
    const allDocs = await scanDocsDirRecursive(docsRoot, '')

    // Build category info
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
