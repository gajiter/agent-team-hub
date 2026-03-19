import type { StorageProvider, FileEntry } from '@/types/storage'

const IDB_STORE_NAME = 'directoryHandles'
const IDB_DB_NAME = 'ai-hub-storage'
const IDB_VERSION = 1

function openHandleDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_DB_NAME, IDB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
        db.createObjectStore(IDB_STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function saveDirHandle(key: string, handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openHandleDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_NAME, 'readwrite')
    tx.objectStore(IDB_STORE_NAME).put(handle, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function loadDirHandle(key: string): Promise<FileSystemDirectoryHandle | null> {
  const db = await openHandleDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_NAME, 'readonly')
    const req = tx.objectStore(IDB_STORE_NAME).get(key)
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => reject(req.error)
  })
}

export class BrowserStorageProvider implements StorageProvider {
  private handleCache = new Map<string, FileSystemDirectoryHandle>()

  async requestAccess(projectPath: string): Promise<FileSystemDirectoryHandle> {
    // Try cache first
    const cached = this.handleCache.get(projectPath)
    if (cached) return cached

    // Try IndexedDB
    const stored = await loadDirHandle(projectPath)
    if (stored) {
      const permission = await stored.requestPermission({ mode: 'readwrite' })
      if (permission === 'granted') {
        this.handleCache.set(projectPath, stored)
        return stored
      }
    }

    // Show directory picker
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
    this.handleCache.set(projectPath, handle)
    await saveDirHandle(projectPath, handle)
    return handle
  }

  private async getRootHandle(projectPath: string): Promise<FileSystemDirectoryHandle> {
    const handle = this.handleCache.get(projectPath)
    if (handle) return handle

    const stored = await loadDirHandle(projectPath)
    if (stored) {
      const permission = await stored.requestPermission({ mode: 'readwrite' })
      if (permission === 'granted') {
        this.handleCache.set(projectPath, stored)
        return stored
      }
    }

    throw new Error(
      `No access to directory "${projectPath}". Call requestAccess() first.`
    )
  }

  private splitPath(relativePath: string): string[] {
    return relativePath.split('/').filter(Boolean)
  }

  private async navigateToParent(
    root: FileSystemDirectoryHandle,
    segments: string[]
  ): Promise<FileSystemDirectoryHandle> {
    let current = root
    for (const segment of segments) {
      current = await current.getDirectoryHandle(segment)
    }
    return current
  }

  async readFile(projectPath: string, relativePath: string): Promise<string> {
    const root = await this.getRootHandle(projectPath)
    const segments = this.splitPath(relativePath)
    const fileName = segments.pop()!
    const dir = await this.navigateToParent(root, segments)
    const fileHandle = await dir.getFileHandle(fileName)
    const file = await fileHandle.getFile()
    return file.text()
  }

  async writeFile(projectPath: string, relativePath: string, content: string): Promise<void> {
    const root = await this.getRootHandle(projectPath)
    const segments = this.splitPath(relativePath)
    const fileName = segments.pop()!

    // Create intermediate directories
    let current = root
    for (const segment of segments) {
      current = await current.getDirectoryHandle(segment, { create: true })
    }

    const fileHandle = await current.getFileHandle(fileName, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(content)
    await writable.close()
  }

  async deleteFile(projectPath: string, relativePath: string): Promise<void> {
    const root = await this.getRootHandle(projectPath)
    const segments = this.splitPath(relativePath)
    const fileName = segments.pop()!
    const dir = await this.navigateToParent(root, segments)
    await dir.removeEntry(fileName)
  }

  async listDirectory(projectPath: string, relativePath: string): Promise<FileEntry[]> {
    const root = await this.getRootHandle(projectPath)
    const segments = this.splitPath(relativePath)
    const dir = await this.navigateToParent(root, segments)

    const entries: FileEntry[] = []
    for await (const [name, handle] of (dir as any).entries()) {
      entries.push({
        name,
        isDirectory: handle.kind === 'directory',
        path: relativePath ? `${relativePath}/${name}` : name
      })
    }
    return entries
  }

  async exists(projectPath: string, relativePath: string): Promise<boolean> {
    try {
      const root = await this.getRootHandle(projectPath)
      const segments = this.splitPath(relativePath)
      const targetName = segments.pop()!
      const dir = await this.navigateToParent(root, segments)

      try {
        await dir.getFileHandle(targetName)
        return true
      } catch {
        try {
          await dir.getDirectoryHandle(targetName)
          return true
        } catch {
          return false
        }
      }
    } catch {
      return false
    }
  }
}
