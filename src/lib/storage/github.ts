import type { StorageProvider, FileEntry } from '@/types/storage'

/**
 * GitHub API-based storage provider for Vercel deployments.
 * Uses GitHub REST API to read/write files in the repository.
 *
 * Required env vars:
 *   GITHUB_TOKEN — Personal access token with repo scope
 *   GITHUB_REPO  — e.g. "gajiter/agent-team-hub"
 */

interface GitHubFileResponse {
  name: string
  path: string
  sha: string
  size: number
  type: 'file' | 'dir'
  content?: string
  encoding?: string
}

// In-memory SHA cache to avoid extra reads before writes
const shaCache = new Map<string, string>()

function getConfig() {
  const token = process.env.GITHUB_TOKEN
  const repo = process.env.GITHUB_REPO
  if (!token || !repo) {
    throw new Error('GITHUB_TOKEN and GITHUB_REPO must be set for GitHub storage')
  }
  return { token, repo }
}

function apiUrl(repo: string, filePath: string): string {
  // Remove leading slash if present
  const clean = filePath.replace(/^\//, '')
  return `https://api.github.com/repos/${repo}/contents/${encodeURIComponent(clean).replace(/%2F/g, '/')}`
}

function cacheKey(repo: string, filePath: string): string {
  return `${repo}:${filePath}`
}

async function githubFetch(url: string, token: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {}),
    },
  })
  return res
}

export class GitHubStorageProvider implements StorageProvider {
  /**
   * projectPath is ignored for GitHub storage — all paths are relative to the repo root.
   * The parameter is kept for interface compatibility.
   */

  async readFile(_projectPath: string, relativePath: string): Promise<string> {
    const { token, repo } = getConfig()
    const url = apiUrl(repo, relativePath)

    const res = await githubFetch(url, token)
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(`File not found: ${relativePath}`)
      }
      throw new Error(`GitHub API error ${res.status}: ${await res.text()}`)
    }

    const data: GitHubFileResponse = await res.json()

    // Cache SHA for potential later writes
    shaCache.set(cacheKey(repo, relativePath), data.sha)

    if (data.content && data.encoding === 'base64') {
      return Buffer.from(data.content, 'base64').toString('utf-8')
    }

    throw new Error(`Unexpected encoding for ${relativePath}: ${data.encoding}`)
  }

  async writeFile(_projectPath: string, relativePath: string, content: string): Promise<void> {
    const { token, repo } = getConfig()
    const url = apiUrl(repo, relativePath)
    const key = cacheKey(repo, relativePath)

    // Try to get SHA from cache first, otherwise fetch it
    let sha: string | undefined = shaCache.get(key)

    if (!sha) {
      // Try to fetch existing file to get SHA
      const existRes = await githubFetch(url, token)
      if (existRes.ok) {
        const existing: GitHubFileResponse = await existRes.json()
        sha = existing.sha
      }
      // If 404, this is a new file — no SHA needed
    }

    const body: Record<string, string> = {
      message: sha ? `Update ${relativePath}` : `Create ${relativePath}`,
      content: Buffer.from(content, 'utf-8').toString('base64'),
    }
    if (sha) {
      body.sha = sha
    }

    const res = await githubFetch(url, token, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`GitHub API write error ${res.status}: ${errText}`)
    }

    // Update SHA cache with new SHA
    const result = await res.json()
    if (result.content?.sha) {
      shaCache.set(key, result.content.sha)
    }
  }

  async deleteFile(_projectPath: string, relativePath: string): Promise<void> {
    const { token, repo } = getConfig()
    const url = apiUrl(repo, relativePath)
    const key = cacheKey(repo, relativePath)

    // Need SHA to delete
    let sha = shaCache.get(key)
    if (!sha) {
      const existRes = await githubFetch(url, token)
      if (!existRes.ok) {
        if (existRes.status === 404) return // Already gone
        throw new Error(`GitHub API error ${existRes.status}`)
      }
      const existing: GitHubFileResponse = await existRes.json()
      sha = existing.sha
    }

    const res = await githubFetch(url, token, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Delete ${relativePath}`,
        sha,
      }),
    })

    if (!res.ok && res.status !== 404) {
      throw new Error(`GitHub API delete error ${res.status}: ${await res.text()}`)
    }

    shaCache.delete(key)
  }

  async listDirectory(_projectPath: string, relativePath: string): Promise<FileEntry[]> {
    const { token, repo } = getConfig()
    const url = apiUrl(repo, relativePath || '.')

    const res = await githubFetch(url, token)
    if (!res.ok) {
      if (res.status === 404) return []
      throw new Error(`GitHub API error ${res.status}: ${await res.text()}`)
    }

    const data: GitHubFileResponse[] = await res.json()

    if (!Array.isArray(data)) {
      // Single file, not a directory
      return []
    }

    return data.map((entry) => {
      // Cache SHAs for files we discover
      if (entry.type === 'file' && entry.sha) {
        shaCache.set(cacheKey(repo, entry.path), entry.sha)
      }
      return {
        name: entry.name,
        isDirectory: entry.type === 'dir',
        path: entry.path,
      }
    })
  }

  async exists(_projectPath: string, relativePath: string): Promise<boolean> {
    const { token, repo } = getConfig()
    const url = apiUrl(repo, relativePath)

    const res = await githubFetch(url, token, { method: 'HEAD' })
    return res.ok
  }
}
