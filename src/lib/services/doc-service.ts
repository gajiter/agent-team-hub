import { isBrowserMode } from './mode'
import { projectService } from './project-service'
import { getBrowserStorage } from '@/lib/storage/browser'
import { parseFrontmatter } from '@/lib/parsers'

export interface DocMeta {
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

export function estimateTokens(content: string): number {
  let tokens = 0
  for (const char of content) {
    const code = char.charCodeAt(0)
    if (
      (code >= 0x3000 && code <= 0x9fff) ||
      (code >= 0xac00 && code <= 0xd7af) ||
      (code >= 0xf900 && code <= 0xfaff)
    ) {
      tokens += 2.2
    } else if (/\s/.test(char)) {
      tokens += 0.15
    } else {
      tokens += 0.3
    }
  }
  return Math.round(tokens)
}

function buildDocMeta(
  filePath: string,
  content: string,
  category: string
): DocMeta {
  const { metadata } = parseFrontmatter(content)
  return {
    path: filePath,
    title: metadata.title ?? filePath.split('/').pop()?.replace(/\.md$/, '') ?? '',
    description: metadata.description ?? '',
    author: metadata.author ?? '',
    emoji: metadata.emoji ?? '',
    type: metadata.type ?? '',
    references: Array.isArray(metadata.references) ? metadata.references : [],
    createdAt: metadata.createdAt ?? '',
    category,
    tokens: estimateTokens(content),
  }
}

export const docService = {
  async getAll(
    projectId: string
  ): Promise<{ docs: DocMeta[]; categories: string[] }> {
    if (isBrowserMode()) {
      const projectPath = await projectService.getProjectPath(projectId)
      const storage = getBrowserStorage()
      const docs: DocMeta[] = []
      const categorySet = new Set<string>()

      try {
        // List subdirectories under docs/
        const subDirs = await storage.listSubDirectories(projectPath, 'docs')

        // Also check root docs/ for files directly in it
        const rootEntries = await storage.listDirectory(projectPath, 'docs')
        for (const entry of rootEntries) {
          if (!entry.isDirectory && entry.name.endsWith('.md')) {
            try {
              const content = await storage.readFile(projectPath, `docs/${entry.name}`)
              const category = 'general'
              categorySet.add(category)
              docs.push(buildDocMeta(`docs/${entry.name}`, content, category))
            } catch {
              // Skip unreadable files
            }
          }
        }

        // Process each subdirectory
        for (const subDir of subDirs) {
          const dirPath = `docs/${subDir}`
          try {
            const entries = await storage.listDirectory(projectPath, dirPath)
            const mdFiles = entries.filter(
              (e) => !e.isDirectory && e.name.endsWith('.md')
            )
            for (const file of mdFiles) {
              try {
                const filePath = `${dirPath}/${file.name}`
                const content = await storage.readFile(projectPath, filePath)
                categorySet.add(subDir)
                docs.push(buildDocMeta(filePath, content, subDir))
              } catch {
                // Skip unreadable files
              }
            }
          } catch {
            // Skip unreadable directories
          }
        }

        return { docs, categories: Array.from(categorySet).sort() }
      } catch {
        return { docs: [], categories: [] }
      }
    }

    const res = await fetch(
      `/api/docs?projectId=${encodeURIComponent(projectId)}`
    )
    const data = await res.json()
    return {
      docs: data.docs ?? [],
      categories: data.categories ?? [],
    }
  },
}
