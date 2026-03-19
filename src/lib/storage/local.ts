import fs from 'fs/promises'
import path from 'path'
import type { StorageProvider, FileEntry } from '@/types/storage'

export class LocalStorageProvider implements StorageProvider {
  private validatePath(projectPath: string, relativePath: string): string {
    const resolved = path.resolve(projectPath, relativePath)
    if (!resolved.startsWith(path.resolve(projectPath))) {
      throw new Error('Path traversal detected')
    }
    return resolved
  }

  async readFile(projectPath: string, relativePath: string): Promise<string> {
    const fullPath = this.validatePath(projectPath, relativePath)
    return fs.readFile(fullPath, 'utf-8')
  }

  async writeFile(projectPath: string, relativePath: string, content: string): Promise<void> {
    const fullPath = this.validatePath(projectPath, relativePath)
    await fs.mkdir(path.dirname(fullPath), { recursive: true })
    await fs.writeFile(fullPath, content, 'utf-8')
  }

  async deleteFile(projectPath: string, relativePath: string): Promise<void> {
    const fullPath = this.validatePath(projectPath, relativePath)
    await fs.unlink(fullPath)
  }

  async listDirectory(projectPath: string, relativePath: string): Promise<FileEntry[]> {
    const fullPath = this.validatePath(projectPath, relativePath)
    const entries = await fs.readdir(fullPath, { withFileTypes: true })
    return entries.map(e => ({
      name: e.name,
      isDirectory: e.isDirectory(),
      path: path.join(relativePath, e.name)
    }))
  }

  async exists(projectPath: string, relativePath: string): Promise<boolean> {
    try {
      const fullPath = this.validatePath(projectPath, relativePath)
      await fs.access(fullPath)
      return true
    } catch {
      return false
    }
  }
}
