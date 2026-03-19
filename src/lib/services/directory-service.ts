import { isBrowserMode } from './mode'
import { getBrowserStorage } from '@/lib/storage/browser'

export { isBrowserMode }

export interface DirectoryEntry {
  name: string
  path: string
}

export interface BrowseResult {
  current: string
  parent: string | null
  directories: DirectoryEntry[]
  isProject: boolean
}

export interface PickResult {
  name: string
  path: string
}

export const directoryService = {
  /**
   * Browse directories on the server. Not available in browser mode.
   */
  async browse(path?: string): Promise<BrowseResult> {
    const params = new URLSearchParams()
    if (path) params.set('path', path)

    const res = await fetch(`/api/directories?${params.toString()}`)
    if (!res.ok) {
      throw new Error(`Failed to browse directories: ${res.statusText}`)
    }
    const data = await res.json()
    return data as BrowseResult
  },

  /**
   * Pick a directory using the browser's File System Access API.
   * Only available in browser mode.
   */
  async pickDirectory(): Promise<PickResult> {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
    const name = handle.name
    // In browser mode, the "path" is the directory name used as a key
    const path = name

    // Store the handle for future access
    const storage = getBrowserStorage()
    await storage.requestAccess(path)

    return { name, path }
  },
}
